"""
JD Matching & Resume Optimization Pipeline
============================================
Stage 1 — Relevance Scoring:    POST /api/jd/analyze
Stage 2 — ATS Optimization:     POST /api/jd/optimize
Stage 3 — Gap Analysis:         POST /api/jd/gaps

All LLM calls are cached in the DB.  On second call, the GET /api/jd/results/{jd_id}
endpoint reads directly from DB (no LLM re-invocations).
"""

import json
import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlmodel import Session, select

from prompts.alignment import RELEVANCE_SCORE_PROMPT, ATS_OPTIMIZE_PROMPT, GAP_ANALYSIS_PROMPT

from core.bullet_improver import compute_word_diff
from core.models import (
    EntryScore,
    GapAnalysis,
    JobDescription,
    MasterProfile,
    OptimizationSuggestion,
)

logger = logging.getLogger(__name__)


# ── Decision classification helper ─────────────────────────────────────────────

def _classify(score: float) -> str:
    if score >= 7.0:
        return "KEEP"
    if score >= 4.0:
        return "OPTIONAL"
    return "REMOVE"


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 1 — Relevance Scoring
# ═══════════════════════════════════════════════════════════════════════════════



async def run_relevance_scoring(
    llm_client,
    jd_text: str,
    entries: List[Dict],
    user_context: Dict,
    user_id: str = "guest",
    feature: str = "jd_relevance",
    run_id: Optional[str] = None,
) -> List[Dict]:
    """
    Stage 1: Score all resume entries against the JD.
    Returns a list of scored entry dicts (not persisted — caller persists).
    """
    entries_json = json.dumps(entries, indent=2)
    context_str = json.dumps(user_context, indent=2)

    # Extract target role & company from onboarding context for dynamic prompt personalisation
    target_roles_raw = user_context.get("target_roles", [])
    target_roles = (
        ", ".join(target_roles_raw) if isinstance(target_roles_raw, list) and target_roles_raw
        else str(target_roles_raw) if target_roles_raw
        else "the target role"
    )
    target_companies_raw = user_context.get("target_companies", [])
    target_companies = (
        ", ".join(target_companies_raw) if isinstance(target_companies_raw, list) and target_companies_raw
        else str(target_companies_raw) if target_companies_raw
        else "top product-based companies"
    )

    prompt = RELEVANCE_SCORE_PROMPT.format(
        jd_text=jd_text,
        user_context=context_str,
        entries_json=entries_json,
        target_roles=target_roles,
        target_companies=target_companies,
    )

    raw = await llm_client.generate_json(
        prompt=prompt, 
        temperature=0.2, 
        max_tokens=2048,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    results: List[Dict] = []
    if isinstance(raw, list):
        results = raw
    elif isinstance(raw, dict) and "entries" in raw:
        results = raw["entries"]

    # Fill in defaults + classify decision from score
    scored = []
    entry_map = {e.get("entry_id", f"entry_{i}"): e for i, e in enumerate(entries)}
    for item in results:
        entry_id = item.get("entry_id", "")
        score = float(item.get("score", 5.0))
        decision = item.get("decision") or _classify(score)
        scored.append({
            "entry_id": entry_id,
            "score": score,
            "decision": decision,
            "matched_keywords": item.get("matched_keywords", []),
            "missing_keywords": item.get("missing_keywords", []),
            "reasoning": item.get("reasoning", ""),
            # Attach original entry data for convenience
            "entry": entry_map.get(entry_id, {}),
        })

    # Sort: KEEP first, then OPTIONAL, then REMOVE
    order = {"KEEP": 0, "OPTIONAL": 1, "REMOVE": 2}
    scored.sort(key=lambda x: (order.get(x["decision"], 1), -x["score"]))
    return scored


def save_entry_scores(
    scored: List[Dict],
    jd_id: int,
    user_id: str,
    context_id: Optional[int],
    db_engine,
) -> None:
    """Persist Stage 1 results to the EntryScore table (upsert by entry_id + jd_id)."""
    with Session(db_engine) as session:
        for item in scored:
            # Delete previous score for same entry+jd pair
            existing = session.exec(
                select(EntryScore).where(
                    EntryScore.jd_id == jd_id,
                    EntryScore.entry_id == item["entry_id"],
                )
            ).first()
            if existing:
                session.delete(existing)
                session.flush()

            record = EntryScore(
                user_id=user_id,
                context_id=context_id,
                jd_id=jd_id,
                entry_id=item["entry_id"],
                score=item["score"],
                decision=item["decision"],
                matched_keywords=item.get("matched_keywords", []),
                missing_keywords=item.get("missing_keywords", []),
                reasoning=item.get("reasoning", ""),
            )
            session.add(record)
        session.commit()


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 2 — ATS Optimization
# ═══════════════════════════════════════════════════════════════════════════════

_ATS_OPTIMIZE_PROMPT = ATS_OPTIMIZE_PROMPT


async def run_ats_optimization(
    llm_client,
    jd_text: str,
    selected_entries: List[Dict],   # [{entry_id, entry, matched_keywords, missing_keywords}]
    user_id: str = "guest",
    feature: str = "ats_optimize",
    run_id: Optional[str] = None,
) -> List[Dict]:
    """
    Stage 2: For each selected entry, generate ATS-optimized bullets + diffs.
    Returns list of {entry_id, original_bullets, optimized_bullets, word_diffs, suggestion_ids}.
    """
    results = []
    for item in selected_entries:
        entry = item.get("entry", {})
        original_bullets = entry.get("bullets", [])

        prompt = _ATS_OPTIMIZE_PROMPT.format(
            jd_text=jd_text,
            entry_json=json.dumps(entry, indent=2),
            matched_keywords=json.dumps(item.get("matched_keywords", [])),
            missing_keywords=json.dumps(item.get("missing_keywords", [])),
        )

        raw = await llm_client.generate_json(
            prompt=prompt, 
            temperature=0.3, 
            max_tokens=1024,
            user_id=user_id,
            feature=feature,
            run_id=run_id
        )

        optimized_bullets = original_bullets  # safe fallback
        llm_diff = {"added": [], "removed": []}

        if isinstance(raw, dict):
            optimized_bullets = raw.get("bullets", original_bullets)
            llm_diff = raw.get("diff", llm_diff)

        # Compute word-level diffs per bullet
        bullet_diffs = []
        for orig, opt in zip(original_bullets, optimized_bullets):
            diff_tokens = compute_word_diff(orig, opt)
            bullet_diffs.append({
                "original": orig,
                "optimized": opt,
                "diff_tokens": diff_tokens,
                "changed": orig.strip() != opt.strip(),
            })

        results.append({
            "entry_id": item["entry_id"],
            "original_bullets": original_bullets,
            "optimized_bullets": optimized_bullets,
            "bullet_diffs": bullet_diffs,
            "llm_diff": llm_diff,
        })

    return results


def save_optimization_suggestions(
    optimized: List[Dict],
    jd_id: int,
    user_id: str,
    context_id: Optional[int],
    db_engine,
) -> List[Dict]:
    """Persist Stage 2 diffs to OptimizationSuggestion. Returns list with suggestion_ids."""
    result_with_ids = []
    with Session(db_engine) as session:
        for item in optimized:
            # One suggestion record per entry (stores all bullets as JSON)
            record = OptimizationSuggestion(
                user_id=user_id,
                context_id=context_id,
                jd_id=jd_id,
                target_uuid=item["entry_id"],
                original_text=json.dumps(item["original_bullets"]),
                proposed_text=json.dumps(item["optimized_bullets"]),
                diff_data=item["bullet_diffs"],
                status="pending",
                trigger_source="jd_pipeline",
            )
            session.add(record)
            session.flush()
            session.refresh(record)
            result_with_ids.append({**item, "suggestion_id": record.id})
        session.commit()
    return result_with_ids


# ═══════════════════════════════════════════════════════════════════════════════
# STAGE 3 — Gap Analysis
# ═══════════════════════════════════════════════════════════════════════════════

async def run_gap_analysis(
    llm_client,
    jd_text: str,
    all_entries: List[Dict],
    skills: Dict,
    user_context: Dict,
    scored_entries: List[Dict],
    user_id: str = "guest",
    feature: str = "gap_analysis",
    run_id: Optional[str] = None,
) -> Dict:
    """Stage 3: Produce a gap analysis comparing JD requirements to resume coverage."""
    # Build a text coverage summary from the scored entries
    coverage_lines = []
    for s in scored_entries:
        coverage_lines.append(
            f"[{s['decision']} | {s['score']}/10] {s['entry_id']}: {s.get('reasoning', '')}"
        )
    coverage_summary = "\n".join(coverage_lines) or "No scored entries available."

    # Extract target role & company from onboarding context for dynamic prompt personalisation
    target_roles_raw = user_context.get("target_roles", [])
    target_roles = (
        ", ".join(target_roles_raw) if isinstance(target_roles_raw, list) and target_roles_raw
        else str(target_roles_raw) if target_roles_raw
        else "the target role"
    )
    target_companies_raw = user_context.get("target_companies", [])
    target_companies = (
        ", ".join(target_companies_raw) if isinstance(target_companies_raw, list) and target_companies_raw
        else str(target_companies_raw) if target_companies_raw
        else "top product-based companies"
    )

    prompt = GAP_ANALYSIS_PROMPT.format(
        jd_text=jd_text,
        skills_json=json.dumps(skills, indent=2),
        coverage_summary=coverage_summary,
        user_context=json.dumps(user_context, indent=2),
        target_roles=target_roles,
        target_companies=target_companies,
    )

    raw = await llm_client.generate_json(
        prompt=prompt, 
        temperature=0.3, 
        max_tokens=1024,
        user_id=user_id,
        feature=feature,
        run_id=run_id
    )

    if isinstance(raw, dict):
        return {
            "missing_skills": raw.get("missing_skills", []),
            "missing_keywords": raw.get("missing_keywords", []),
            "suggestions": raw.get("suggestions", ""),
        }
    return {"missing_skills": [], "missing_keywords": [], "suggestions": ""}


def save_gap_analysis(
    gap: Dict,
    jd_id: int,
    user_id: str,
    context_id: Optional[int],
    db_engine,
) -> int:
    """Persist Stage 3 results to GapAnalysis. Returns record id."""
    with Session(db_engine) as session:
        # Delete previous analysis for same jd
        existing = session.exec(
            select(GapAnalysis).where(GapAnalysis.jd_id == jd_id, GapAnalysis.user_id == user_id)
        ).first()
        if existing:
            session.delete(existing)
            session.flush()

        record = GapAnalysis(
            user_id=user_id,
            context_id=context_id,
            jd_id=jd_id,
            missing_skills=gap.get("missing_skills", []),
            missing_keywords=gap.get("missing_keywords", []),
            suggestions=gap.get("suggestions", ""),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record.id


# ═══════════════════════════════════════════════════════════════════════════════
# CACHE READER — Hydrate all 3 stages from DB
# ═══════════════════════════════════════════════════════════════════════════════

def get_jd_results(jd_id: int, user_id: str, db_engine) -> Optional[Dict]:
    """
    Read all 3 stages from DB for a given jd_id.
    Returns None if Stage 1 hasn't been run yet.
    """
    with Session(db_engine) as session:
        # Stage 1: entry scores
        scores = session.exec(
            select(EntryScore).where(EntryScore.jd_id == jd_id, EntryScore.user_id == user_id)
        ).all()
        if not scores:
            return None

        # Stage 2: optimization suggestions
        suggestions = session.exec(
            select(OptimizationSuggestion).where(
                OptimizationSuggestion.jd_id == jd_id,
                OptimizationSuggestion.user_id == user_id,
                OptimizationSuggestion.trigger_source == "jd_pipeline",
            )
        ).all()

        # Stage 3: gap analysis
        gap = session.exec(
            select(GapAnalysis).where(GapAnalysis.jd_id == jd_id, GapAnalysis.user_id == user_id)
        ).first()

        return {
            "stage1": [
                {
                    "entry_id": s.entry_id,
                    "score": s.score,
                    "decision": s.decision,
                    "matched_keywords": s.matched_keywords,
                    "missing_keywords": s.missing_keywords,
                    "reasoning": s.reasoning,
                }
                for s in scores
            ],
            "stage2": [
                {
                    "suggestion_id": s.id,
                    "entry_id": s.target_uuid,
                    "original_bullets": json.loads(s.original_text) if s.original_text.startswith("[") else [s.original_text],
                    "optimized_bullets": json.loads(s.proposed_text) if s.proposed_text.startswith("[") else [s.proposed_text],
                    "bullet_diffs": s.diff_data or [],
                    "status": s.status,
                }
                for s in suggestions
            ],
            "stage3": {
                "missing_skills": gap.missing_skills if gap else [],
                "missing_keywords": gap.missing_keywords if gap else [],
                "suggestions": gap.suggestions if gap else "",
            } if gap else None,
        }
