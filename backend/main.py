"""
Resume AI Pipeline — FastAPI Backend
Uses Agent + Config + LLMClient exactly like the original Streamlit system.
"""

import os
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, BackgroundTasks, Request, Header
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any, Tuple
from dotenv import load_dotenv
from sqlalchemy import func

# Load .env before anything else reads env vars
load_dotenv(override=True)

from util.response import AppResponse, LLMError

from config.config import Config
from agent.agent import Agent
from core.diagnostic import run_global_diagnostic
from core.generator import generate_section_content
from core.parser import extract_bullets, extract_sections, extract_text_from_pdf
from core.matcher import extract_jd_keywords, match_bullets_to_keywords, compute_keyword_coverage, get_optimization_candidates
from core.optimizer import optimize_bullets_batch, apply_decisions
from core.formatter import compute_optimization_stats
from core.condenser import condense_sources_into_profile, trigger_condensation_and_save
from core.usage_service import get_run_usage
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
    evaluate_entry,
    score_entries,
    chat_interview_turn,
    save_entry_suggestion,
    background_score_and_save,
)
from core.jd_pipeline import (
    run_relevance_scoring,
    save_entry_scores,
    run_ats_optimization,
    save_optimization_suggestions,
    run_gap_analysis,
    save_gap_analysis,
    get_jd_results,
)
from core.models import (
    engine as _db_engine,
    JobDescription,
    MasterProfile,
    OptimizationSuggestion,
    UserContext,
    User,
    LLMUsage
)
from sqlmodel import SQLModel, Session, select
from core.payment_service import PaymentService
from core.github import (
    summarise_repo_for_resume,
    _extract_username,
    fetch_github_repos_list,
    fetch_github_profile,
    fetch_single_repo_details
)
from core.interview_agent import run_interview_turn


