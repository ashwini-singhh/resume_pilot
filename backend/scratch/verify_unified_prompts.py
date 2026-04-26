import json
import sys
import os

# Ensure relative imports work
sys.path.append(".")

from prompts.system import get_prompt_user_profile_generation
from core.condenser import condense_sources_into_profile
from agent.agent import Agent
from config.config import Config

def verify_system_prompt():
    print("--- Verifying System Prompt (Context only) ---")
    user_context = {
        "onboarding_context": {
            "experience_level": "Senior",
            "target_roles": ["Staff Engineer"],
            "primary_skills": ["Python", "AWS"],
            "industries": ["Fintech"],
            "goals": "Leadership"
        }
    }
    prompt = get_prompt_user_profile_generation(user_context=user_context)
    print(prompt)
    if "RESUME_EXTRACTOR_PROMPT" in prompt or "RESUME_PARSING_PROMPT" in prompt:
        print("\n❌ FAILURE: System prompt still contains extraction instructions!")
    else:
        print("\n✅ SUCCESS: System prompt is pure context.")

async def verify_condenser_prompt():
    print("\n--- Verifying Condenser Assembly ---")
    # Mocking agent for extraction
    class MockConfig:
        api_key = "test"
        base_url = "test"
        model_name = "test"
    
    config = MockConfig()
    agent = Agent(config)
    
    # We want to see the prompt that reaches Agent.parse_content
    # I'll monkeypatch Agent.parse_content temporarily
    original_parse = agent.parse_content
    final_prompt = ""
    
    async def mock_parse(content, user_context=None):
        nonlocal final_prompt
        system_prompt = get_prompt_user_profile_generation(user_context=user_context)
        final_prompt = f"{system_prompt}\n----\n{content}"
        return {"status": "mocked"}
    
    agent.parse_content = mock_parse
    
    await condense_sources_into_profile(
        agent=agent,
        pdf_text="My Resume Text",
        user_context={"onboarding_context": {"experience_level": "Senior"}}
    )
    
    print("FINAL ASSEMBLED PROMPT PREVIEW (TOP 500 chars):")
    print(final_prompt[:500] + "...")
    
    # Check for flat schema presence
    if '"location": "City, State, Country"' in final_prompt:
        print("\n✅ SUCCESS: Flat schema found in final prompt.")
    else:
        print("\n❌ FAILURE: Flat schema missing from final prompt.")

if __name__ == "__main__":
    import asyncio
    verify_system_prompt()
    asyncio.run(verify_condenser_prompt())
