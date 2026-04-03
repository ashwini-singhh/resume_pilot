"""
Optimization Engine
Wraps LLM calls for bullet-level optimization with accept/reject state.
Loads prompts from centralized prompt files.
"""

import logging
from pathlib import Path
from typing import Dict, List, Optional

from core.llm_provider import LLMClient

logger = logging.getLogger(__name__)

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


def _load_prompt(filename: str) -> str:
    path = _PROMPTS_DIR / filename
    if not path.exists():
        raise FileNotFoundError(f"Prompt file not found: {path}")
    return path.read_text(encoding="utf-8")


def optimize_bullet(
    client: LLMClient,
    bullet: str,
    keywords: List[str],
) -> Dict:
    """
    Optimize a single bullet using the provided LLM client.

    Returns:
        {
            "original": str,
            "modified": str,
            "keywords_added": list,
            "change_type": str,
            "confidence": float,
            "accepted": None  # None = pending, True = accepted, False = rejected
        }
    """
    system_prompt = _load_prompt("system_prompt.txt")
    prompt_template = _load_prompt("gemini_prompt.txt")

    prompt = prompt_template.replace("{bullet}", bullet)
    prompt = prompt.replace("{keywords}", ", ".join(keywords))

    try:
        result = client.generate_json(
            prompt=prompt,
            system_prompt=system_prompt,
            temperature=0.1,
            max_tokens=1024,
        )

        if result:
            validated = _validate(result, bullet)
            validated["accepted"] = None  # Pending user decision
            return validated
        else:
            logger.warning("LLM returned unparseable response, returning original")
            return _fallback(bullet)

    except Exception as e:
        logger.error(f"LLM error: {e}")
        return _fallback(bullet, error=str(e))


def optimize_bullets_batch(
    client: LLMClient,
    bullets: List[str],
    keywords: List[str],
    progress_callback=None,
) -> List[Dict]:
    """
    Optimize multiple bullets sequentially.
    Optional progress_callback(current, total) for UI updates.
    """
    results = []
    total = len(bullets)
    for i, bullet in enumerate(bullets):
        result = optimize_bullet(client, bullet, keywords)
        results.append(result)
        if progress_callback:
            progress_callback(i + 1, total)
    return results


def apply_decisions(
    suggestions: List[Dict],
    sections: Dict[str, List[str]],
) -> str:
    """
    Build the final resume using ONLY accepted changes.
    Rejected and pending changes use the original bullet.
    """
    # Map original bullets → accepted modifications
    accepted_map = {}
    for s in suggestions:
        if s.get("accepted") is True and s.get("original") != s.get("modified"):
            accepted_map[s["original"]] = s["modified"]

    lines = []
    for section_name, bullets in sections.items():
        lines.append(f"\n{'=' * 50}")
        lines.append(f"  {section_name.upper()}")
        lines.append(f"{'=' * 50}\n")
        for bullet in bullets:
            final = accepted_map.get(bullet, bullet)
            lines.append(f"  • {final}")
        lines.append("")

    return "\n".join(lines)


# ── New DB-Backed Optimization Engine ─────────────────────

TAILOR_PROMPT = """
You are an expert technical resume writer. Your job is to analyze a candidate's Master Profile and a target Job Description (JD).
Your goal is to propose subtle, truthful optimizations to the candidate's existing resume bullets to better align with the JD keywords.

CRITICAL INSTRUCTIONS:
1. DO NOT invent new experience, skills, or metrics.
2. Select up to 10 existing bullets that are highly relevant to the JD and slightly rewrite them to emphasize JD keywords.
3. Do NOT change more than 30% of a bullet's original words. Keep the core factual truth perfectly intact.
4. Output your suggestions strictly as a JSON array of objects. Do not use markdown blocks.

Output JSON Schema:
[
  {
    "original_text": "The exact original bullet point from the Master Profile",
    "proposed_text": "The slightly tweaked version emphasizing the JD keywords",
    "rationale": "Brief reason for the change"
  }
]
"""

def generate_tailored_suggestions(client: LLMClient, user_id: int, jd_text: str) -> List[Dict]:
    """
    Analyzes the user's MasterProfile against a Job Description,
    proposing precise diffs to be saved into the DB.
    """
    import json
    from sqlmodel import Session, select
    from core.models import engine, MasterProfile, JobDescription, OptimizationSuggestion
    
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
        if not profile or not profile.data:
            logger.error("No MasterProfile found for user.")
            return []
            
        # Create a JD record temporarily
        jd = JobDescription(user_id=user_id, title="Target Role", company="Target Company", original_text=jd_text)
        session.add(jd)
        session.commit()
        session.refresh(jd)
        
        # Build prompt payload
        payload = {
            "JOB_DESCRIPTION": jd_text,
            "MASTER_PROFILE": profile.data
        }
        
        prompt = TAILOR_PROMPT + "\n\nINPUT DATA:\n" + json.dumps(payload, indent=2)
        
        logger.info("Triggering LLM Tailoring Pipeline...")
        suggestions_json = client.generate_json(
            prompt=prompt,
            temperature=0.1,
            max_tokens=2000
        )
        
        if not suggestions_json or not isinstance(suggestions_json, list):
            logger.error("Failed to parse JSON array from LLM")
            return []
            
        # Create OptimizationSuggestion records
        db_suggestions = []
        for sug in suggestions_json:
            orig = sug.get("original_text", "")
            prop = sug.get("proposed_text", orig)
            if orig and orig != prop:
                record = OptimizationSuggestion(
                    user_id=user_id,
                    jd_id=jd.id,
                    target_uuid="bullet", # Simplifying for now
                    original_text=orig,
                    proposed_text=prop,
                    status="pending"
                )
                session.add(record)
                db_suggestions.append(record)
                
        session.commit()
        return [{"original": r.original_text, "modified": r.proposed_text, "id": r.id} for r in db_suggestions]


# ── Internal helpers ──────────────────────────────────────

def _validate(result: Dict, original: str) -> Dict:
    """Validate and sanitize LLM result. Revert if excessive rewrite."""
    validated = {
        "original": result.get("original", original),
        "modified": result.get("modified", original),
        "keywords_added": result.get("keywords_added", []),
        "change_type": result.get("change_type", "none"),
        "confidence": result.get("confidence", 0.5),
    }

    # Safety: revert if >50% of words changed
    orig_words = set(original.lower().split())
    mod_words = set(validated["modified"].lower().split())
    if orig_words:
        overlap = len(orig_words & mod_words) / len(orig_words)
        if overlap < 0.5:
            logger.warning("Excessive rewrite detected — reverting")
            return _fallback(original, warning="Excessive rewrite reverted")

    return validated


def _fallback(bullet: str, error: str = "", warning: str = "") -> Dict:
    result = {
        "original": bullet,
        "modified": bullet,
        "keywords_added": [],
        "change_type": "none",
        "confidence": 0.0,
        "accepted": None,
    }
    if error:
        result["error"] = error
    if warning:
        result["warning"] = warning
    return result
