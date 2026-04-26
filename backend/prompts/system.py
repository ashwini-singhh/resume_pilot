from datetime import datetime
from typing import Optional, Dict

from prompts.base import SYSTEM_COMMON
def get_prompt_user_profile_generation(user_context: dict = None) -> str:
    parts = []
    
    # Use the localized system common prompt
    parts.append(SYSTEM_COMMON)
    
    parts.append(f"Current Date: {datetime.now().strftime('%Y-%m-%d')}")
    
    if user_context:
        onboarding = user_context.get("onboarding_context") or {}
        chat = user_context.get("chat_context") or {}

        context_str = f"""
--------------------------------------------------
👤 USER CONTEXT
--------------------------------------------------
Experience Level: {onboarding.get('experience_level')}
Target Roles: {', '.join(onboarding.get('target_roles', []))}
Primary Skills: {', '.join(onboarding.get('primary_skills', []))}
Preferred Industries: {', '.join(onboarding.get('industries', []))}
Primary Goal: {onboarding.get('goals')}
"""
        if chat:
            context_str += f"""
Additional Chat Context:
{chat}
"""
        context_str += """
Use this context to:
1. Tailor the tone and weight of experience (e.g., focus more on academic projects for 'Student' level).
2. Emphasize skills and roles aligned with the user's target.
3. Ensure the summary and highlights align with the user's career goal.
"""
        parts.append(context_str)
    
    return "\n".join(parts)