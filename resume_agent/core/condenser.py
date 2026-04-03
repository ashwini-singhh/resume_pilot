import json
import logging
from typing import Dict, Any, Optional

from core.models import MasterProfile
from core.llm_provider import LLMClient
from core.resume_db import engine
from sqlmodel import Session, select

from agent.agent import Agent
from config.config import Config

logger = logging.getLogger(__name__)

CONDENSE_PROMPT = """
You are an expert technical recruiter and resume data engineer.
Your goal is to parse and merge raw data from multiple sources (Uploaded Resume, GitHub Profile, Manual Input) into a single, highly structured, canonical Master Profile JSON.

CRITICAL INSTRUCTIONS:
1. Deduplicate skills (e.g. merge "React" and "React.js"). Group them under logical categories (e.g., "Programming Languages", "Databases", "Frameworks & Libraries", "Soft Skills").
2. Unify work history and education. If there are duplicates between the raw resume and current master profile, intelligently merge them without losing details.
3. DO NOT hallucinate. Only include facts present in the provided raw data.
4. Keep the text professional and concise.
5. Output strict JSON matching the exact schema below. Do NOT wrap in markdown blocks, just return raw JSON.

Output JSON Schema:
{
  "name": "Full Name",
  "email": "Email address",
  "phone": "Phone (or empty)",
  "location": "Location (or empty)",
  "links": ["LinkedIn URL", "GitHub URL", ...],
  "skills": {
    "Category Name (e.g. Languages)": ["Skill 1", "Skill 2"]
  },
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "period": "Date Range",
      "bullets": ["Achievement 1", "Achievement 2"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "bullets": ["Detail 1", "Detail 2"]
    }
  ],
  "education": [
    {
      "school": "University",
      "degree": "Degree",
      "period": "Date Range",
      "gpa": "GPA (or empty)"
    }
  ],
  "certifications": ["Cert 1", "Cert 2"]
}

RAW DATA SOURCES TO MERGE:
"""

def condense_sources_into_profile(
    agent : Agent | None = None,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
    current_profile: Optional[Dict] = None,
) -> Dict[Any, Any]:
    
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
    merged_json = agent.parse_content(
        content=prompt
    )
    
    if not merged_json:
        logger.error("Failed to parse JSON from LLM")
        return current_profile or {}
        
    return merged_json

def trigger_condensation_and_save(
    config: Config,
    user_id: int,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
) -> Dict:
    with Session(engine) as session:
        profile = session.exec(select(MasterProfile).where(MasterProfile.user_id == user_id)).first()
        current_data = profile.data if profile else {}
        agent = Agent(config)
        new_data = condense_sources_into_profile(
            agent = agent,
            pdf_text=pdf_text,
            github_data=github_data,
            manual_data=manual_data,
            current_profile=current_data
        )
        print('LLM generated JSON: ',new_data)
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
