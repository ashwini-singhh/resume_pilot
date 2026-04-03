"""
Entry Impact Scorer — Entry-Level Impact Scoring + Improvement

Isolated feature. Scores whole entries (experience/project), not individual bullets.
Provides targeted Q&A + entry-level rewrite.

New APIs:
  POST /api/score-entries
  POST /api/entry/generate-questions
  POST /api/entry/improve
"""

import json
import logging
from typing import List, Dict, Optional, Tuple, Any
from sqlmodel import Session, select
from core.models import MasterProfile
from core.llm_client.llm_client import LLMClient

logger = logging.getLogger(__name__)


# ── Prompts ──────────────────────────────────────────────────────────────────

_SCORE_PROMPT = """\
You are a senior technical recruiter evaluating resume entries.

Score each entry on a scale of 0–10 based on:
1. Impact & Outcomes (quantified results, metrics, business value) — 35%
2. Clarity & Action Verbs (strong verbs, concise language) — 25%
3. Technical Depth (specific tools, frameworks, scale) — 25%
4. Structure & Completeness (enough detail, not vague) — 15%

STRICT RULES:
- Do NOT inflate scores. Most mid-level candidates score 4–7.
- Score 8–10 ONLY if there are clear metrics AND strong technical depth.
- Score 1–4 if bullets are vague, passive, or missing impact.
- Score independently per entry. Do NOT average the whole section.
- Return ONLY a valid JSON array. No extra text, no markdown.

Output schema:
[
  {{
    "entry_id": "exp_0",
    "score": 5.5,
    "reasons": ["No quantified metrics", "Good action verbs but tools not specified"]
  }}
]

Resume entries to score:
{entries_json}

Output (JSON array only):
"""

_ENTRY_QUESTIONS_PROMPT = """\
You are an expert resume coach analyzing a resume entry (company/project).

Your job: generate 3–5 targeted questions to extract MISSING context that would significantly improve this entry.

STRICT RULES:
- Questions must be SPECIFIC to this entry — not generic
- Focus on missing: metrics, scale, headcount, tools, business outcomes, timelines
- Each question must target a different gap
- Do NOT ask if information is already present in the entry
- Return ONLY a JSON array of question strings. No markdown.

Section type: {section}
Entry content:
{entry_json}

Examples of GOOD questions:
- "How many concurrent users did the system handle at peak?"
- "What stack did you migrate from and to?"
- "What was the % improvement in load time after your optimization?"

Output (JSON array only):
"""

_ENTRY_IMPROVE_PROMPT = """\
You are a world-class ATS-optimized resume writer.

Rewrite ALL bullets in this resume entry using the additional context provided.

STRICT RULES:
1. Rewrite every bullet — do NOT skip any
2. Each bullet MUST start with a strong action verb
3. Embed the context answers naturally — do NOT list them separately
4. Do NOT hallucinate. Only use facts from the original + context
5. Keep each bullet under 30 words
6. No first-person pronouns
7. Maintain exact count of bullets (if 4 in, 4 out)
8. Return ONLY a JSON object matching the output schema below

Original Entry:
{entry_json}

Context from candidate:
{context_block}

Output schema:
{{
  "company": "same as input (or project name)",
  "title": "same as input",
  "period": "same as input",
  "bullets": ["rewritten bullet 1", "rewritten bullet 2", ...]
}}

Output (JSON only):
"""


# ── Scoring Logic ─────────────────────────────────────────────────────────────

def _entries_to_score_payload(experience: List[Dict], projects: List[Dict]) -> List[Dict]:
    """Flatten experience + projects into a single list for the LLM, with stable IDs."""
    payload = []
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


async def score_entries(llm_client, experience: List[Dict], projects: List[Dict]) -> Dict:
    """
    Score each experience + project entry individually.
    Returns:
      {
        "exp_0": {"score": 5.5, "reasons": [...]},
        "exp_0_proj_1": {"score": 6.0, "reasons": [...]},
        "proj_0": {"score": 7.0, "reasons": [...]}
      }
    """
    payload = _entries_to_score_payload(experience, projects)

    if not payload:
        return {}
    prompt = _SCORE_PROMPT.format(entries_json=json.dumps(payload, indent=2))

    raw = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.1,
        max_tokens=2048,
    )

    # Parse flat list → split back by type
    scores_dict = {}

    scored_list = []
    if isinstance(raw, list):
        scored_list = raw
    elif isinstance(raw, dict):
        if "scores" in raw and isinstance(raw["scores"], list):
            scored_list = raw["scores"]
        else:
            # Maybe the LLM returned a dict of { "exp_0": {...} } directly
            # Or maybe it wrapped it in some other key like "results".
            # Try to salvage any lists inside of it.
            for v in raw.values():
                if isinstance(v, list):
                    scored_list.extend(v)
            if not scored_list:
                # the whole dict might be a single item?
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

# ── Entry Question Generation ─────────────────────────────────────────────────

