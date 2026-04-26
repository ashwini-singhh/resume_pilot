"""
Entry Impact Scorer — 4-Step Recruiter Evaluation + Industry-Grade Improvement

Phase 1: Evaluate entries AS-IS (no modification, no rewriting, pure analysis)
Phase 2: Extract missing context via targeted Q&A chat
Phase 3: Generate ATS-optimized, STAR-structured, industry-grade bullets

APIs:
  POST /api/entry/evaluate         → 4-step analysis on single entry
  POST /api/entry/interview-turn   → Q&A interview turn
  POST /api/entry/improve          → Final elite-tier rewrite
  POST /api/score-entries          → Background bulk scoring
"""

import json
import logging
from typing import List, Dict, Optional, Tuple, Any
from sqlmodel import Session, select
from core.models import MasterProfile
from core.llm_client.llm_client import LLMClient
from prompts.alignment import EVALUATE_ENTRY_PROMPT, BULK_SCORE_PROMPT
from prompts.improvement import ENTRY_INTERVIEW_PROMPT, ELITE_IMPROVE_PROMPT

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — RECRUITER EVALUATION PROMPT (READ-ONLY, NO MODIFICATION)
# ══════════════════════════════════════════════════════════════════════════════



# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1B — BULK SCORING (background, lightweight, for ImpactScoreBadge)
# ══════════════════════════════════════════════════════════════════════════════



# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — INTERVIEW PROMPT (Context Extraction, ONE Q at a time)
# ══════════════════════════════════════════════════════════════════════════════



# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — ELITE IMPROVEMENT PROMPT (Industry-Grade, ATS-Optimized, STAR)
# ══════════════════════════════════════════════════════════════════════════════



# ══════════════════════════════════════════════════════════════════════════════
# HELPER FUNCTIONS
# ══════════════════════════════════════════════════════════════════════════════

def _entries_to_score_payload(
    experience: List[Dict], 
    projects: List[Dict], 
    summary: Optional[str] = None, 
    achievements: Optional[List[str]] = None
) -> List[Dict]:
    """Flatten all resume sections into a single list for the LLM, with stable IDs."""
    payload = []
    
    if summary:
        payload.append({
            "entry_id": "summary",
            "type": "summary",
            "content": summary
        })

    if achievements and len(achievements) > 0:
        payload.append({
            "entry_id": "achievements",
            "type": "achievements",
            "bullets": achievements
        })

    for i, exp in enumerate(experience):
        payload.append({
            "entry_id": f"exp_{i}",
            "type": "experience",
            "company": exp.get("company", ""),
            "title": exp.get("title", ""),
            "period": exp.get("period", ""),
            "bullets": exp.get("bullets", []),
        })
        for j, proj in enumerate(exp.get("projects", [])):
            payload.append({
                "entry_id": f"exp_{i}_proj_{j}",
                "type": "project",
                "name": proj.get("name", ""),
                "bullets": proj.get("bullets", []),
            })
    for i, proj in enumerate(projects):
        payload.append({
            "entry_id": f"proj_{i}",
            "type": "project",
            "name": proj.get("name", ""),
            "bullets": proj.get("bullets", []),
        })
    return payload


def _extract_user_context_fields(user_context: Dict) -> Dict:
    """Extract structured fields from user context for improvement prompt."""
    ctx = user_context or {}
    onboarding = ctx.get("onboarding_context", ctx)
    return {
        "target_role": onboarding.get("target_role") or ctx.get("target_role") or "Software Engineer",
        "target_companies": ", ".join(onboarding.get("target_companies", [])) or ctx.get("target_companies") or "Top tech companies",
        "seniority_level": onboarding.get("experience_level") or ctx.get("seniority_level") or "Mid-level",
        "industry": onboarding.get("industry") or ctx.get("industry") or "Technology",
    }


def _strength_level(score: float) -> str:
    if score >= 9.0:
        return "exceptional"
    elif score >= 7.0:
        return "strong"
    elif score >= 4.0:
        return "average"
    else:
        return "weak"


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 PUBLIC API — Single Entry Evaluation
# ══════════════════════════════════════════════════════════════════════════════

