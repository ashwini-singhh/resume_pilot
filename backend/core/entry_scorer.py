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

logger = logging.getLogger(__name__)


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1 — RECRUITER EVALUATION PROMPT (READ-ONLY, NO MODIFICATION)
# ══════════════════════════════════════════════════════════════════════════════

_EVALUATE_ENTRY_PROMPT = """\
You are a senior recruiter, resume evaluator, and hiring decision analyst at a top-tier tech company.

YOUR TASK IS NOT TO REWRITE THE RESUME.
Your task is to EVALUATE the entry AS-IS and produce a structured analysis.

DO NOT modify any bullet point.
DO NOT suggest improved text.
DO NOT rewrite anything.
ONLY observe, score, and ask targeted questions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER CONTEXT:
{user_context}

RESUME ENTRY TO EVALUATE:
{entry_json}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STEP 1 — SCORE THIS ENTRY (0–10 scale)

Evaluate independently on these 5 dimensions:
- Impact: Are there measurable results, metrics, business value?
- Clarity: Is each bullet immediately understandable in 5 seconds?
- Specificity: Are tools, frameworks, scale, numbers mentioned?
- Ownership: Did the candidate lead this, or just assist?
- Action Verbs: Are verbs strong (Architected, Drove, Reduced) or weak (Worked, Helped, Assisted)?

SCORING SCALE:
0–3  → Weak (low signal, vague, could apply to anyone)
4–6  → Average (some substance, needs significant improvement)
7–8  → Strong (clear impact, good specificity)
9–10 → Exceptional (quantified, specific, differentiated, recruiter-ready)

STEP 2 — DETECT ISSUES

Look specifically for:
- Vague wording ("worked on", "helped with", "involved in", "assisted")
- Missing metrics (no %, no numbers, no scale, no duration)
- No impact (describes tasks but not outcomes)
- No tools or technologies mentioned
- Unclear ownership (was this individual or team? what was their specific role?)
- Generic bullets (could appear on any resume in any company)
- Passive voice or weak sentence structure
- Repetitive structure across bullets

STEP 3 — IDENTIFY CONTEXT GAPS

What critical information is MISSING that would make this entry exceptional?
Focus on:
- Scale: How many users, requests/sec, records, team size?
- Performance: Did this reduce latency, improve uptime, speed up builds? By what %?
- Business impact: Revenue generated, cost saved, time saved, risk reduced?
- Technical complexity: Distributed system? ML model? Real-time? Microservices?
- Technologies: Specific frameworks, cloud providers, databases, languages?
- Ownership level: Did they design, architect, implement, or maintain?
- Timeline: How long did this take? Sprint, quarter, year?

STEP 4 — GENERATE TARGETED FOLLOW-UP QUESTIONS

Generate 3–5 high-quality, specific questions that would extract the missing context.
These questions should be:
- Specific to THIS entry (not generic)
- Aimed at extracting concrete metrics or technical specifics
- Ordered by impact (most important first)
- Phrased so the user can answer with facts

BAD QUESTIONS (never generate these):
- "Can you explain more?"
- "What did you do?"
- "Add more details"

GOOD QUESTIONS:
- "What was the scale of this system — how many users or requests per second did it handle?"
- "Did this improve latency, uptime, or throughput? By how much?"
- "Which specific AWS services, databases, or frameworks did you use?"
- "Was this your individual contribution or part of a team? What was your specific role?"
- "What business outcome resulted — cost saved, revenue generated, incidents reduced?"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OUTPUT FORMAT (strict JSON, no markdown, no extra text):

{{
  "entry_id": "{entry_id}",
  "score": 6.5,
  "strength_level": "average",
  "issues": [
    "No quantified metrics anywhere",
    "Vague ownership — unclear if led or assisted",
    "Generic bullets — 'worked on' appears 3 times"
  ],
  "context_gaps": [
    "Scale of system (users, data volume, requests/sec)",
    "Performance improvements and % change",
    "Specific tech stack beyond language"
  ],
  "reasoning": "This entry describes task execution but reads like a job description rather than an achievement record. A recruiter scanning this in 10 seconds would see no differentiation. There are no metrics, no impact statements, and no clarity on what this candidate specifically built or led.",
  "follow_up_questions": [
    "How many users or requests per day did this system serve?",
    "Did this work reduce any latency, cost, or error rate? By how much?",
    "What was your specific role — did you design, implement, or review?",
    "Which databases, cloud services, or frameworks did you use?"
  ]
}}

Strength levels: "weak" (0–3), "average" (4–6), "strong" (7–8), "exceptional" (9–10)
"""


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 1B — BULK SCORING (background, lightweight, for ImpactScoreBadge)
# ══════════════════════════════════════════════════════════════════════════════

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


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 2 — INTERVIEW PROMPT (Context Extraction, ONE Q at a time)
# ══════════════════════════════════════════════════════════════════════════════