app = FastAPI(title="Resume AI Pipeline API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "https://resume-dad.vercel.app",
        os.getenv("FRONTEND_URL", "https://resumesailor.com"),
    ] + [o for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(LLMError)
async def llm_error_handler(request, exc: LLMError):
    resp = AppResponse.fail(message=exc.message, code=exc.code, metadata=exc.details)
    return JSONResponse(status_code=exc.code, content=resp.dict())

@app.exception_handler(Exception)
async def general_error_handler(request, exc: Exception):
    import logging
    logging.getLogger("uvicorn").error(f"Unhandled Exception: {str(exc)}", exc_info=True)
    resp = AppResponse.fail(message="An unexpected server error occurred", code=500)
    return JSONResponse(status_code=500, content=resp.dict())

# ── Global Config (reads API_KEY / BASE_URL from .env) ──
_config = Config()

# ── Global LLM Clients ──
_primary_llm = LLMClient(
    api_key=_config.api_key, 
    base_url=_config.base_url, 
    model_name=_config.model_name
)
_cheap_llm = LLMClient(
    api_key=_config.api_key, 
    base_url=_config.base_url, 
    model_name=_config.cheap_model_name
)

# ── Startup: ensure context_messages table exists and bootstrap profile ──
@app.on_event("startup")
async def _on_startup():
    import logging
    logger = logging.getLogger("uvicorn")
    
    # Validate Critical Environment Variables
    critical_vars = ["API_KEY", "DATABASE_URL", "STRIPE_SECRET_KEY"]
    missing = [v for v in critical_vars if not os.getenv(v)]
    if missing:
        logger.warning(f"⚠️ MISSING CRITICAL ENV VARS: {', '.join(missing)}. Some features may not work in production.")

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
    run_id: Optional[str] = None

class OnboardingRequest(BaseModel):
    user_id: str
    profile_name: str = "General"
    experience_level: str
    target_roles: List[str]
    primary_skills: Optional[List[str]] = None
    industries: List[str]
    target_companies: List[str]
    goals: str

class CheckoutSessionRequest(BaseModel):
    user_id: str
    amount: int  # Example: 200

class GithubMergeRequest(BaseModel):
    user_id: str
    context_id: int
    github_url: str
    selected_repo_names: List[str]
    token: Optional[str] = None

class CloneProfileRequest(BaseModel):
    user_id: str
    profile_name: str
    profile_data: Dict[str, Any]

class InterviewTurnRequest(BaseModel):
    user_id: str
    context_id: int
    section_type: str
    chat_history: List[Dict[str, str]]
    run_id: Optional[str] = None

class FeedbackRequest(BaseModel):
    user_id: str
    type: str
    message: str
    rating: Optional[int] = None
    context: Optional[Dict[str, Any]] = {}
    page: Optional[str] = None
    feature: Optional[str] = None


# ── Usage Helper ──────────────────────────────────────────

async def check_usage_limit(user_id: str):
    with Session(_db_engine) as session:
        user = session.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(status_code=403, detail="User not found")
            
        # 1. Check Budget Limits (Hard Stop)
        if user.current_spend >= user.max_spend:
            raise HTTPException(
                status_code=402, 
                detail=f"Budget exceeded ({user.current_spend:.2f}/{user.max_spend:.2f}). Please upgrade or contact admin."
            )

        # 2. Check Trial Limitations
        if user.subscription_status == "active":
            return True
            
        if user.free_runs_remaining > 0:
            user.free_runs_remaining -= 1
            session.add(user)
            session.commit()
            return True
            
        raise HTTPException(status_code=402, detail="No more free optimization runs remaining. Please upgrade.")


# ── Endpoints ─────────────────────────────────────────────


@app.get("/")
def health_check():
    return AppResponse.ok(data={"status": "ok", "model": _config.model_name, "base_url": _config.base_url})


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

    # 1. Triage: Identify sections (Cheap)
    sections = extract_sections(resume_text)
    
    # 2. Detailed extraction: get bullets for each section (Primary/Heavy)
    # Note: These are regex based but we might want to wrap them in LLM calls if needed.
    # For now, let's just use the regex outputs and provide the raw_text.
    bullets = extract_bullets(resume_text)
    
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
            client = _primary_llm
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
    await check_usage_limit(req.user_id)
    try:
        # Trigger LLM Condensation (Primary/Heavy)
        result = await trigger_condensation_and_save(
            config=_config,
            user_id=req.user_id,
            context_id=req.context_id,
            pdf_text=req.pdf_text,
            github_data=req.github_data,
            manual_data=req.manual_data,
            llm_client=_primary_llm,
            run_id=req.run_id
        )
        
        # Dispatch background scoring scoped to context
        background_tasks.add_task(background_score_and_save, req.user_id, req.context_id, _db_engine, _config)
        
        usage_stats = get_run_usage(req.run_id) if req.run_id else {}
        
        return AppResponse.ok(data={
            **result,
            "usage": usage_stats
        })
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

        is_actually_onboarded = user.is_onboarded if user else False
        if len(profiles) == 0:
            is_actually_onboarded = False

        return AppResponse.ok(data={
            "is_onboarded": is_actually_onboarded,
            "profiles": [p.dict() for p in profiles],
        })


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
            onboarding_context={
                "experience_level": req.experience_level,
                "target_roles": req.target_roles,
                "primary_skills": req.primary_skills or [],
                "industries": req.industries,
                "target_companies": req.target_companies,
                "goals": req.goals
            },
            chat_context={}
        )
        session.add(new_context)
        session.commit()
        session.refresh(new_context)

        return AppResponse.ok(data={
            "status": "success",
            "user_id": req.user_id,
            "context_id": new_context.id,
            "profile_name": new_context.name
        })


@app.post("/api/profiles/clone")
async def clone_profile(req: CloneProfileRequest, background_tasks: BackgroundTasks):
    """
    Create a new profile/persona snapshot based on provided data.
    Used for saving JD-optimized versions.
    """
    from sqlmodel import Session
    from core.models import UserContext, MasterProfile
    
    with Session(_db_engine) as session:
        # 1. Create the new context
        new_context = UserContext(
            user_id=req.user_id,
            name=req.profile_name,
            onboarding_context={}, # Optional: could fill with defaults
            chat_context={}
        )
        session.add(new_context)
        session.commit()
        session.refresh(new_context)
        
        # 2. Save the master profile data to this new context
        new_profile = MasterProfile(
            user_id=req.user_id,
            context_id=new_context.id,
            data=req.profile_data
        )
        session.add(new_profile)
        session.commit()
        
        # 3. Trigger a background re-score for the new context
        background_tasks.add_task(background_score_and_save, req.user_id, new_context.id, _db_engine, _config)
        
        return {
            "status": "success",
            "context_id": new_context.id,
            "profile_name": new_context.name
        }


