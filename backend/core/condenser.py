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
from prompts.extraction import RESUME_EXTRACTOR_PROMPT

from core.llm_client.llm_client import LLMClient
from agent.agent import Agent
from config.config import Config

logger = logging.getLogger(__name__)



async def condense_sources_into_profile(
    agent: Agent,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
    current_profile: Optional[Dict] = None,
    user_context: Optional[Dict] = None,
    primary_client: Optional[LLMClient] = None,
    user_id: str = "guest",
    run_id: Optional[str] = None
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

    prompt = RESUME_EXTRACTOR_PROMPT + "\n" + json.dumps(payload, indent=2)

    logger.info("Triggering LLM Condensation Pipeline...")
    # agent now takes client in __init__, so no changes here needed if we pass client to Agent ctor
    merged_json = await agent.parse_content(
        content=prompt, 
        user_context=user_context,
        user_id=user_id,
        feature="resume_condensation",
        run_id=run_id
    )
    return merged_json


async def trigger_condensation_and_save(
    config: Config,
    user_id: str,
    context_id: int,
    pdf_text: Optional[str] = None,
    github_data: Optional[Dict] = None,
    manual_data: Optional[Dict] = None,
    llm_client: Optional[LLMClient] = None,
    run_id: Optional[str] = None
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
        
        agent = Agent(config, llm_client=llm_client)
        new_data = await condense_sources_into_profile(
            agent=agent,
            pdf_text=pdf_text,
            github_data=github_data,
            manual_data=manual_data,
            current_profile=current_data,
            user_context=user_context_dict,
            primary_client=llm_client,
            user_id=user_id,
            run_id=run_id
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