async def generate_entry_questions(
    llm_client,
    section: str,
    entry: Dict,
) -> List[str]:
    """
    Generate 3-5 targeted questions specific to this entry's gaps.
    """
    prompt = _ENTRY_QUESTIONS_PROMPT.format(
        section=section,
        entry_json=json.dumps(entry, indent=2),
    )

    raw = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.3,
        max_tokens=768,
    )

    questions: List[str] = []
    if isinstance(raw, list):
        questions = [q for q in raw if isinstance(q, str)]
    elif isinstance(raw, dict):
        questions = raw.get("questions", [])

    if not questions:
        questions = [
            "What measurable outcome did this work produce (e.g., % improvement, cost saved)?",
            "What was the scale — number of users, data volume, team size?",
            "Which specific technologies, frameworks, or tools were used?",
            "What was the business impact or stakeholder value?",
        ]

    return questions[:5]  # cap at 5


# ── Entry-Level Improvement ───────────────────────────────────────────────────

async def improve_entry(
    llm_client,
    entry: Dict,
    questions: List[str],
    answers: List[str],
) -> Tuple[Dict, List[Dict]]:
    """
    Rewrite all bullets in an entry using provided context answers.
    Returns (improved_entry_dict, bullet_level_diffs)
    """
    from core.bullet_improver import compute_word_diff

    # Build context block
    context_lines = []
    for i, (q, a) in enumerate(zip(questions, answers)):
        if a.strip():
            context_lines.append(f"Q{i+1}: {q}\nA: {a.strip()}")
    context_block = "\n\n".join(context_lines) if context_lines else "No additional context provided."

    prompt = _ENTRY_IMPROVE_PROMPT.format(
        entry_json=json.dumps(entry, indent=2),
        context_block=context_block,
    )

    raw = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.2,
        max_tokens=1024,
    )

    # Build improved entry — fallback gracefully
    improved_entry = {**entry}  # copy original
    if isinstance(raw, dict):
        new_bullets = raw.get("bullets", [])
        if new_bullets and len(new_bullets) == len(entry.get("bullets", [])):
            improved_entry["bullets"] = new_bullets
        elif new_bullets:
            # LLM returned different count — still use if at least half
            if len(new_bullets) >= len(entry.get("bullets", [])) // 2:
                improved_entry["bullets"] = new_bullets

    # Compute bullet-level diffs
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
    """Return an emoji badge based on score."""
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
    """
    Step 4: Save suggestion info.
    """
    from sqlmodel import Session
    from core.models import OptimizationSuggestion
    import uuid

    # We use a default placeholder JD/User logic from the system
    suggestion_id = str(uuid.uuid4())
    with Session(db_engine) as session:
        record = OptimizationSuggestion(
            user_id=1,
            jd_id=1,
            target_uuid=entry_id,
            original_text=json.dumps(original_entry),
            proposed_text=json.dumps(improved_entry),
            status="pending",
            trigger_source="entry_improvement"
        )
        session.add(record)
        session.commit()
    return suggestion_id


async def background_score_and_save(user_id: int, db_engine, config):
    """
    Background Task:
    1. Fetch MasterProfile for user.
    2. Extract and score all entries.
    3. Update the data JSON with impact_score and impact_reasons.
    4. Save back to DB.
    """
    logger.info(f"Starting background scoring for user {user_id}...")
    try:
        with Session(db_engine) as session:
            profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
            if not profile:
                logger.error(f"Scoring failed: No profile found for user {user_id}")
                return

            data = profile.data or {}
            experience = data.get("experience", [])
            projects = data.get("projects", [])

            if not experience and not projects:
                logger.info(f"Nothing to score for user {user_id}")
                return

            llm_client = LLMClient(config)
            scores = await score_entries(llm_client, experience, projects)

            # Inject scores back into experience
            for i, exp in enumerate(experience):
                eid = f"exp_{i}"
                if eid in scores:
                    exp["impact_score"] = scores[eid]["score"]
                    exp["impact_reasons"] = scores[eid]["reasons"]
                
                # Nested projects
                for j, sub_proj in enumerate(exp.get("projects", [])):
                    pid = f"exp_{i}_proj_{j}"
                    if pid in scores:
                        sub_proj["impact_score"] = scores[pid]["score"]
                        sub_proj["impact_reasons"] = scores[pid]["reasons"]

            # Inject scores back into top-level projects
            for i, proj in enumerate(projects):
                eid = f"proj_{i}"
                if eid in scores:
                    proj["impact_score"] = scores[eid]["score"]
                    proj["impact_reasons"] = scores[eid]["reasons"]

            # Explicitly mark as modified for SQLModel if needed, 
            # but usually assigning a new dict/list works.
            profile.data = data
            session.add(profile)
            session.commit()
            logger.info(f"Background scoring complete for user {user_id}")

    except Exception as e:
        logger.error(f"Background scoring error: {str(e)}")
