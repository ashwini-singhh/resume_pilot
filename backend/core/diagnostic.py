"""
Global Competitive Diagnostic
Analyzes the entire resume MasterProfile against the UserContext to provide industry-standard feedback.
"""

import json
import logging
from typing import Dict, Any
from core.llm_client.llm_client import LLMClient

logger = logging.getLogger(__name__)

_GLOBAL_DIAGNOSTIC_PROMPT = """\
You are an elite Lead Technical Recruiter and Career Strategist at a top-tier tech company.
Your goal is to evaluate the candidate's ENTIRE resume against top-tier applicants for their target role and seniority.

Be brutally honest, specific, and incredibly analytical. Don't flatter the candidate. Give them the harsh truth about where they fall short.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

USER CONTEXT:
{user_context}

FULL RESUME PROFILE:
{profile_json}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

INSTRUCTIONS:
1. "competitiveness_score": Scale of 0.0 to 10.0 representing how this candidate compares to top FAANG / Tier 1 applicants.
2. "market_position": One of ["Top 5%", "Strong", "Average", "Below Average", "Weak"].
3. "executive_summary": 2 paragraphs. Brutally honest assessment of their profile's strength, narrative, and biggest glaring weakness.
4. "weak_areas": Identify 2-3 specific projects or experience entries that are weak, lacking scale, lacking metrics, or poorly framed. Explain exactly why they fail industry standards.
5. "missing_skills": 3-5 hard skills or technologies heavily demanded in their target role/industry that are currently missing from the resume.
6. "industry_trends": 2-3 current industry trends the candidate should align their profile with.

OUTPUT FORMAT (strict JSON only):
{{
  "competitiveness_score": 7.5,
  "market_position": "Average",
  "executive_summary": "Overall solid backend experience, but the resume reads like a list of tasks rather than achievements. The scale of systems is rarely mentioned. To compete for Senior roles at Tier 1 companies, you must completely reframe your impact around business outcomes, massive scale, and architectural leadership.",
  "weak_areas": [
    {{
      "area": "Cloud Spend Optimization (Tiger Analytics)",
      "issue": "Lacks specific $ or % saved, and does not mention the data volume or specific architectural changes made to reduce spend."
    }},
    {{
      "area": "Affiliate Aggregator (Project)",
      "issue": "Sounds like a junior side project. Missing user latency, concurrent requests, and specific cloud architecture details."
    }}
  ],
  "missing_skills": ["Kubernetes", "GraphQL", "System Design (Distributed)"],
  "industry_trends": ["Event-driven architectures using Kafka", "GenAI and LLMOps integration for backend engineers"]
}}
"""

async def run_global_diagnostic(llm_client: LLMClient, profile_data: Dict[str, Any], user_context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Runs the competitive diagnostic against the full profile and returns structured feedback.
    """
    ctx_str = json.dumps(user_context or {}, indent=2)
    profile_str = json.dumps(profile_data or {}, indent=2)

    prompt = _GLOBAL_DIAGNOSTIC_PROMPT.format(
        user_context=ctx_str,
        profile_json=profile_str
    )

    try:
        raw = await llm_client.generate_json(
            prompt=prompt,
            temperature=0.2,
            max_tokens=1500
        )
        
        if not isinstance(raw, dict):
            raise ValueError("LLM returned non-dict response")
            
        return {
            "competitiveness_score": round(float(raw.get("competitiveness_score", 5.0)), 1),
            "market_position": raw.get("market_position", "Average"),
            "executive_summary": raw.get("executive_summary", "Unable to generate summary."),
            "weak_areas": raw.get("weak_areas", []),
            "missing_skills": raw.get("missing_skills", []),
            "industry_trends": raw.get("industry_trends", [])
        }
    except Exception as e:
        logger.error(f"Global diagnostic failed: {e}")
        return {
            "competitiveness_score": 0.0,
            "market_position": "Error",
            "executive_summary": f"Diagnostic analysis failed: {str(e)}",
            "weak_areas": [],
            "missing_skills": [],
            "industry_trends": []
        }
