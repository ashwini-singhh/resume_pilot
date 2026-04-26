import json
import logging
from typing import List, Dict, Any, Optional
from core.llm_client.llm_client import LLMClient
from prompts.interview import INTERVIEW_AGENT_PROMPT

logger = logging.getLogger(__name__)

async def run_interview_turn(
    primary_client: LLMClient,
    cheap_client: LLMClient,
    user_context: Dict[str, Any],
    profile_json: Dict[str, Any],
    section_type: str,
    chat_history: List[Dict[str, str]],
    user_id: str = "guest",
    run_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes a single turn of the Interview Agent with adaptive model escalation.
    
    - First turn (initial question): Uses cheap_client.
    - Deep-dive / follow-ups: Uses primary_client for high-fidelity reasoning.
    - Final result phase: Always uses primary_client for top-tier bullet generation.
    """
    
    # Format chat history for the prompt
    history_str = ""
    for msg in chat_history:
        role = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
        history_str += f"{role}: {msg.get('content', '')}\n"
    
    if not history_str:
        history_str = "(Interview session just started)"

    # Format user_context and profile_json for the prompt
    ctx_str = json.dumps(user_context or {}, indent=2)
    profile_str = json.dumps(profile_json or {}, indent=2)

    # Extract target role & company from onboarding context for dynamic prompt personalisation
    target_roles_raw = user_context.get("target_roles", [])
    target_roles = (
        ", ".join(target_roles_raw) if isinstance(target_roles_raw, list) and target_roles_raw
        else str(target_roles_raw) if target_roles_raw
        else "the target role"
    )
    target_companies_raw = user_context.get("target_companies", [])
    target_companies = (
        ", ".join(target_companies_raw) if isinstance(target_companies_raw, list) and target_companies_raw
        else str(target_companies_raw) if target_companies_raw
        else "top product-based companies"
    )

    # Use manual replacement to avoid KeyError with literal braces in JSON data
    prompt = INTERVIEW_AGENT_PROMPT
    prompt = prompt.replace("{user_context}", ctx_str)
    prompt = prompt.replace("{profile_json}", profile_str)
    prompt = prompt.replace("{section_type}", section_type)
    prompt = prompt.replace("{chat_history}", history_str)
    prompt = prompt.replace("{target_roles}", target_roles)
    prompt = prompt.replace("{target_companies}", target_companies)

    # DETERMINISTIC ESCALATION LOGIC
    # Turn 1 (history length 0) -> Cheap
    # Turn 2+ OR heavy reasoning needed -> Heavy
    is_first_turn = len(chat_history) == 0
    client_to_use = cheap_client if is_first_turn else primary_client
    
    model_tag = "LIGHT" if is_first_turn else "HEAVY"
    logger.info(f"Running Interview Agent turn [{model_tag}] for section: {section_type}")
    
    # Generate structured JSON from the LLM
    try:
        result = await client_to_use.generate_json(
            prompt=prompt,
            temperature=0.3, # Low temp for deterministic interview behavior
            max_tokens=1000,
            user_id=user_id,
            feature="interview_agent",
            run_id=run_id
        )
        
        if not isinstance(result, dict):
             raise ValueError("LLM did not return a valid JSON object")
             
        # Add internal metadata for log verification
        result["_model_used"] = client_to_use.model_name
             
        return result

    except Exception as e:
        logger.error(f"Interview Agent turn failed: {str(e)}")
        # Fallback question if everything fails
        return {
            "type": "question",
            "question": "I encountered a technical error. Could you re-summarize your core responsibilities and the tools used in this role?"
        }