_ENTRY_INTERVIEW_PROMPT = """\
You are an expert resume coach conducting a targeted interview to extract missing context from a candidate's resume entry.

Your mission: Extract the specific facts, metrics, and technical details that will transform this entry from task-description to impact-driven achievement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ENTRY BEING IMPROVED:
{entry_json}

SECTION TYPE: {section}

USER CONTEXT & GOALS:
{user_context}

PRE-IDENTIFIED GAPS (target these with your questions):
{pre_identified_questions}

CONVERSATION SO FAR:
{chat_history}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INTERVIEW RULES:
1. Ask ONLY ONE question at a time. Never ask multiple questions at once.
2. Start with the most impactful missing information (metrics, scale, business impact).
3. After the user answers, acknowledge briefly (1 sentence) and pivot to the next gap.
4. Keep your replies conversational and human — not robotic.
5. If you already have enough data to write 3+ quantified, specific, differentiated bullets, set ready_to_propose: true.
6. If the user says "skip", "done", "that's all" or similar, set ready_to_propose: true.
7. Track which pre-identified gaps have been answered. Prioritize uncovered ones.
8. Your confidence_score (0–100) should reflect how much strong, specific, quantified content you have collected.

EXAMPLES OF GOOD QUESTIONS:
- "How many daily active users did this system serve at peak load?"
- "What specific performance improvement did you achieve — latency, throughput, error rate?"
- "Which cloud services or databases did you use for this?"
- "Was this your solo contribution, or part of a team effort? What was your specific ownership?"
- "Did this result in cost savings, revenue impact, or reduced incidents?"

Output (JSON only):
{{
  "reply_text": "Your next conversational question or acknowledgment (1–2 sentences max)",
  "confidence_score": 65,
  "ready_to_propose": false
}}
"""


# ══════════════════════════════════════════════════════════════════════════════
# PHASE 3 — ELITE IMPROVEMENT PROMPT (Industry-Grade, ATS-Optimized, STAR)
# ══════════════════════════════════════════════════════════════════════════════

_ENTRY_IMPROVE_PROMPT = """\
You are a world-class resume writer who has helped candidates land roles at FAANG, YC startups, unicorns, and top consulting firms.

You write with surgical precision. Every word earns its place.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER CONTEXT:
Target Role: {target_role}
Target Companies: {target_companies}
Seniority Level: {seniority_level}
Industry: {industry}

ORIGINAL ENTRY (do NOT change title, company, or period):
{entry_json}

INTERVIEW TRANSCRIPT (use these facts to enrich bullets):
{chat_history}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR REWRITE INSTRUCTIONS:

FRAMEWORK: Apply the STAR principle to each bullet:
  → Situation/Context (optional, brief)
  → Action (strong verb + specific approach/tools)
  → Result (quantified impact — %, $, time, scale)

ATS OPTIMIZATION:
  - Embed keywords relevant to the target role and industry naturally
  - Use industry-standard terminology (not jargon)
  - Prioritize verbs that appear in top job descriptions for this role:
    (Architected, Implemented, Optimized, Designed, Led, Reduced, Scaled, Automated,
     Migrated, Deployed, Integrated, Developed, Launched, Streamlined, Drove)

BULLET QUALITY STANDARDS (each bullet must pass ALL of these):
  ✓ Starts with a strong past-tense action verb (never "I", "we", "Responsible for")
  ✓ Contains at least ONE specific technical detail (tool, framework, service, algorithm)
  ✓ Contains at least ONE quantified metric (%, number, scale, time, money) — use interview data
  ✓ Describes outcome or impact, not just the task
  ✓ Under 30 words — ruthlessly concise
  ✓ No passive voice ("was built", "was designed" → "Built", "Designed")
  ✓ No soft skill filler ("collaborated", "communicated", "worked closely")

STRICT RULES:
  - DO NOT hallucinate metrics not provided in original or interview
  - DO NOT change company name, title, or period
  - Maintain the same bullet count as the original entry
  - If interview provided a metric, use it. If not, keep the bullet factual but sharpen the verb and structure.
  - Each bullet must read differently — no repeated sentence structures or verbs

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Output schema (JSON only, no markdown):
{{
  "company": "same as input (or project name for projects)",
  "title": "same as input",
  "period": "same as input",
  "bullets": [
    "Rewritten bullet 1 — STAR-structured, metric-driven, ATS-optimized",
    "Rewritten bullet 2",
    ...
  ]
}}
"""


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

    prompt = _EVALUATE_ENTRY_PROMPT.format(
        user_context=ctx_str,
        entry_json=entry_str,
        entry_id=entry_id,
    )

    raw = await llm_client.generate_json(
        prompt=prompt,
        temperature=0.1,
        max_tokens=1500,
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
    achievements: Optional[List[str]] = None
) -> Dict:
    """
    Lightweight bulk scoring for background ImpactScoreBadge display.
    Returns: { "exp_0": {"score": 5.5, "reasons": [...]}, ... }
    """
    payload = _entries_to_score_payload(experience, projects, summary, achievements)
    if not payload:
        return {}

    prompt = _SCORE_PROMPT.format(entries_json=json.dumps(payload, indent=2))
    raw = await llm_client.generate_json(prompt=prompt, temperature=0.1, max_tokens=2048)

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

    prompt = _ENTRY_INTERVIEW_PROMPT.format(
        section=section,
        entry_json=json.dumps(entry, indent=2),
        chat_history=history_str,
        user_context=json.dumps(user_context or {}, indent=2),
        pre_identified_questions=questions_str,
    )

    raw = await llm_client.generate_json(prompt=prompt, temperature=0.4, max_tokens=512)

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

    prompt = _ENTRY_IMPROVE_PROMPT.format(
        target_role=ctx_fields["target_role"],
        target_companies=ctx_fields["target_companies"],
        seniority_level=ctx_fields["seniority_level"],
        industry=ctx_fields["industry"],
        entry_json=json.dumps(entry, indent=2),
        chat_history=transcript_str,
    )

    raw = await llm_client.generate_json(prompt=prompt, temperature=0.2, max_tokens=1200)

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

            llm_client = LLMClient(config)
            scores = await score_entries(llm_client, experience, projects, summary, achievements)

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
