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
1. NESTED PROJECTS:
   - "experience" entries should contain a "projects" array for specific, named projects worked on DURING that tenure.
2. CERTIFICATIONS & ACHIEVEMENTS:
   - "certifications" SHOULD include: Formal certificates, Awards, Honors, Competition wins (e.g. "Runner up in..."), and technical badges (e.g. "3-star Leetcode").
3. Deduplicate and group skills under logical categories.
4. Unify work history and education. Merge duplicates intelligently.
5. DO NOT hallucinate.
6. Output strict JSON matching the schema below.

Output JSON Schema:
{
  "name": "Full Name",
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
    merged_json = await agent.parse_content(content=prompt)

    if not merged_json:
        logger.error("Failed to parse JSON from LLM")
        return current_profile or {}

    return merged_json


async def trigger_condensation_and_save(
    config: Config,
    user_id: int,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
) -> Dict:
    """
    Creates an Agent from Config, loads the existing MasterProfile from DB,
    runs condense_sources_into_profile, and persists the result.
    """
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
        current_data = profile.data if profile else {}
        agent = Agent(config)
        new_data = await condense_sources_into_profile(
            agent=agent,
            pdf_text=pdf_text,
            github_data=github_data,
            manual_data=manual_data,
            current_profile=current_data
        )
        
        # CRITICAL: Preserve section_order if LLM missed it or it existed before
        if "section_order" not in new_data or not new_data["section_order"]:
            new_data["section_order"] = current_data.get("section_order", ["Work Experience", "Projects", "Education", "Skills", "Certifications"])
            
        print('LLM generated JSON (with section_order): ', new_data)
        if profile:
            profile.data = new_data
            session.add(profile)
        else:
            profile = MasterProfile(user_id=user_id, data=new_data)
            session.add(profile)

        session.commit()
        return new_data


def save_profile_to_db(user_id: int, profile_data: Dict) -> None:
    """Save a manually curated profile back to the MasterProfile table."""
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
        if profile:
            profile.data = profile_data
            session.add(profile)
        else:
            profile = MasterProfile(user_id=user_id, data=profile_data)
            session.add(profile)
        session.commit()
