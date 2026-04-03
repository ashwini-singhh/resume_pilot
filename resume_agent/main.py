"""
Resume AI Pipeline — Main Entry Point (v2)
Orchestrates the full resume optimization pipeline.
"""

import sys
import json
import os
import logging
from typing import Dict, List, Optional

from core.parser import extract_bullets, extract_sections
from core.github import fetch_github_profile, extract_github_keywords
from core.matcher import (
    extract_jd_keywords,
    match_bullets_to_keywords,
    compute_keyword_coverage,
    get_optimization_candidates,
)
from core.llm_provider import LLMClient
from core.optimizer import optimize_bullets_batch, apply_decisions
from core.formatter import compute_optimization_stats

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_pipeline(
    resume_text: str,
    job_description: str,
    api_key: str,
    provider: str = "gemini",
    base_url: str = "",
    model: str = "",
    github_url: Optional[str] = None,
) -> Dict:
    """Run the full pipeline with a generic LLM provider."""

    logger.info("=" * 60)
    logger.info("  RESUME AI PIPELINE v2 — Starting")
    logger.info("=" * 60)

    # Step 1: Parse
    bullets = extract_bullets(resume_text)
    sections = extract_sections(resume_text)
    logger.info(f"Step 1: Parsed {len(bullets)} bullets, {len(sections)} sections")

    # Step 2: JD keywords
    jd_keywords = extract_jd_keywords(job_description)
    logger.info(f"Step 2: Found {len(jd_keywords)} keywords")

    # Step 3: GitHub
    github_data = None
    if github_url:
        github_data = fetch_github_profile(github_url)
        logger.info(f"Step 3: GitHub profile fetched")

    # Step 4: Match
    match_results = match_bullets_to_keywords(bullets, jd_keywords)
    coverage = compute_keyword_coverage(bullets, jd_keywords)
    candidates = get_optimization_candidates(match_results)
    logger.info(f"Step 4: Coverage {coverage['coverage_percentage']}%, {len(candidates)} candidates")

    # Step 5: Optimize
    client = LLMClient(api_key=api_key, base_url=base_url, model=model, provider=provider)
    target_kw = coverage.get("uncovered_keywords", [])[:15]
    optimized = optimize_bullets_batch(
        client, [c["bullet"] for c in candidates], target_kw
    )
    logger.info(f"Step 5: Optimized {len(optimized)} bullets")

    # Step 6: Format
    stats = compute_optimization_stats(optimized)
    final_resume = apply_decisions(optimized, sections)

    logger.info("=" * 60)
    logger.info(f"  DONE — {stats['modified']}/{stats['total_bullets']} modified")
    logger.info("=" * 60)

    return {
        "bullets": bullets,
        "sections": sections,
        "jd_keywords": jd_keywords,
        "coverage": coverage,
        "suggestions": optimized,
        "final_resume": final_resume,
        "stats": stats,
    }


if __name__ == "__main__":
    print("Resume AI Pipeline v2")
    print("Use `streamlit run ui/app.py` for the interactive UI.")
    print()
    print("Supported providers: gemini, openai, groq, together, ollama, custom")
