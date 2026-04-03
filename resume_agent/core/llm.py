"""
LLM Integration Module
Handles all interactions with the Gemini API using the google-genai SDK.
Loads prompts from centralized prompt files.
Returns structured JSON responses.
"""

import os
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

# Resolve paths relative to this file's location
_MODULE_DIR = Path(__file__).resolve().parent
_PROMPTS_DIR = _MODULE_DIR.parent / "prompts"


def _load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts directory."""
    prompt_path = _PROMPTS_DIR / filename
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8")


def _get_client() -> genai.Client:
    """Get a configured Gemini client using GEMINI_API_KEY env var."""
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError(
            "GEMINI_API_KEY environment variable is not set. "
            "Set it with: export GEMINI_API_KEY='your-key-here'"
        )
    return genai.Client(api_key=api_key)


# Model to use for all requests
_MODEL = "gemini-2.0-flash"


def optimize_bullet(bullet: str, keywords: List[str]) -> Dict:
    """
    Optimize a single resume bullet using Gemini.

    Args:
        bullet: The original resume bullet text
        keywords: List of target keywords to inject

    Returns:
        Dict with original, modified, keywords_added, change_type, confidence
    """
    prompt_template = _load_prompt("gemini_prompt.txt")
    system_prompt = _load_prompt("system_prompt.txt")

    # Format the prompt
    prompt = prompt_template.replace("{bullet}", bullet)
    prompt = prompt.replace("{keywords}", ", ".join(keywords))

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,
                top_p=0.8,
                max_output_tokens=1024,
            ),
        )

        # Parse JSON response
        result = _parse_json_response(response.text)

        if result:
            result = _validate_optimization_result(result, bullet)
            return result
        else:
            logger.warning("Failed to parse Gemini response, returning original")
            return _fallback_result(bullet)

    except Exception as e:
        logger.error(f"Gemini API error: {e}")
        return _fallback_result(bullet, error=str(e))


def optimize_bullets_batch(
    bullets: List[str], keywords: List[str]
) -> List[Dict]:
    """
    Optimize multiple resume bullets.
    Processes sequentially to respect API rate limits.
    """
    results = []
    for bullet in bullets:
        result = optimize_bullet(bullet, keywords)
        results.append(result)
    return results


def audit_modification(
    original: str, modified: str, keywords_added: List[str]
) -> Dict:
    """
    Audit a bullet modification for hallucinations and faithfulness.
    Uses the audit prompt template.
    """
    prompt_template = _load_prompt("audit_prompt.txt")
    system_prompt = _load_prompt("system_prompt.txt")

    prompt = prompt_template.replace("{original}", original)
    prompt = prompt.replace("{modified}", modified)
    prompt = prompt.replace("{keywords_added}", ", ".join(keywords_added))

    try:
        client = _get_client()
        response = client.models.generate_content(
            model=_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        result = _parse_json_response(response.text)

        if result:
            return result
        return {
            "is_faithful": True,
            "hallucination_detected": False,
            "excessive_rewrite": False,
            "issues": [],
            "audit_score": 0.5,
            "recommendation": "revise",
        }

    except Exception as e:
        logger.error(f"Audit API error: {e}")
        return {
            "is_faithful": True,
            "hallucination_detected": False,
            "issues": [f"Audit failed: {str(e)}"],
            "audit_score": 0.0,
            "recommendation": "revise",
        }


def _parse_json_response(response_text: str) -> Optional[Dict]:
    """
    Parse JSON from Gemini response.
    Handles cases where the response might contain markdown code blocks.
    """
    text = response_text.strip()

    # Remove markdown code block markers if present
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        json_match = _find_json_in_text(text)
        if json_match:
            try:
                return json.loads(json_match)
            except json.JSONDecodeError:
                pass

    logger.warning(f"Could not parse JSON from response: {text[:200]}")
    return None


def _find_json_in_text(text: str) -> Optional[str]:
    """Find a JSON object in a text string."""
    start = text.find("{")
    if start == -1:
        return None

    depth = 0
    for i in range(start, len(text)):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]

    return None


def _validate_optimization_result(result: Dict, original_bullet: str) -> Dict:
    """
    Validate and sanitize the optimization result.
    Ensures the result has the expected structure and hasn't hallucinated.
    """
    validated = {
        "original": result.get("original", original_bullet),
        "modified": result.get("modified", original_bullet),
        "keywords_added": result.get("keywords_added", []),
        "change_type": result.get("change_type", "none"),
        "confidence": result.get("confidence", 0.5),
    }

    # Safety check: if modified is drastically different, revert
    original_words = set(original_bullet.lower().split())
    modified_words = set(validated["modified"].lower().split())

    if original_words:
        overlap = len(original_words & modified_words) / len(original_words)
        if overlap < 0.5:
            logger.warning("Excessive modification detected, reverting to original")
            validated["modified"] = original_bullet
            validated["keywords_added"] = []
            validated["change_type"] = "none"
            validated["confidence"] = 0.0
            validated["warning"] = "Excessive modification detected — reverted"

    return validated


def _fallback_result(bullet: str, error: str = "") -> Dict:
    """Return a safe fallback result when the API fails."""
    result = {
        "original": bullet,
        "modified": bullet,
        "keywords_added": [],
        "change_type": "none",
        "confidence": 0.0,
    }
    if error:
        result["error"] = error
    return result