@app.delete("/api/user/{user_id}")
async def delete_account(user_id: str):
    """Permanently delete user profile, context, and all associated data records."""
    from sqlmodel import Session, select, delete
    from core.models import (
        User, UserContext, MasterProfile, RawSource, 
        JobDescription, OptimizationSuggestion, EntryScore, GapAnalysis
    )

    with Session(_db_engine) as session:
        # 1. Delete low-level dependencies first (reference JDs or Contexts)
        session.exec(delete(OptimizationSuggestion).where(OptimizationSuggestion.user_id == user_id))
        session.exec(delete(EntryScore).where(EntryScore.user_id == user_id))
        session.exec(delete(GapAnalysis).where(GapAnalysis.user_id == user_id))
        
        # 2. Delete Job Descriptions (reference Contexts)
        session.exec(delete(JobDescription).where(JobDescription.user_id == user_id))
        
        # 3. Delete Profiles and Sources (reference Contexts)
        session.exec(delete(RawSource).where(RawSource.user_id == user_id))
        session.exec(delete(MasterProfile).where(MasterProfile.user_id == user_id))
        
        # 4. Delete Contexts (reference User)
        session.exec(delete(UserContext).where(UserContext.user_id == user_id))
        
        # 5. Delete the User record itself
        user = session.exec(select(User).where(User.id == user_id)).first()
        if user:
            session.delete(user)

        session.commit()

    return {"status": "success", "message": "Account and all associated records deleted."}