async def evaluate_entry(
    llm_client: LLMClient,
    entry: Dict,
    entry_id: str,
    user_context: Dict = None,
    user_id: str = "guest",
    feature: str = "evaluate_entry",
    run_id: Optional[str] = None
) -> Dict:
    """
    4-Step recruiter analysis on a single entry.
    STRICTLY READ-ONLY — does not modify any bullet.

    Returns:
    {
        "entry_id": "exp_0",
        "score": 6.5,
        "strength_level": "average",
        "issues": [...],
        "context_gaps": [...],
        "reasoning": "...",
        "follow_up_questions": [...]
    }
    """
    ctx_str = json.dumps(user_context or {}, indent=2)
    entry_str = json.dumps(entry, indent=2)

    # Extract target role & company from onboarding context for dynamic prompt personalisation
    ctx = user_context or {}
    target_roles_raw = ctx.get("target_roles", [])
    target_roles = (
        ", ".join(target_roles_raw) if isinstance(target_roles_raw, list) and target_roles_raw
        else str(target_roles_raw) if target_roles_raw
        else "the target role"
    )
    target_companies_raw = ctx.get("target_companies", [])
    target_companies = (
        ", ".join(target_companies_raw) if isinstance(target_companies_raw, list) and target_companies_raw
        else str(target_companies_raw) if target_companies_raw
        else "top product-based companies"
    )

    prompt = EVALUATE_ENTRY_PROMPT.format(
        user_context=ctx_str,
        entry_json=entry_str,
        entry_id=entry_id,
        target_roles=target_roles,
        target_companies=target_companies,
    )

    raw = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.1,
        max_tokens=1500,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    if not isinstance(raw, dict):
        return {
            "entry_id": entry_id,
            "score": 5.0,
            "strength_level": "average",
            "issues": ["Could not evaluate — LLM response malformed"],
            "context_gaps": [],
            "reasoning": "Evaluation failed. Please try again.",
            "follow_up_questions": [
                "What was the scale of this system (users, requests/sec)?",
                "What specific tools or frameworks did you use?",
                "What measurable outcome resulted from this work?",
            ],
        }

    score = round(float(raw.get("score", 5.0)), 1)
    return {
        "entry_id": entry_id,
        "score": score,
        "strength_level": raw.get("strength_level", _strength_level(score)),
        "issues": raw.get("issues", []),
        "context_gaps": raw.get("context_gaps", []),
        "reasoning": raw.get("reasoning", ""),
        "follow_up_questions": raw.get("follow_up_questions", []),
    }


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1B PUBLIC API — Bulk Scoring (background, for ImpactScoreBadge)
# ══════════════════════════════════════════════════════════════════════════════

