import json
import logging
from typing import Dict, Any
from core.llm_client.llm_client import LLMClient
from prompts.improvement import GENERATE_SUMMARY_PROMPT, GENERATE_SKILLS_PROMPT

logger = logging.getLogger(__name__)

async def generate_section_content(llm_client: LLMClient, section: str, profile_data: Dict[str, Any], user_context: Dict[str, Any]) -> Any:
    """
    Generates content for standard resume sections (Summary, Skills).
    Returns the raw generated value depending on the section type.
    """
    ctx_str = json.dumps(user_context or {}, indent=2)
    # Give the LLM just the meat of the resume to infer from
    mini_profile = {
        "experience": profile_data.get("experience", []),
        "projects": profile_data.get("projects", []),
        "education": profile_data.get("education", [])
    }
    profile_str = json.dumps(mini_profile, indent=2)

    if section == "summary":
        prompt = GENERATE_SUMMARY_PROMPT.format(user_context=ctx_str, profile_json=profile_str)
        try:
            raw = await llm_client.generate_json(prompt=prompt, temperature=0.4, max_tokens=300)
            return raw.get("content", "")
        except Exception as e:
            logger.error(f"Generate Summary failed: {e}")
            raise

    elif section == "skills":
        prompt = GENERATE_SKILLS_PROMPT.format(user_context=ctx_str, profile_json=profile_str)
        try:
            raw = await llm_client.generate_json(prompt=prompt, temperature=0.1, max_tokens=400)
            return raw.get("content", {})
        except Exception as e:
            logger.error(f"Generate Skills failed: {e}")
            raise
    else:
        raise ValueError(f"Unknown section to generate: {section}")