@app.delete("/api/profile/{user_id}/{context_id}")
async def delete_profile(user_id: str, context_id: int):
    """Delete a specific persona (context) and all its associated data."""
    from sqlmodel import Session, select, delete
    from core.models import (
        UserContext, MasterProfile, RawSource, JobDescription, 
        OptimizationSuggestion, EntryScore, GapAnalysis
    )

    with Session(_db_engine) as session:
        # 1. Verify existence and ownership
        context = session.exec(select(UserContext).where(UserContext.id == context_id, UserContext.user_id == user_id)).first()
        if not context:
            raise HTTPException(status_code=404, detail="Profile/Context not found or unauthorized.")

        # 2. Delete associated data in correct cascading order
        session.exec(delete(OptimizationSuggestion).where(OptimizationSuggestion.context_id == context_id))
        session.exec(delete(EntryScore).where(EntryScore.context_id == context_id))
        session.exec(delete(GapAnalysis).where(GapAnalysis.context_id == context_id))
        
        session.exec(delete(JobDescription).where(JobDescription.context_id == context_id))
        
        session.exec(delete(RawSource).where(RawSource.context_id == context_id))
        session.exec(delete(MasterProfile).where(MasterProfile.context_id == context_id))
        
        # 3. Delete the context itself
        session.delete(context)
        session.commit()

    return {"status": "success", "message": "Profile persona and all its data deleted."}



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
        questions = await generate_questions(
            llm_client=_primary_llm,
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
        improved_bullet, diff_tokens = await generate_improvement(
            llm_client=_primary_llm,
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

class EntryInterviewTurnRequest(BaseModel):
    section: str
    entry: Dict[str, Any]
    entry_id: str
    chat_history: List[Dict[str, str]] = []
    user_context: Dict[str, Any] = {}
    pre_identified_questions: List[str] = []  # From evaluation step

class EvaluateEntryRequest(BaseModel):
    user_id: str
    context_id: Optional[int] = None
    entry_id: str
    section: str  # "experience" | "project"

class ImproveEntryRequest(BaseModel):
    section: str
    entry: Dict[str, Any]
    entry_id: str
    chat_history: List[Dict[str, str]]
    user_context: Dict[str, Any] = {}

class RunDiagnosticRequest(BaseModel):
    user_id: str
    context_id: Optional[int] = None

class GenerateSectionRequest(BaseModel):
    user_id: str
    context_id: Optional[int] = None
    section: str  # "summary" or "skills"


@app.post("/api/score-entries")
async def api_score_entries(req: ScoreEntriesRequest):
    """
    Score each experience + project entry on a 0–10 impact scale.
    Scoring is entry-level — not per bullet, not per section.
    """
    try:
        result = await score_entries(
            llm_client=_primary_llm,
            experience=req.experience,
            projects=req.projects,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scoring failed: {str(e)}")


@app.post("/api/profile/diagnostic")
async def api_global_diagnostic(req: RunDiagnosticRequest):
    """
    Evaluates the entire profile against UserContext to provide global feedback, 
    competitiveness score, and identify missing skills.
    Saves the result to MasterProfile.data for persistence.
    """
    from sqlmodel import Session, select
    from core.models import MasterProfile
    from sqlalchemy.orm.attributes import flag_modified

    try:
        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        if not profile_data:
            raise HTTPException(status_code=400, detail="Profile data is missing.")

        # Global competitive feedback (Cheap with Primary fallback)
        result = await run_global_diagnostic(
            llm_client=_cheap_llm,
            profile_data=profile_data,
            user_context=user_context,
            user_id=req.user_id,
            feature="global_diagnostic",
            fallback_client=_primary_llm
        )

        # Persist the diagnostic result
        with Session(_db_engine) as session:
            profile = session.exec(
                select(MasterProfile).where(MasterProfile.context_id == req.context_id)
            ).first()
            if profile:
                profile.data["global_diagnostic"] = result
                flag_modified(profile, "data")
                session.add(profile)
                session.commit()

        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Diagnostic failed: {str(e)}")


@app.post("/api/profile/generate-section")
async def api_generate_section(req: GenerateSectionRequest):
    """
    Generates missing resume sections (e.g. Professional Summary, Skills) 
    by inferring from the user's existing work experience and target role.
    """
    try:
        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        if not profile_data:
            raise HTTPException(status_code=400, detail="Profile data is missing.")

        content = await generate_section_content(
            llm_client=_primary_llm,
            section=req.section,
            profile_data=profile_data,
            user_context=user_context
        )
        return {"content": content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/entry/evaluate")
async def api_entry_evaluate(req: EvaluateEntryRequest):
    """
    Phase 1 — 4-Step recruiter evaluation on a single resume entry.
    READ-ONLY: does not modify bullets.
    Returns: score, strength_level, issues, context_gaps, reasoning, follow_up_questions
    """
    try:
        # Fetch profile data and resolve the entry
        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        entries = _build_entries_list(profile_data)
        entry_map = {e["entry_id"]: e for e in entries}
        
        entry = entry_map.get(req.entry_id)
        if not entry:
            raise HTTPException(status_code=404, detail=f"Entry '{req.entry_id}' not found in profile.")
        
        result = await evaluate_entry(
            llm_client=_primary_llm,
            entry=entry,
            entry_id=req.entry_id,
            user_context=user_context,
        )
        return result
    except (HTTPException, LLMError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@app.post("/api/entry/interview-turn")
async def api_entry_interview_turn(req: EntryInterviewTurnRequest):
    """
    Handle a single turn of the targeted context-extraction interview.
    Accepts pre_identified_questions from the evaluation step.
    """
    try:
        turn_response = await chat_interview_turn(
            llm_client=_primary_llm,
            section=req.section,
            entry=req.entry,
            chat_history=req.chat_history,
            user_context=req.user_context,
            pre_identified_questions=req.pre_identified_questions,
        )
        return {
            "entry_id": req.entry_id,
            "reply_text": turn_response.get("reply_text"),
            "confidence_score": turn_response.get("confidence_score"),
            "ready_to_propose": turn_response.get("ready_to_propose"),
        }
    except (HTTPException, LLMError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Interview turn failed: {str(e)}")


@app.post("/api/entry/improve")
async def api_entry_improve(req: ImproveEntryRequest):
    """
    Rewrite all bullets in an entry using context answers.
    Returns: improved entry object + bullet-level diffs.
    """
    await check_usage_limit(req.user_id)
    try:
        improved_entry, bullet_diffs = await improve_entry(
            llm_client=_primary_llm,
            entry=req.entry,
            chat_history=req.chat_history,
            user_context=req.user_context,
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


# ════════════════════════════════════════════════════════════════════════════════
# JD MATCHING PIPELINE — 3-Stage Intelligence Layer
# ════════════════════════════════════════════════════════════════════════════════

class JDAnalyzeRequest(BaseModel):
    """Stage 1 — Score all resume entries against a JD."""
    jd_text: str
    jd_title: str = "Untitled Role"
    jd_company: str = "Unknown Company"
    user_id: str
    context_id: Optional[int] = None

class JDOptimizeRequest(BaseModel):
    """Stage 2 — ATS-optimize the selected entries."""
    jd_id: int
    selected_entry_ids: List[str]   # e.g. ["exp_0", "proj_1"]
    user_id: str
    context_id: Optional[int] = None

class JDGapsRequest(BaseModel):
    """Stage 3 — Gap analysis."""
    jd_id: int
    user_id: str
    context_id: Optional[int] = None

class JDSuggestionActionRequest(BaseModel):
    suggestion_id: int
    user_id: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_profile_and_context(user_id: str, context_id: Optional[int]) -> Tuple[Dict, Dict]:
    """Fetch profile data (experience+projects+skills) and user context from DB."""
    with Session(_db_engine) as session:
        profile_rec = session.exec(
            select(MasterProfile).where(
                MasterProfile.user_id == user_id,
                MasterProfile.context_id == context_id,
            )
        ).first()
        profile_data = profile_rec.data if profile_rec else {}

        ctx_rec = session.exec(
            select(UserContext).where(
                UserContext.user_id == user_id,
                UserContext.id == context_id,
            )
        ).first() if context_id else None
        user_context = {}
        if ctx_rec:
            user_context = {**(ctx_rec.onboarding_context or {}), **(ctx_rec.chat_context or {})}

    return profile_data, user_context


def _build_entries_list(profile_data: Dict) -> List[Dict]:
    """Flatten all resume sections into a unified entries list for evaluation/improvement."""
    entries = []
    
    # 1. Summary
    if profile_data.get("summary"):
        entries.append({
            "entry_id": "summary",
            "type": "summary",
            "content": profile_data.get("summary")
        })

    # 2. Experience & Experience-Projects
    for i, exp in enumerate(profile_data.get("experience", [])):
        entries.append({"entry_id": f"exp_{i}", **exp})
        for j, proj in enumerate(exp.get("projects", [])):
            entries.append({"entry_id": f"exp_{i}_proj_{j}", **proj})
            
    # 3. Independent Projects
    for i, proj in enumerate(profile_data.get("projects", [])):
        entries.append({"entry_id": f"proj_{i}", **proj})
        
    # 4. Achievements
    if profile_data.get("achievements"):
        entries.append({
            "entry_id": "achievements",
            "type": "achievements",
            "bullets": profile_data.get("achievements")
        })

    return entries


# ── Stage 1: Relevance Scoring ─────────────────────────────────────────────────

@app.post("/api/jd/analyze")
async def api_jd_analyze(req: JDAnalyzeRequest):
    """
    Stage 1 — Score all resume entries against the job description.
    Creates a JobDescription record and returns scored entries with decisions.
    """
    await check_usage_limit(req.user_id)
    try:
        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        entries = _build_entries_list(profile_data)

        if not entries:
            raise HTTPException(status_code=400, detail="No resume entries found for this profile.")

        # Create / persist the JD record
        with Session(_db_engine) as session:
            jd_record = JobDescription(
                user_id=req.user_id,
                context_id=req.context_id,
                title=req.jd_title,
                company=req.jd_company,
                original_text=req.jd_text,
                keywords=[],
            )
            session.add(jd_record)
            session.commit()
            session.refresh(jd_record)
            jd_id = jd_record.id

        scored = await run_relevance_scoring(_cheap_llm, req.jd_text, entries, user_context)
        save_entry_scores(scored, jd_id, req.user_id, req.context_id, _db_engine)

        return {
            "jd_id": jd_id,
            "total_entries": len(scored),
            "entries": scored,
            "summary": {
                "keep": sum(1 for e in scored if e["decision"] == "KEEP"),
                "optional": sum(1 for e in scored if e["decision"] == "OPTIONAL"),
                "remove": sum(1 for e in scored if e["decision"] == "REMOVE"),
            }
        }
    except (HTTPException, LLMError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"JD analysis failed: {str(e)}")


# ── Stage 2: ATS Optimization ──────────────────────────────────────────────────

@app.post("/api/jd/optimize")
async def api_jd_optimize(req: JDOptimizeRequest):
    """
    Stage 2 — ATS-optimize selected resume entries against the JD.
    Only processes KEEP + OPTIONAL entries selected by the user.
    """
    try:
        with Session(_db_engine) as session:
            jd_record = session.get(JobDescription, req.jd_id)
            if not jd_record:
                raise HTTPException(status_code=404, detail="JD not found.")
            jd_text = jd_record.original_text

            # Load previously scored entries from DB
            from core.models import EntryScore
            all_scores = session.exec(
                select(EntryScore).where(
                    EntryScore.jd_id == req.jd_id,
                    EntryScore.user_id == req.user_id,
                )
            ).all()

        score_map = {s.entry_id: s for s in all_scores}

        profile_data, _ = _get_profile_and_context(req.user_id, req.context_id)
        entries = _build_entries_list(profile_data)
        entry_map = {e["entry_id"]: e for e in entries}

        # Build payload for optimization: only selected entries
        selected = []
        for eid in req.selected_entry_ids:
            if eid in entry_map:
                score_rec = score_map.get(eid)
                selected.append({
                    "entry_id": eid,
                    "entry": entry_map[eid],
                    "matched_keywords": score_rec.matched_keywords if score_rec else [],
                    "missing_keywords": score_rec.missing_keywords if score_rec else [],
                })

        if not selected:
            raise HTTPException(status_code=400, detail="No valid entries found for the given IDs.")

        optimized = await run_ats_optimization(_primary_llm, jd_text, selected)
        result_with_ids = save_optimization_suggestions(
            optimized, req.jd_id, req.user_id, req.context_id, _db_engine
        )

        return {
            "jd_id": req.jd_id,
            "optimized_count": len(result_with_ids),
            "suggestions": result_with_ids,
        }
    except (HTTPException, LLMError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ATS optimization failed: {str(e)}")


# ── Stage 3: Gap Analysis ──────────────────────────────────────────────────────

@app.post("/api/jd/gaps")
async def api_jd_gaps(req: JDGapsRequest):
    """
    Stage 3 — Identify skill gaps between the JD and the candidate's resume.
    """
    try:
        with Session(_db_engine) as session:
            jd_record = session.get(JobDescription, req.jd_id)
            if not jd_record:
                raise HTTPException(status_code=404, detail="JD not found.")
            jd_text = jd_record.original_text

            from core.models import EntryScore
            scored_recs = session.exec(
                select(EntryScore).where(
                    EntryScore.jd_id == req.jd_id,
                    EntryScore.user_id == req.user_id,
                )
            ).all()

        scored_list = [{
            "entry_id": s.entry_id,
            "score": s.score,
            "decision": s.decision,
            "reasoning": s.reasoning,
        } for s in scored_recs]

        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        entries = _build_entries_list(profile_data)
        skills = profile_data.get("skills", {})

        # Gap analysis (Cheap)
        gap = await run_gap_analysis(_cheap_llm, jd_text, entries, skills, user_context, scored_list)
        save_gap_analysis(gap, req.jd_id, req.user_id, req.context_id, _db_engine)

        return {
            "jd_id": req.jd_id,
            **gap,
        }
    except (HTTPException, LLMError):
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gap analysis failed: {str(e)}")


# ── Interview Agent Flow ──────────────────────────────────────────────────────

@app.post("/api/interview/turn")
async def api_interview_turn(req: InterviewTurnRequest):
    """Adaptive interview turn for extracting resume context."""
    try:
        profile_data, user_context = _get_profile_and_context(req.user_id, req.context_id)
        
        # Pass BOTH clients for adaptive escalation
        result = await run_interview_turn(
            primary_client=_primary_llm,
            cheap_client=_cheap_llm,
            user_context=user_context,
            profile_json=profile_data,
            section_type=req.section_type,
            chat_history=req.chat_history,
            user_id=req.user_id,
            run_id=req.run_id
        )
        
        usage_stats = get_run_usage(req.run_id) if req.run_id else {}
        
        return AppResponse.ok(data={
            **result,
            "usage": usage_stats
        })
    except Exception as e:
        logger.error(f"Interview turn API failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Interview failed: {str(e)}")

# ── GitHub Integration Flow ──────────────────────────────────────────────────

@app.get("/api/github/repos")
async def api_github_fetch_repos(url: str, token: Optional[str] = None):
    """Stage 1: Fetch list of repositories for selection."""
    try:
        repos = fetch_github_repos_list(url, token=token)
        return AppResponse.ok(data={"repos": repos})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch repos: {str(e)}")


@app.post("/api/github/merge")
async def api_github_merge(req: GithubMergeRequest, background_tasks: BackgroundTasks):
    """Stage 2: Summarize selected repos and merge into Master Profile."""
    await check_usage_limit(req.user_id)
    
    username = _extract_username(req.github_url)
    if not username:
        raise HTTPException(status_code=400, detail="Invalid GitHub URL")

    client = LLMClient(_config)
    summarized_projects = []

    try:
        for repo_name in req.selected_repo_names:
            # 1. Fetch full details (README, etc)
            details = fetch_single_repo_details(username, repo_name, token=req.token)
            if not details: continue

            # 2. Summarize via LLM
            summary = await summarise_repo_for_resume(details, client)
            summarized_projects.append(summary)

        if not summarized_projects:
            return {"status": "no_changes", "message": "No repositories were successfully summarized."}

        # 3. Merge into Master Profile
        with Session(_db_engine) as session:
            profile_rec = session.exec(
                select(MasterProfile).where(MasterProfile.context_id == req.context_id)
            ).first()
            
            if not profile_rec:
                raise HTTPException(status_code=404, detail="Master Profile not found for this context.")

            data = profile_rec.data
            existing_projects = data.get("projects", [])
            existing_names = {p.get("name") for p in existing_projects}

            new_additions = []
            for sp in summarized_projects:
                if sp["name"] not in existing_names:
                    new_additions.append(sp)
            
            if new_additions:
                data["projects"] = existing_projects + new_additions
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(profile_rec, "data")
                session.add(profile_rec)
                session.commit()
                
                # Rescore in background since we added new content
                background_tasks.add_task(background_score_and_save, req.user_id, req.context_id, _db_engine, _config)

            return {
                "status": "merged",
                "added_count": len(new_additions),
                "profile": data
            }

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"GitHub merge failed: {str(e)}")



# ── Suggestion Actions ─────────────────────────────────────────────────────────

@app.post("/api/jd/accept-suggestion")
def api_jd_accept(req: JDSuggestionActionRequest):
    """Accept a Stage 2 optimization suggestion."""
    with Session(_db_engine) as session:
        rec = session.get(OptimizationSuggestion, req.suggestion_id)
        if not rec or rec.user_id != req.user_id:
            raise HTTPException(status_code=404, detail="Suggestion not found.")
        rec.status = "accepted"
        session.add(rec)
        session.commit()
    return {"suggestion_id": req.suggestion_id, "status": "accepted"}


@app.post("/api/jd/reject-suggestion")
def api_jd_reject(req: JDSuggestionActionRequest):
    """Reject a Stage 2 optimization suggestion."""
    with Session(_db_engine) as session:
        rec = session.get(OptimizationSuggestion, req.suggestion_id)
        if not rec or rec.user_id != req.user_id:
            raise HTTPException(status_code=404, detail="Suggestion not found.")
        rec.status = "rejected"
        session.add(rec)
        session.commit()
    return {"suggestion_id": req.suggestion_id, "status": "rejected"}


# ── Cache Reader ───────────────────────────────────────────────────────────────

@app.get("/api/jd/results/{jd_id}")
def api_jd_results(jd_id: int, user_id: str):
    """
    Read all 3 stage results from DB for a given jd_id.
    Returns None for stages that haven't been run yet.
    Used to hydrate the UI without re-triggering LLM calls.
    """
    result = get_jd_results(jd_id, user_id, _db_engine)
    if result is None:
        raise HTTPException(status_code=404, detail="No results found for this JD. Run Stage 1 first.")
    return {"jd_id": jd_id, **result}


# ── Payment & Subscription ──────────────────────────────────────────────────

@app.post("/api/payment/create-checkout-session")
async def api_create_checkout_session(req: CheckoutSessionRequest):
    svc = PaymentService()
    try:
        # Success and Cancel URLs - In production these should be absolute URLs
        success_url = "http://localhost:3000/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}"
        cancel_url = "http://localhost:3000/dashboard?canceled=true"
        
        session = svc.create_checkout_session(
            user_id=req.user_id,
            amount=req.amount,
            success_url=success_url,
            cancel_url=cancel_url
        )
        return session
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/payment/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Handle Stripe webhooks to upgrade user status on successful payment.
    Requires STRIPE_WEBHOOK_SECRET to be configured.
    """
    if not stripe_signature:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")
        
    payload = await request.body()
    svc = PaymentService()
    
    try:
        event = svc.construct_webhook_event(payload.decode('utf-8'), stripe_signature)
    except Exception as e:
        # Signature verification failed or other construct_event errors
        raise HTTPException(status_code=400, detail=f"Webhook error: {str(e)}")
        
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('metadata', {}).get('user_id')
        
        if user_id:
            with Session(_db_engine) as db_session:
                user = db_session.exec(select(User).where(User.id == user_id)).first()
                if user:
                    user.subscription_status = "active"
                    user.free_runs_remaining = 999  # Provide unlimited runs
                    db_session.add(user)
                    db_session.commit()
                    print(f"SUCCESS: User {user_id} upgraded to 'active' status via Stripe Webhook.")
                    
    return {"status": "success"}


@app.get("/api/user/status/{user_id}")
def get_user_status(user_id: str):
    with Session(_db_engine) as session:
        user = session.exec(select(User).where(User.id == user_id)).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return {
            "subscription_status": user.subscription_status,
            "free_runs_remaining": user.free_runs_remaining
        }

# ── Admin & Usage Analytics ──────────────────────────────────────────────────

@app.get("/api/admin/usage/summary")
async def get_usage_summary():
    """Overall spend and token totals."""
    with Session(_db_engine) as session:
        # Sums
        total_cost = session.exec(select(func.sum(LLMUsage.cost))).one() or 0.0
        total_tokens = session.exec(select(func.sum(LLMUsage.total_tokens))).one() or 0
        total_requests = session.exec(select(func.count(LLMUsage.id))).one() or 0
        
        return {
            "total_cost": float(total_cost),
            "total_tokens": int(total_tokens),
            "total_requests": int(total_requests)
        }

@app.get("/api/admin/usage/by-feature")
async def get_usage_by_feature():
    """Cost breakdown by product feature."""
    with Session(_db_engine) as session:
        results = session.query(
            LLMUsage.feature,
            func.sum(LLMUsage.cost).label("total_cost"),
            func.count(LLMUsage.id).label("request_count")
        ).group_by(LLMUsage.feature).all()
        
        return [
            {"feature": r[0], "total_cost": float(r[1] or 0.0), "request_count": int(r[2] or 0)} 
            for r in results
        ]

@app.get("/api/admin/usage/by-user")
async def get_usage_by_user():
    """Identify top spending users."""
    with Session(_db_engine) as session:
        results = session.query(
            LLMUsage.user_id,
            func.sum(LLMUsage.cost).label("total_cost"),
            func.count(LLMUsage.id).label("total_requests")
        ).group_by(LLMUsage.user_id).order_by(func.sum(LLMUsage.cost).desc()).limit(10).all()
        
        return [
            {"user_id": r[0], "total_cost": float(r[1] or 0.0), "total_requests": int(r[2] or 0)}
            for r in results
        ]

@app.get("/api/admin/usage/timeline")
async def get_usage_timeline():
    """Daily cost and token trends."""
    with Session(_db_engine) as session:
        # Note: SQLite specific date formatting
        date_func = func.date(LLMUsage.created_at)
        results = session.query(
            date_func,
            func.sum(LLMUsage.cost).label("daily_cost"),
            func.sum(LLMUsage.total_tokens).label("daily_tokens")
        ).group_by(date_func).order_by(date_func.desc()).all()
        
        return [
            {"date": str(r[0]), "cost": float(r[1] or 0.0), "tokens": int(r[2] or 0)}
            for r in results
        ]

# ── Feedback System ───────────────────────────────────────

@app.post("/api/feedback")
async def submit_feedback(req: FeedbackRequest):
    """Capture structured user feedback."""
    from core.models import Feedback
    with Session(_db_engine) as session:
        feedback = Feedback(
            user_id=req.user_id,
            type=req.type,
            message=req.message,
            rating=req.rating,
            context=req.context,
            page=req.page,
            feature=req.feature
        )
        session.add(feedback)
        session.commit()
        return AppResponse.ok(message="Feedback submitted successfully")

@app.get("/api/feedback")
async def get_feedback(type: Optional[str] = None, feature: Optional[str] = None, rating: Optional[int] = None):
    """Admin endpoint to retrieve feedback with filtering."""
    from core.models import Feedback
    with Session(_db_engine) as session:
        statement = select(Feedback)
        if type:
            statement = statement.where(Feedback.type == type)
        if feature:
            statement = statement.where(Feedback.feature == feature)
        if rating:
            statement = statement.where(Feedback.rating == rating)
        
        statement = statement.order_by(Feedback.created_at.desc())
        results = session.exec(statement).all()
        return AppResponse.ok(data=[r.dict() for r in results])