async def score_entries(
    llm_client, 
    experience: List[Dict], 
    projects: List[Dict], 
    summary: Optional[str] = None, 
    achievements: Optional[List[str]] = None,
    target_roles: str = "Software Engineer",
    target_companies: str = "Top product-based companies",
    user_id: str = "guest",
    feature: str = "bulk_score_entries",
    run_id: Optional[str] = None
) -> Dict:
    """
    Lightweight bulk scoring for background ImpactScoreBadge display.
    Returns: { "exp_0": {"score": 5.5, "reasons": [...]}, ... }
    """
    payload = _entries_to_score_payload(experience, projects, summary, achievements)
    if not payload:
        return {}

    prompt = BULK_SCORE_PROMPT.format(
        entries_json=json.dumps(payload, indent=2),
        target_roles=target_roles,
        target_companies=target_companies
    )
    raw = await llm_client.generate_json(
        prompt=prompt, 
        temperature=0.1, 
        max_tokens=2048,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    scores_dict = {}
    scored_list = []
    if isinstance(raw, list):
        scored_list = raw
    elif isinstance(raw, dict):
        if "scores" in raw and isinstance(raw["scores"], list):
            scored_list = raw["scores"]
        else:
            for v in raw.values():
                if isinstance(v, list):
                    scored_list.extend(v)
            if not scored_list:
                scored_list = [raw]

    for item in scored_list:
        if not isinstance(item, dict):
            continue
        eid = item.get("entry_id", "")
        if not eid:
            continue
        scores_dict[eid] = {
            "score": round(float(item.get("score", 5.0)), 1),
            "reasons": item.get("reasons", [])
        }
    return scores_dict


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 PUBLIC API — Interview Chat Turn
# ══════════════════════════════════════════════════════════════════════════════

async def chat_interview_turn(
    llm_client: LLMClient,
    section: str,
    entry: Dict,
    chat_history: List[Dict[str, str]],
    user_context: Dict[str, Any] = None,
    pre_identified_questions: List[str] = None,
    user_id: str = "guest",
    feature: str = "entry_interview",
    run_id: Optional[str] = None
) -> Dict:
    """
    Generate the next AI question in the context-extraction interview.
    Pre-identified questions from the evaluation step are passed in to
    ensure the chat is targeted, not generic.

    Returns: { "reply_text": "...", "confidence_score": 80, "ready_to_propose": false }
    """
    history_str = ""
    for msg in chat_history:
        role = "AI Coach" if msg.get("role") == "assistant" else "Candidate"
        history_str += f"{role}: {msg.get('content', '')}\n"
    if not history_str:
        history_str = "(Interview just started — no previous conversation)"

    questions_str = "\n".join(
        f"- {q}" for q in (pre_identified_questions or [])
    ) or "(No pre-identified questions — use general gap-detection)"

    prompt = ENTRY_INTERVIEW_PROMPT.format(
        section=section,
        entry_json=json.dumps(entry, indent=2),
        chat_history=history_str,
        user_context=json.dumps(user_context or {}, indent=2),
        pre_identified_questions=questions_str,
    )

    raw = await llm_client.generate_json(
        prompt=prompt, 
        temperature=0.4, 
        max_tokens=512,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    if isinstance(raw, dict) and "reply_text" in raw:
        return {
            "reply_text": raw.get("reply_text", "Could you share more specifics about the tools or scale?"),
            "confidence_score": raw.get("confidence_score", 0),
            "ready_to_propose": bool(raw.get("ready_to_propose", False)),
        }
    return {
        "reply_text": "What was the scale of this system, and which specific technologies did you use?",
        "confidence_score": 10,
        "ready_to_propose": False,
    }


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 PUBLIC API — Elite Improvement
# ══════════════════════════════════════════════════════════════════════════════

async def improve_entry(
    llm_client: LLMClient,
    entry: Dict,
    chat_history: List[Dict[str, str]],
    user_context: Dict[str, Any] = None,
    user_id: str = "guest",
    feature: str = "improve_entry",
    run_id: Optional[str] = None
) -> Tuple[Dict, List[Dict]]:
    """
    Generate industry-grade, ATS-optimized, STAR-structured bullets
    using the full interview transcript and user context.

    Returns (improved_entry_dict, bullet_level_diffs)
    """
    from core.bullet_improver import compute_word_diff

    ctx_fields = _extract_user_context_fields(user_context or {})

    transcript_lines = []
    for msg in chat_history:
        role = "AI Coach" if msg.get("role") == "assistant" else "Candidate"
        transcript_lines.append(f"{role}: {msg.get('content', '')}")
    transcript_str = "\n".join(transcript_lines) if transcript_lines else "No interview context provided."

    prompt = ELITE_IMPROVE_PROMPT.format(
        target_role=ctx_fields["target_role"],
        target_companies=ctx_fields["target_companies"],
        seniority_level=ctx_fields["seniority_level"],
        industry=ctx_fields["industry"],
        entry_json=json.dumps(entry, indent=2),
        chat_history=transcript_str,
    )

    raw = await llm_client.generate_json(
        prompt=prompt, 
        temperature=0.2, 
        max_tokens=1200,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    improved_entry = {**entry}
    if isinstance(raw, dict):
        new_bullets = raw.get("bullets", [])
        orig_count = len(entry.get("bullets", []))
        if new_bullets and len(new_bullets) >= max(1, orig_count // 2):
            improved_entry["bullets"] = new_bullets

    # Compute word-level diffs
    orig_bullets = entry.get("bullets", [])
    impr_bullets = improved_entry.get("bullets", [])
    bullet_diffs = []
    for i in range(max(len(orig_bullets), len(impr_bullets))):
        orig = orig_bullets[i] if i < len(orig_bullets) else ""
        impr = impr_bullets[i] if i < len(impr_bullets) else ""
        bullet_diffs.append({
            "original": orig,
            "improved": impr,
            "diff": compute_word_diff(orig, impr),
            "changed": orig != impr,
        })

    return improved_entry, bullet_diffs


def _score_badge(score: float) -> str:
    if score >= 8.0:
        return "🟢"
    elif score >= 5.5:
        return "🟡"
    else:
        return "🔴"


def save_entry_suggestion(
    entry_id: str,
    section: str,
    original_entry: Dict,
    improved_entry: Dict,
    db_engine,
) -> str:
    from sqlmodel import Session
    from core.models import OptimizationSuggestion
    import uuid

    suggestion_id = str(uuid.uuid4())
    with Session(db_engine) as session:
        record = OptimizationSuggestion(
            user_id="default-id",
            jd_id=None,
            target_uuid=entry_id,
            original_text=json.dumps(original_entry),
            proposed_text=json.dumps(improved_entry),
            status="pending",
            trigger_source="entry_improvement"
        )
        session.add(record)
        session.commit()
    return suggestion_id


async def background_score_and_save(user_id: str, context_id: int, db_engine, config):
    """
    Background Task:
    1. Fetch MasterProfile for a specific context.
    2. Extract and bulk-score all entries (lightweight scoring only).
    3. Update the data JSON with impact_score and impact_reasons.
    4. Save back to DB.
    """
    logger.info(f"Starting background scoring for context {context_id}...")
    try:
        with Session(db_engine) as session:
            profile = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).first()
            from core.models import UserContext
            context = session.exec(select(UserContext).where(UserContext.id == context_id)).first()
            
            if not profile:
                logger.error(f"Scoring failed: No profile found for context {context_id}")
                return

            import copy
            data = copy.deepcopy(profile.data or {})
            experience = data.get("experience", [])
            projects = data.get("projects", [])

            if not experience and not projects:
                logger.info(f"Nothing to score for user {user_id}")
                return

            summary = data.get("summary")
            achievements = data.get("achievements", [])

            for exp in experience:
                exp["impact_score"] = None
                exp["impact_reasons"] = []
                for sub_proj in exp.get("projects", []):
                    sub_proj["impact_score"] = None
                    sub_proj["impact_reasons"] = []
            for proj in projects:
                proj["impact_score"] = None
                proj["impact_reasons"] = []

            # Reset summary/achievements score keys
            data["summary_score"] = None
            data["summary_reasons"] = []
            data["achievements_score"] = None
            data["achievements_reasons"] = []

            # Extract target roles & companies from context
            target_roles = "the target role"
            target_companies = "top tech companies"
            if context:
                ctx_data = context.onboarding_context or {}
                tr = ctx_data.get("target_roles", [])
                if tr:
                    target_roles = ", ".join(tr) if isinstance(tr, list) else str(tr)
                tc = ctx_data.get("target_companies", [])
                if tc:
                    target_companies = ", ".join(tc) if isinstance(tc, list) else str(tc)

            llm_client = LLMClient(config)
            scores = await score_entries(
                llm_client, 
                experience, 
                projects, 
                summary, 
                achievements,
                target_roles=target_roles,
                target_companies=target_companies,
                user_id=user_id
            )

            for i, exp in enumerate(experience):
                eid = f"exp_{i}"
                if eid in scores:
                    exp["impact_score"] = scores[eid]["score"]
                    exp["impact_reasons"] = scores[eid]["reasons"]
                else:
                    exp["impact_score"] = exp.get("impact_score") or 5.0
                    exp["impact_reasons"] = ["Automatically scored"]

                for j, sub_proj in enumerate(exp.get("projects", [])):
                    pid = f"exp_{i}_proj_{j}"
                    if pid in scores:
                        sub_proj["impact_score"] = scores[pid]["score"]
                        sub_proj["impact_reasons"] = scores[pid]["reasons"]
                    else:
                        sub_proj["impact_score"] = sub_proj.get("impact_score") or 5.0
                        sub_proj["impact_reasons"] = ["Automatically scored"]

            for i, proj in enumerate(projects):
                eid = f"proj_{i}"
                if eid in scores:
                    proj["impact_score"] = scores[eid]["score"]
                    proj["impact_reasons"] = scores[eid]["reasons"]
                else:
                    proj["impact_score"] = proj.get("impact_score") or 5.0

            # Map Summary & Achievements
            if "summary" in scores:
                data["summary_score"] = scores["summary"]["score"]
                data["summary_reasons"] = scores["summary"]["reasons"]
            
            if "achievements" in scores:
                data["achievements_score"] = scores["achievements"]["score"]
                data["achievements_reasons"] = scores["achievements"]["reasons"]

            from sqlalchemy.orm.attributes import flag_modified
            profile.data = data
            flag_modified(profile, "data")
            session.add(profile)
            session.commit()
            logger.info(f"Background scoring complete for user {user_id}")

    except Exception as e:
        logger.error(f"Background scoring error: {str(e)}")
