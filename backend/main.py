"""
Resume AI Pipeline — FastAPI Backend
Uses Agent + Config + LLMClient exactly like the original Streamlit system.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

# Load .env before anything else reads env vars
load_dotenv()

from config.config import Config
from agent.agent import Agent
from core.parser import extract_bullets, extract_sections, extract_text_from_pdf
from core.matcher import extract_jd_keywords, match_bullets_to_keywords, compute_keyword_coverage, get_optimization_candidates
from core.optimizer import optimize_bullets_batch, apply_decisions
from core.formatter import compute_optimization_stats
from core.condenser import condense_sources_into_profile, trigger_condensation_and_save
from core.llm_client.llm_client import LLMClient
from core.bullet_improver import (
    ContextMessage,
    generate_questions,
    store_answers,
    generate_improvement,
    save_improvement_suggestion,
    compute_word_diff,
)
from core.entry_scorer import (
    improve_entry,
    save_entry_suggestion,
    background_score_and_save,
)
from core.models import engine as _db_engine
from sqlmodel import SQLModel

app = FastAPI(title="Resume AI Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global Config (reads API_KEY / BASE_URL from .env) ──
_config = Config()

# ── Startup: ensure context_messages table exists and bootstrap profile ──
@app.on_event("startup")
async def _on_startup():
    from core.models import MasterProfile, User
    from sqlmodel import Session, select
    SQLModel.metadata.create_all(_db_engine)
    
    # Bootstrap default user if empty
    with Session(_db_engine) as session:
        user = session.exec(select(User).where(User.id == "default-id")).first()
        if not user:
            user = User(id="default-id", name="Ashwini Singh", email="ashwini@example.com")
            session.add(user)
            session.commit()
            session.refresh(user)
        
        # Auto-bootstrapping of profile removed to allow for fresh user uploads.


# ── Request Models ────────────────────────────────────────

class ParseRequest(BaseModel):
    text: str

class JDAnalyzeRequest(BaseModel):
    job_description: str
    resume_bullets: List[str]

class SuggestionRequest(BaseModel):
    bullets: List[str]
    target_keywords: List[str]
    # Optional overrides — if empty, uses server-side Config
    api_key: str = ""
    base_url: str = ""
    model: str = ""

class ApplyRequest(BaseModel):
    suggestions: List[Dict[str, Any]]
    sections: Dict[str, List[str]]

class CondenseRequest(BaseModel):
    pdf_text: Optional[str] = None
    github_data: Optional[Dict] = None
    manual_data: Optional[Dict] = None
    current_profile: Optional[Dict] = None
    user_id: str = "default-id"
    context_id: int

class OnboardingRequest(BaseModel):
    user_id: str
    profile_name: str = "General"
    experience_level: str
    target_roles: List[str]
    primary_skills: Optional[List[str]] = None
    industries: List[str]
    target_companies: List[str]
    goals: str


# ── Endpoints ─────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "model": _config.model_name, "base_url": _config.base_url}


@app.post("/api/parse-resume")
async def parse_resume(file: Optional[UploadFile] = File(None), text: Optional[str] = Form(None)):
    """Parse resume from either PDF upload or raw text."""
    if file:
        content = await file.read()
        try:
            resume_text = extract_text_from_pdf(content)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"PDF parsing error: {str(e)}")
    elif text:
        resume_text = text
    else:
        raise HTTPException(status_code=400, detail="Must provide either file or text")

    bullets = extract_bullets(resume_text)
    sections = extract_sections(resume_text)
    return {
        "raw_text": resume_text,
        "bullets": bullets,
        "sections": sections
    }


@app.post("/api/analyze-jd")
def analyze_jd(req: JDAnalyzeRequest):
    """Extract keywords from JD and match them against parsed resume bullets."""
    jd_keywords = extract_jd_keywords(req.job_description)
    match_results = match_bullets_to_keywords(req.resume_bullets, jd_keywords)
    coverage = compute_keyword_coverage(req.resume_bullets, jd_keywords)
    candidates = get_optimization_candidates(match_results)

    return {
        "jd_keywords": jd_keywords,
        "coverage": coverage,
        "candidates": candidates
    }


@app.post("/api/generate-suggestions")
async def generate_suggestions(req: SuggestionRequest):
    """
    Generate optimization suggestions for specific bullets using LLM.
    
    If api_key/base_url are provided in the request, uses those.
    Otherwise falls back to the server-side Config (from .env).
    """
    try:
        if req.api_key:
            # Frontend-provided credentials
            client = LLMClient(
                api_key=req.api_key,
                base_url=req.base_url,
                model_name=req.model,
            )
        else:
            # Server-side Config (reads from .env)
            client = LLMClient(_config)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"LLM Client configuration error: {str(e)}")

    try:
        optimized = await optimize_bullets_batch(client, req.bullets, req.target_keywords)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

    return {"suggestions": optimized}


@app.post("/api/condense")
async def condense_profile(req: CondenseRequest, background_tasks: BackgroundTasks):
    """
    Run the full Agent condensation pipeline and SAVE to DB.
    Also triggers background impact scoring.
    """
    try:
        # Use the multi-profile persistence trigger
        result = await trigger_condensation_and_save(
            config=_config,
            user_id=req.user_id,
            context_id=req.context_id,
            pdf_text=req.pdf_text,
            github_data=req.github_data,
            manual_data=req.manual_data,
        )
        
        # Dispatch background scoring scoped to context
        background_tasks.add_task(background_score_and_save, req.user_id, req.context_id, _db_engine, _config)
        
        return {"profile": result, "context_id": req.context_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Condensation failed: {str(e)}")


@app.get("/api/profile/{user_id}/{context_id}")
def get_profile(user_id: str, context_id: int):
    """Fetch Master Profile for a specific user persona/context."""
    from sqlmodel import Session, select
    from core.models import MasterProfile
    with Session(_db_engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).first()
        if not profile:
            return {"profile": {}, "context_id": context_id}
        return {"profile": profile.data, "context_id": context_id}






@app.post("/api/profile")
async def save_profile(req: Dict[str, Any], background_tasks: BackgroundTasks):
    """
    Save a manually curated profile or state update.
    Triggers re-scoring in background.
    """
    from sqlmodel import Session, select
    from core.models import MasterProfile
    user_id = req.get("user_id", "default-id")
    context_id = req.get("context_id")
    data = req.get("profile", {})
    
    if not context_id:
         raise HTTPException(status_code=400, detail="context_id is required to save profile")

    with Session(_db_engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).first()
        if profile:
            profile.data = data
        else:
            profile = MasterProfile(user_id=user_id, context_id=context_id, data=data)
        
        session.add(profile)
        session.commit()
    
    # Launch background task for context-specific scores
    background_tasks.add_task(background_score_and_save, user_id, context_id, _db_engine, _config)
    
    return {"status": "saved", "context_id": context_id}


@app.post("/api/apply-changes")
def apply_changes(req: ApplyRequest):
    """Apply accepted suggestions to sections and compute stats."""
    final_resume = apply_decisions(req.suggestions, req.sections)
    stats = compute_optimization_stats(req.suggestions)

    return {"final_resume": final_resume, "stats": stats}


# ── Onboarding ───────────────────────────────────────────

@app.get("/api/user/{user_id}/onboarding-status")
def get_onboarding_status(user_id: str):
    """Check if a user has completed onboarding and return their context."""
    from sqlmodel import Session, select
    from core.models import User, UserContext

    with Session(_db_engine) as session:
        user = session.exec(select(User).where(User.id == user_id)).first()
        if not user:
            return {"is_onboarded": False, "profiles": []}

        profiles = session.exec(
            select(UserContext).where(UserContext.user_id == user_id)
        ).all()

        return {
            "is_onboarded": user.is_onboarded if user else False,
            "profiles": [p.dict() for p in profiles],
        }


@app.post("/api/user/onboarding")
async def submit_onboarding(req: OnboardingRequest):
    """Save user onboarding context and mark as onboarded. Always creates a new profile entry."""
    from sqlmodel import Session, select
    from core.models import User, UserContext

    with Session(_db_engine) as session:
        # 1. Update or Create User
        user = session.exec(select(User).where(User.id == req.user_id)).first()
        if not user:
            user = User(id=req.user_id, name="User", email="", is_onboarded=True)
            session.add(user)
        else:
            user.is_onboarded = True
            session.add(user)

        # 2. Add New Context (Multiple profiles allowed)
        new_context = UserContext(
            user_id=req.user_id,
            name=req.profile_name,
            experience_level=req.experience_level,
            target_roles=req.target_roles,
            primary_skills=req.primary_skills or [],
            industries=req.industries,
            target_companies=req.target_companies,
            goals=req.goals
        )
        session.add(new_context)
        session.commit()
        session.refresh(new_context)

        return {
            "status": "success",
            "user_id": req.user_id,
            "context_id": new_context.id,
            "profile_name": new_context.name
        }


@app.delete("/api/user/{user_id}")
async def delete_account(user_id: str):
    """Permanently delete user profile, context, and the user record."""
    from sqlmodel import Session, select
    from core.models import User, UserContext, MasterProfile

    with Session(_db_engine) as session:
        # 1. Delete all profiles for this user
        profiles = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).all()
        for p in profiles:
            session.delete(p)

        # 2. Delete all contexts for this user
        contexts = session.exec(select(UserContext).where(UserContext.user_id == user_id)).all()
        for c in contexts:
            session.delete(c)

        # 3. Delete the user record itself
        user = session.exec(select(User).where(User.id == user_id)).first()
        if user:
            session.delete(user)

        session.commit()

    return {"status": "success", "message": "Account deleted."}


@app.delete("/api/profile/{user_id}/{context_id}")
async def delete_profile(user_id: str, context_id: int):
    """Delete a specific persona (context) and its associated resume data."""
    from sqlmodel import Session, select
    from core.models import UserContext, MasterProfile, RawSource, JobDescription, OptimizationSuggestion

    with Session(_db_engine) as session:
        # 1. Verify existence and ownership
        context = session.exec(select(UserContext).where(UserContext.id == context_id, UserContext.user_id == user_id)).first()
        if not context:
            raise HTTPException(status_code=404, detail="Profile/Context not found or unauthorized.")

        # 2. Delete associated data
        # MasterProfile
        mp = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).all()
        for p in mp: session.delete(p)
        
        # RawSource
        rs = session.exec(select(RawSource).where(RawSource.context_id == context_id)).all()
        for r in rs: session.delete(r)
        
        # JobDescription
        jd = session.exec(select(JobDescription).where(JobDescription.context_id == context_id)).all()
        for j in jd: session.delete(j)
        
        # OptimizationSuggestion
        opt = session.exec(select(OptimizationSuggestion).where(OptimizationSuggestion.context_id == context_id)).all()
        for o in opt: session.delete(o)
        
        # 3. Delete the context itself
        session.delete(context)
        session.commit()

    return {"status": "success", "message": "Profile persona deleted."}



# ────────────────────────────────────────────────────────────
# ON-DEMAND BULLET IMPROVEMENT  (isolated feature)
# ────────────────────────────────────────────────────────────

class GenerateQuestionsRequest(BaseModel):
    run_id: str             # UUID generated by client for the session
    section: str            # e.g. "Work Experience"
    bullet_text: str

class SubmitAnswersRequest(BaseModel):
    run_id: str
    questions: List[str]    # The questions that were asked (echoed back for pairing)
    answers: List[str]
    original_bullet: str
    suggestion_id: Optional[str] = None

class GenerateImprovementRequest(BaseModel):
    original_bullet: str
    questions: List[str]
    answers: List[str]
    run_id: str
    section: str = ""


@app.post("/api/improve/generate-questions")
async def improve_generate_questions(req: GenerateQuestionsRequest):
    """
    Step 1 — Given a bullet, ask the LLM to generate 2-3 high-value context questions.
    Stores questions as 'assistant' messages in context_messages.
    """
    try:
        client = LLMClient(_config)
        questions = await generate_questions(
            llm_client=client,
            run_id=req.run_id,
            section=req.section,
            bullet_text=req.bullet_text,
            db_engine=_db_engine,
        )
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@app.post("/api/improve/submit-answers")
def improve_submit_answers(req: SubmitAnswersRequest):
    """
    Step 2 — Store user's answers in context_messages.
    """
    try:
        store_answers(
            run_id=req.run_id,
            answers=req.answers,
            questions=req.questions,
            db_engine=_db_engine,
            suggestion_id=req.suggestion_id,
        )
        return {"status": "stored", "count": len(req.answers)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Storing answers failed: {str(e)}")


@app.post("/api/improve/generate-improvement")
async def improve_generate_improvement(req: GenerateImprovementRequest):
    """
    Step 3 — Generate improved bullet using context answers + word diff.
    Saves to suggestions table and returns result.
    """
    try:
        client = LLMClient(_config)
        improved_bullet, diff_tokens = await generate_improvement(
            llm_client=client,
            original_bullet=req.original_bullet,
            questions=req.questions,
            answers=req.answers,
        )

        # Save to suggestions table
        suggestion_id = save_improvement_suggestion(
            run_id=req.run_id,
            original_text=req.original_bullet,
            improved_text=improved_bullet,
            diff_data=diff_tokens,
            db_engine=_db_engine,
            section=req.section,
        )

        return {
            "original_bullet": req.original_bullet,
            "improved_bullet": improved_bullet,
            "diff": diff_tokens,
            "suggestion_id": suggestion_id,
            "changed": improved_bullet != req.original_bullet,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Improvement generation failed: {str(e)}")


@app.post("/api/improve/accept")
def improve_accept(body: Dict[str, Any]):
    """
    Accept: update the suggestion status in the DB.
    Body: { suggestion_id, improved_bullet, original_bullet }
    """
    from sqlmodel import Session, select
    from core.models import OptimizationSuggestion
    suggestion_id = body.get("suggestion_id")
    if not suggestion_id:
        raise HTTPException(status_code=400, detail="suggestion_id required")
    with Session(_db_engine) as session:
        rec = session.exec(
            select(OptimizationSuggestion).where(OptimizationSuggestion.id == int(suggestion_id))
        ).first()
        if rec:
            rec.status = "accepted"
            session.add(rec)
            session.commit()
    return {"status": "accepted"}


@app.post("/api/improve/reject")
def improve_reject(body: Dict[str, Any]):
    """
    Reject: update the suggestion status in the DB.
    Body: { suggestion_id }
    """
    from sqlmodel import Session, select
    from core.models import OptimizationSuggestion
    suggestion_id = body.get("suggestion_id")
    if not suggestion_id:
        raise HTTPException(status_code=400, detail="suggestion_id required")
    with Session(_db_engine) as session:
        rec = session.exec(
            select(OptimizationSuggestion).where(OptimizationSuggestion.id == int(suggestion_id))
        ).first()
        if rec:
            rec.status = "rejected"
            session.add(rec)
            session.commit()
    return {"status": "rejected"}


# ────────────────────────────────────────────────────────────
# ENTRY-LEVEL IMPACT SCORING  (isolated feature)
# ────────────────────────────────────────────────────────────

class ScoreEntriesRequest(BaseModel):
    experience: List[Dict[str, Any]] = []
    projects: List[Dict[str, Any]] = []

class EntryQuestionsRequest(BaseModel):
    section: str                  # 'experience' | 'projects'
    entry: Dict[str, Any]         # The full entry object (company, title, bullets, ...)
    entry_id: str                 # e.g. 'exp_0' | 'proj_1'

class ImproveEntryRequest(BaseModel):
    section: str
    entry: Dict[str, Any]
    entry_id: str
    questions: List[str]
    answers: List[str]


@app.post("/api/score-entries")
async def api_score_entries(req: ScoreEntriesRequest):
    """
    Score each experience + project entry on a 0–10 impact scale.
    Scoring is entry-level — not per bullet, not per section.
    """
    try:
        client = LLMClient(_config)
        result = await score_entries(
            llm_client=client,
            experience=req.experience,
            projects=req.projects,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.post("/api/entry/generate-questions")
async def api_entry_generate_questions(req: EntryQuestionsRequest):
    """
    Generate 3–5 targeted questions specific to a single entry's gaps.
    """
    try:
        client = LLMClient(_config)
        questions = await generate_entry_questions(
            llm_client=client,
            section=req.section,
            entry=req.entry,
        )
        return {"entry_id": req.entry_id, "questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Question generation failed: {str(e)}")


@app.post("/api/entry/improve")
async def api_entry_improve(req: ImproveEntryRequest):
    """
    Rewrite all bullets in an entry using context answers.
    Returns: improved entry object + bullet-level diffs.
    """
    try:
        client = LLMClient(_config)
        improved_entry, bullet_diffs = await improve_entry(
            llm_client=client,
            entry=req.entry,
            questions=req.questions,
            answers=req.answers,
        )
        changed = any(d["changed"] for d in bullet_diffs)
        
        suggestion_id = None
        if changed:
            suggestion_id = save_entry_suggestion(
                entry_id=req.entry_id,
                section=req.section,
                original_entry=req.entry,
                improved_entry=improved_entry,
                db_engine=_db_engine
            )

        return {
            "entry_id": req.entry_id,
            "original_entry": req.entry,
            "improved_entry": improved_entry,
            "bullet_diffs": bullet_diffs,
            "changed": changed,
            "suggestion_id": suggestion_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Entry improvement failed: {str(e)}")
