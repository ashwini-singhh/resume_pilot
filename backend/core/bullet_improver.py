"""
Bullet Improver Module — On-Demand Resume Improvement with Context Q&A

Isolated feature. Does NOT modify any existing tables or logic.
Uses:
  - context_messages table (new, defined in this file)
  - suggestions table (existing, inserts only)
  - LLMClient (existing async client)
"""

import json
import logging
import re
import uuid
from typing import List, Dict, Optional, Tuple

from sqlmodel import SQLModel, Field, Session, Column, JSON, create_engine, select

logger = logging.getLogger(__name__)


# ── New Table: context_messages ──────────────────────────────────────────────

class ContextMessage(SQLModel, table=True):
    """Stores Q&A context for an on-demand bullet improvement session."""
    __tablename__ = "context_messages"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    run_id: str = Field(index=True)                    # logical session ID (caller-generated UUID)
    suggestion_id: Optional[str] = Field(default=None) # linked to suggestions.id once saved
    role: str                                           # 'assistant' | 'user'
    message: str
    created_at: str = Field(
        default_factory=lambda: __import__("datetime").datetime.utcnow().isoformat()
    )


# ── Prompts ──────────────────────────────────────────────────────────────────

_QUESTION_GEN_PROMPT = """\
You are an expert resume coach reviewing a candidate's resume bullet.

Your task: generate 2–3 HIGH-VALUE questions to gather missing context that would let you write a much stronger, more specific version of this bullet.

Rules:
- Questions must focus on: quantified impact, scale, tools/tech used, team size, or measurable outcomes
- DO NOT ask generic questions like "What did you do?" or "How did it go?"
- DO NOT hallucinate fields. Only ask about what seems genuinely missing.
- Return ONLY a JSON array of question strings. No extra text.

Section: {section}
Bullet: "{bullet}"

Example output:
["How many users or requests did this system handle?", "Which specific technologies or frameworks did you use?", "What was the measured impact (latency reduction, cost savings, etc.)?"]

Output (JSON array only):
"""

_IMPROVE_PROMPT = """\
You are an expert ATS-optimized resume writer.

Your task: rewrite the resume bullet below using the additional context provided.

STRICT RULES:
1. Start with a strong action verb (Led, Designed, Engineered, Reduced, etc.)
2. Keep the SAME factual meaning — do NOT invent claims
3. Add specificity from the context answers
4. Keep it to 1 sentence, under 25 words
5. Do NOT use first person (I, We)
6. Return ONLY a JSON object: {{"improved_bullet": "..."}}

Original Bullet: "{bullet}"

Context provided by candidate:
{context}

Output (JSON only):
"""


# ── Word-level Diff (no LLM) ─────────────────────────────────────────────────

def compute_word_diff(original: str, improved: str) -> List[Dict]:
    """
    Pure Python word-level Myers-style diff.
    Returns a list of tokens: {"word": str, "type": "unchanged"|"added"|"removed"}
    """
    orig_words = original.split()
    impr_words = improved.split()

    # Build LCS table
    m, n = len(orig_words), len(impr_words)
    dp = [[0] * (n + 1) for _ in range(m + 1)]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if orig_words[i - 1].lower().rstrip(".,;:") == impr_words[j - 1].lower().rstrip(".,;:"):
                dp[i][j] = dp[i - 1][j - 1] + 1
            else:
                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])

    # Traceback
    result = []
    i, j = m, n
    while i > 0 or j > 0:
        if i > 0 and j > 0 and orig_words[i - 1].lower().rstrip(".,;:") == impr_words[j - 1].lower().rstrip(".,;:"):
            result.append({"word": impr_words[j - 1], "type": "unchanged"})
            i -= 1
            j -= 1
        elif j > 0 and (i == 0 or dp[i][j - 1] >= dp[i - 1][j]):
            result.append({"word": impr_words[j - 1], "type": "added"})
            j -= 1
        else:
            result.append({"word": orig_words[i - 1], "type": "removed"})
            i -= 1

    result.reverse()
    return result


# ── Core Feature Logic ───────────────────────────────────────────────────────

