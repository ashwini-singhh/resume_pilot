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
You are a resume data extraction engineer. Your ONLY job is to parse raw resume text into structured JSON.

⚠️ ABSOLUTE RULE — COPY, DO NOT REWRITE:
- Copy ALL bullet points EXACTLY as written in the source text.
- DO NOT improve, rephrase, shorten, expand, or paraphrase any bullet.
- DO NOT add metrics, action verbs, or any content not present in the source.
- DO NOT "clean up" or "strengthen" language.
- Preserve the EXACT wording, including typos, abbreviations, and formatting.
- Bullets are sacred — they will be improved later in a separate step.

STRUCTURAL INSTRUCTIONS:

1. EXPERIENCE ENTRY STRUCTURE — READ THIS CAREFULLY:
   Many resumes use bold or italic sub-headings WITHIN a job role to group project clusters.
   
   PATTERN TO RECOGNIZE:
   ```
   Senior Software Engineer          Jul. 2022 – Present
   Tiger Analytics
   
   IoT Event Processing & Distributed Systems (AWS, EC2, SQS, DLQ)   ← this is a sub-heading (bold/italic)
     • Architected and scaled a high-throughput IoT ingestion platform...
     • Designed a decoupled, queue-backed architecture...
   
   Backend Engineering & Cloud Optimization (Python, GCP, BigQuery)   ← another sub-heading
     • Developed scalable backend services...
     • Implemented SQL-driven optimization algorithms...
   ```

   HOW TO PARSE THIS PATTERN:
   - The sub-headings (bold/italic lines that are NOT bullet points) → become "projects" entries NESTED inside that experience.
   - The bullet points BELOW each sub-heading → become "bullets" of that nested project.
   - The experience-level "bullets" array should only contain bullets that appear directly under the company/title, BEFORE any sub-heading.
   - If ALL bullets are grouped under sub-headings, the experience "bullets" array may be empty [].
   
   ❌ WRONG — treating sub-headings as bullets:
   "bullets": ["IoT Event Processing & Distributed Systems (AWS, EC2, SQS, DLQ)", "Backend Engineering..."]
   
   ✅ CORRECT — recognizing them as nested project names:
   "projects": [
     {"name": "IoT Event Processing & Distributed Systems (AWS, EC2, SQS, DLQ)", "bullets": ["Architected...", "Designed..."]},
     {"name": "Backend Engineering & Cloud Optimization (Python, GCP, BigQuery)", "bullets": ["Developed...", "Implemented..."]}
   ]

2. PROJECTS SECTION MAPPING:
   - TOP-LEVEL "projects" array: For any section in the resume explicitly titled "Projects", "Personal Projects", "Side Projects", or "Open Source".
   - DO NOT move entries from the "Projects" section into any experience entry.
   - DO NOT move entries from the "Projects" section into experience sub-projects.
   - The section-level heading ("PROJECTS", "EXPERIENCE") is the definitive signal — not dates or tech stack.

3. ACHIEVEMENTS: Include formal certificates, awards, honors, competition wins, and technical badges.
4. Deduplicate and group skills under logical categories. Skill names should be copied exactly.
5. Unify work history and education. If two sources describe the same company/role, merge without duplication.
6. DO NOT hallucinate any data not present in the source text.
7. Output strict JSON matching the schema below.
8. PDF SOURCE OF TRUTH: If PDF_RESUME_TEXT is provided, treat it as the highest-priority source. Its wording takes precedence over CURRENT_MASTER_PROFILE.

Output JSON Schema:
{
  "name": "Full Name",
  "summary": "Copy the summary/objective from the resume verbatim. If none, leave empty string.",
  "email": "Email address",
  "phone": "Phone",
  "location": "Location",
  "links": ["LinkedIn URL", "GitHub URL"],
  "skills": {
    "Category Name": ["Skill 1", "Skill 2"]
  },
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "period": "Date Range",
      "bullets": ["COPY VERBATIM from source — do not rewrite"],
      "projects": [
        {
          "name": "Project Name exactly as in source",
          "bullets": ["COPY VERBATIM from source — do not rewrite"]
        }
      ]
    }
  ],
  "projects": [
    {
      "name": "Project Name exactly as in source",
      "bullets": ["COPY VERBATIM from source — do not rewrite"]
    }
  ],
  "education": [
    {
      "school": "University name exactly as in source",
      "degree": "Degree exactly as in source",
      "period": "Date Range",
      "gpa": "GPA if present"
    }
  ],
  "achievements": ["Copy verbatim from source"],
  "section_order": ["Work Experience", "Projects", "Education", "Skills", "Achievements"]
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
            new_data["section_order"] = current_data.get("section_order", ["Work Experience", "Projects", "Education", "Skills", "Achievements"])
            
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
