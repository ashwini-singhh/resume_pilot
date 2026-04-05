"""
Condenser Module
Merges raw data (PDF, GitHub, Manual) into a Master Profile via Agent + LLM.
Exactly replicates the logic from resume_agent/core/condenser.py.
"""

import json
import logging
from typing import Dict, Any, Optional

from core.models import MasterProfile
from core.resume_db import engine
from sqlmodel import Session, select

from agent.agent import Agent
from config.config import Config

logger = logging.getLogger(__name__)

CONDENSE_PROMPT = """
You are an expert technical recruiter and resume data engineer.
Your goal is to parse and merge raw data from multiple sources into a single, highly structured, canonical Master Profile JSON.

CRITICAL INSTRUCTIONS:
1. NESTED PROJECTS (MANDATORY):
   - DO NOT return a single massive list of bullets for long tenures.
   - If the user has worked on distinct technical initiatives (e.g. "Rebuilt the ETL pipeline", "Migrated to Kubernetes"), you MUST group those into the "projects" array inside that experience entry.
   - Use the top-level "bullets" array ONLY for general duties.
   - This ensures Harvard-level clarity on impact.
2. CERTIFICATIONS & ACHIEVEMENTS:
   - "certifications" SHOULD include: Formal certificates, Awards, Honors, Competition wins (e.g. "Runner up in..."), and technical badges (e.g. "3-star Leetcode").
3. Deduplicate and group skills under logical categories.
4. Unify work history and education. Merge duplicates intelligently.
5. DO NOT hallucinate.
6. Output strict JSON matching the schema below.
7. PDF SOURCE OF TRUTH: If PDF_RESUME_TEXT is provided, it is the absolute source of truth for Education school names, degree titles, and years. Favor its accuracy over any existing data in CURRENT_MASTER_PROFILE for these details.

Output JSON Schema:
{
  "name": "Full Name",
  "summary": "High-impact 2-3 sentence professional summary.",
  "email": "Email address",
  "phone": "Phone",
  "location": "Location",
  "links": ["LinkedIn URL", "GitHub URL", ...],
  "skills": {
    "Category Name": ["Skill 1", "Skill 2"]
  },
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "period": "Date Range",
      "bullets": ["High-level responsibility/achievement"],
      "projects": [
        {
          "name": "Specific Project Name",
          "bullets": ["Project achievement with quantification"]
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Standalone Project Name",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "education": [
    {
      "school": "University",
      "degree": "Degree",
      "period": "Date Range",
      "gpa": "GPA"
    }
  ],
  "certifications": ["Certification, Award, or Achievement 1", "Achievement 2"],
  "section_order": ["Work Experience", "Projects", "Education", "Skills", "Certifications"]
}

RAW DATA SOURCES TO MERGE:
"""


async def condense_sources_into_profile(
    agent: Agent,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
    current_profile: Optional[Dict] = None,
    user_context: Optional[Dict] = None,
) -> Dict[Any, Any]:
    """
    Build a condensation prompt from raw sources, send to Agent.parse_content,
    and return the merged Master Profile JSON.
    """
    payload = {}
    if pdf_text:
        payload["PDF_RESUME_TEXT"] = pdf_text
    if github_data:
        payload["GITHUB_PROFILE"] = github_data
    if manual_data:
        payload["MANUAL_ADDITIONS"] = manual_data
    if current_profile:
        payload["CURRENT_MASTER_PROFILE"] = current_profile

    prompt = CONDENSE_PROMPT + "\n" + json.dumps(payload, indent=2)

    logger.info("Triggering LLM Condensation Pipeline...")
    merged_json = await agent.parse_content(content=prompt, user_context=user_context)

    if not merged_json:
        logger.error("Failed to parse JSON from LLM")
        return current_profile or {}

    return merged_json


async def trigger_condensation_and_save(
    config: Config,
    user_id: str,
    context_id: int,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
) -> Dict:
    """
    Creates an Agent from Config, loads the existing MasterProfile linked to context_id,
    runs condense_sources_into_profile, and persists the result.
    """
    with Session(engine) as session:
        from core.models import UserContext
        # Find the specific profile/context
        context = session.exec(select(UserContext).where(UserContext.id == context_id)).first()
        if not context:
            logger.error(f"No context found for context_id {context_id}")
            return {}
        
        # Find or create the MasterProfile for this specific context
        profile = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).first()
        
        user_context_dict = context.dict() if context else None
        current_data = profile.data if profile else {}
        
        agent = Agent(config)
        new_data = await condense_sources_into_profile(
            agent=agent,
            pdf_text=pdf_text,
            github_data=github_data,
            manual_data=manual_data,
            current_profile=current_data,
            user_context=user_context_dict
        )
        
        # Preserve section_order
        if "section_order" not in new_data or not new_data["section_order"]:
            new_data["section_order"] = current_data.get("section_order", ["Work Experience", "Projects", "Education", "Skills", "Certifications"])
            
        if profile:
            profile.data = new_data
        else:
            profile = MasterProfile(user_id=user_id, context_id=context_id, data=new_data)
        
        session.add(profile)
        session.commit()
        return new_data


def save_profile_to_db(user_id: str, context_id: int, profile_data: Dict) -> None:
    """Save profile data linked to a specific context id."""
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.context_id == context_id)).first()
        if profile:
            profile.data = profile_data
        else:
            profile = MasterProfile(user_id=user_id, context_id=context_id, data=profile_data)
        session.add(profile)
        session.commit()