async def generate_questions(
    llm_client,
    run_id: str,
    section: str,
    bullet_text: str,
    db_engine,
) -> List[str]:
    """
    Step 1: Generate 2–3 intelligent context questions, store as assistant messages.
    """
    prompt = _QUESTION_GEN_PROMPT.format(section=section, bullet=bullet_text)

    result = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.3,
        max_tokens=512,
    )

    # LLM returns a JSON array — handle gracefully
    questions: List[str] = []
    if isinstance(result, list):
        questions = [q for q in result if isinstance(q, str)]
    elif isinstance(result, dict):
        # Some LLMs wrap it: {"questions": [...]}
        questions = result.get("questions", [])

    # Fallback if LLM misbehaved
    if not questions:
        questions = [
            "What was the scale or impact of this work (e.g., users affected, performance gains)?",
            "What technologies or frameworks did you specifically use?",
            "What was the measurable outcome or result?",
        ]

    # Persist as assistant messages
    with Session(db_engine) as session:
        for q in questions:
            session.add(ContextMessage(run_id=run_id, role="assistant", message=q))
        session.commit()

    return questions


def store_answers(
    run_id: str,
    answers: List[str],
    questions: List[str],
    db_engine,
    suggestion_id: Optional[str] = None,
) -> None:
    """
    Step 2: Store user answers as context_messages (role='user').
    Pairs each answer with its question for logging context.
    """
    with Session(db_engine) as session:
        for i, answer in enumerate(answers):
            q_label = questions[i] if i < len(questions) else f"Q{i+1}"
            session.add(ContextMessage(
                run_id=run_id,
                suggestion_id=suggestion_id,
                role="user",
                message=f"[{q_label}]\n{answer}",
            ))
        session.commit()


async def generate_improvement(
    llm_client,
    original_bullet: str,
    questions: List[str],
    answers: List[str],
) -> Tuple[str, List[Dict]]:
    """
    Step 3: Generate improved bullet + compute word diff.
    Returns (improved_bullet, diff_tokens).
    """
    # Build context block for prompt
    context_pairs = []
    for i, (q, a) in enumerate(zip(questions, answers)):
        context_pairs.append(f"Q{i+1}: {q}\nA{i+1}: {a}")
    context_block = "\n\n".join(context_pairs)

    prompt = _IMPROVE_PROMPT.format(bullet=original_bullet, context=context_block)

    result = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.2,
        max_tokens=256,
    )

    improved_bullet = original_bullet  # safe fallback
    if isinstance(result, dict):
        improved_bullet = result.get("improved_bullet", original_bullet) or original_bullet

    # Revert if too different (>60% words changed) — safety guard
    orig_words = set(original_bullet.lower().split())
    impr_words = set(improved_bullet.lower().split())
    if orig_words:
        overlap = len(orig_words & impr_words) / len(orig_words)
        if overlap < 0.4:
            logger.warning("Excessive bullet rewrite detected — reverting to original")
            improved_bullet = original_bullet

    diff_tokens = compute_word_diff(original_bullet, improved_bullet)
    return improved_bullet, diff_tokens


def save_improvement_suggestion(
    run_id: str,
    original_text: str,
    improved_text: str,
    diff_data: List[Dict],
    db_engine,
    section: str = "",
) -> str:
    """
    Step 4: Insert into suggestions table and return suggestion_id.
    Uses existing suggestions table schema — no schema changes needed.
    """
    from core.models import OptimizationSuggestion, engine as _
    # Dynamically import to avoid circular deps
    from sqlmodel import Session as S
    import uuid as _uuid

    # We use the SQLite-backed OptimizationSuggestion model
    # run_id maps to jd_id (reuse field for isolation), user_id=1 default
    from core.models import OptimizationSuggestion

    suggestion_id = str(_uuid.uuid4())

    with S(db_engine) as session:
        # Insert directly with raw SQL to avoid FK constraints on run_id/jd_id
        # (context_messages is standalone; suggestions needs jd_id FK)
        # We'll use the existing model but store run_id in target_uuid
        record = OptimizationSuggestion(
            user_id=1,
            jd_id=1,              # Placeholder — improve when Supabase integrated
            target_uuid=run_id,   # Store run_id here for traceability
            original_text=original_text,
            proposed_text=improved_text,
            status="pending",
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        suggestion_id = str(record.id)

    return suggestion_id
