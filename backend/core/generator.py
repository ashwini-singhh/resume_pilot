import json
import logging
from typing import Dict, Any
from core.llm_client.llm_client import LLMClient

logger = logging.getLogger(__name__)

_GENERATE_SUMMARY_PROMPT = """\
You are an expert Executive Resume Writer.
Write a 3-sentence, high-impact Professional Summary tailored to the candidate's target role.

USER CONTEXT (Target Role & Industry):
{user_context}

CANDIDATE EXPERIENCE & PROJECTS:
{profile_json}

RULES:
1. First sentence: A powerful overarching statement of identity, years of experience, and main expertise.
2. Second sentence: Key architectural, technical, or leadership achievements with scale and impact.
3. Third sentence: What they excel at and what value they bring to their target role. 
4. DO NOT use first-person pronouns (I, me, my).
5. DO NOT exceed 4 sentences. Make it punchy and metrics-driven if possible.

OUTPUT: Return strictly JSON.
{{
  "content": "Resulting summary paragraph here..."
}}
"""

_GENERATE_SKILLS_PROMPT = """\
You are a Staff Technical Recruiter.
Given the candidate's work history, projects, and target role context, extract and categorize all technical skills into a clean JSON structure.

USER CONTEXT:
{user_context}

CANDIDATE EXPERIENCE & PROJECTS:
{profile_json}

RULES:
1. Read the experience and projects to find actual tools, languages, and frameworks the candidate knows.
2. Group them logically (e.g. "Languages", "Backend Frameworks", "Cloud & DevOps", "Databases").
3. Include 4 to 6 categories maximum.
4. DO NOT hallucinate skills that aren't implied or directly present in their work history.

OUTPUT: Return strictly JSON format for the Skills section.
{{
  "content": {{
    "Languages": ["Python", "Go", "JavaScript"],
    "Cloud & Infrastructure": ["AWS", "Docker", "Kubernetes"]
  }}
}}
"""

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
        prompt = _GENERATE_SUMMARY_PROMPT.format(user_context=ctx_str, profile_json=profile_str)
        try:
            raw = await llm_client.generate_json(prompt=prompt, temperature=0.4, max_tokens=300)
            return raw.get("content", "")
        except Exception as e:
            logger.error(f"Generate Summary failed: {e}")
            raise

    elif section == "skills":
        prompt = _GENERATE_SKILLS_PROMPT.format(user_context=ctx_str, profile_json=profile_str)
        try:
            raw = await llm_client.generate_json(prompt=prompt, temperature=0.1, max_tokens=400)
            return raw.get("content", {})
        except Exception as e:
            logger.error(f"Generate Skills failed: {e}")
            raise
    else:
        raise ValueError(f"Unknown section to generate: {section}")
