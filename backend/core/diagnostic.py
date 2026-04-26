"""
Global Competitive Diagnostic
Analyzes the entire resume MasterProfile against the UserContext to provide industry-standard feedback.
"""

import json
import logging
from typing import Dict, Any, Optional
from core.llm_client.llm_client import LLMClient
from prompts.diagnostics import GLOBAL_DIAGNOSTIC_PROMPT

logger = logging.getLogger(__name__)


async def run_global_diagnostic(
    llm_client: LLMClient, 
    profile_data: Dict[str, Any], 
    user_context: Dict[str, Any],
    user_id: str = "guest",
    feature: str = "global_diagnostic",
    run_id: Optional[str] = None,
    fallback_client: Optional[LLMClient] = None
) -> Dict[str, Any]:
    """
    Runs the competitive diagnostic against the full profile and returns structured feedback.
    If the primary client fails, it attempts a fallback to a secondary client if provided.
    """
    ctx = user_context or {}
    ctx_str = json.dumps(ctx, indent=2)
    profile_str = json.dumps(profile_data or {}, indent=2)

    # Extract target role & company from onboarding context for dynamic prompt personalisation
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

    prompt = GLOBAL_DIAGNOSTIC_PROMPT.format(
        user_context=ctx_str,
        profile_json=profile_str,
        target_roles=target_roles,
        target_companies=target_companies,
    )

    try:
        raw = await llm_client.generate_json(
            prompt=prompt,
            temperature=0.2,
            max_tokens=1500,
            user_id=user_id,
            feature=feature,
            run_id=run_id
        )
        
        if not isinstance(raw, dict) or not raw:
            raise ValueError("LLM returned non-dict or empty response")
            
        return _format_diagnostic_response(raw)

    except Exception as e:
        logger.warning(f"Primary diagnostic LLM failed: {e}. Checking for fallback...")
        if fallback_client:
            try:
                logger.info(f"Retrying diagnostic with fallback model: {fallback_client.model_name}")
                raw_fallback = await fallback_client.generate_json(
                    prompt=prompt,
                    temperature=0.2,
                    max_tokens=1500,
                    user_id=user_id,
                    feature=f"{feature}_fallback",
                    run_id=run_id
                )
                if isinstance(raw_fallback, dict) and raw_fallback:
                    return _format_diagnostic_response(raw_fallback)
            except Exception as fe:
                logger.error(f"Fallback diagnostic also failed: {fe}")
        
        logger.error(f"Global diagnostic failed completely: {e}")
        return {
            "competitiveness_score": 0.0,
            "market_position": "Error",
            "executive_summary": f"Diagnostic analysis failed after fallback: {str(e)}",
            "weak_areas": [],
            "missing_skills": [],
            "industry_trends": []
        }

def _format_diagnostic_response(raw: Dict) -> Dict:
    """Helper to structure the raw JSON into the expected diagnostic format."""
    return {
        "competitiveness_score": round(float(raw.get("competitiveness_score", 5.0)), 1),
        "market_position": raw.get("market_position", "Average"),
        "executive_summary": raw.get("executive_summary", "Diagnostic complete."),
        "weak_areas": raw.get("weak_areas", []),
        "missing_skills": raw.get("missing_skills", []),
        "industry_trends": raw.get("industry_trends", [])
    }
