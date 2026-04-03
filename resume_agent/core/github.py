"""
GitHub Profile Module
Real GitHub API integration to fetch repos, READMEs, languages and topics,
then structure the data for LLM-powered condensation into resume format.
"""

import re
import base64
import logging
from typing import Dict, List, Optional, Tuple

import requests

logger = logging.getLogger(__name__)

GITHUB_API = "https://api.github.com"


# ── Public API ─────────────────────────────────────────────────────────────


def fetch_github_profile(
    github_url: str,
    token: Optional[str] = None,
    max_repos: int = 10,
    min_stars: int = 0,
    on_progress=None,          # callback(msg: str) for UI progress updates
) -> Optional[Dict]:
    """
    Fetch a GitHub profile and its top repositories.

    Returns a structured dict with:
      - username, profile_url, bio, followers, following
      - languages (aggregated across all repos)
      - topics (aggregated across all repos)
      - repos: list of {name, description, url, stars, language, topics, readme_text}
    """
    if not github_url or not github_url.strip():
        return None

    username = _extract_username(github_url)
    if not username:
        logger.warning("Could not extract GitHub username from: %s", github_url)
        return None

    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    # ── 1. Fetch user profile ──
    if on_progress:
        on_progress(f"Fetching profile for @{username}…")
    user = _get(f"{GITHUB_API}/users/{username}", headers)
    if not user:
        return None

    # ── 2. Fetch repositories ──
    if on_progress:
        on_progress("Fetching repositories…")
    repos_raw = _get(
        f"{GITHUB_API}/users/{username}/repos",
        headers,
        params={"per_page": 100, "sort": "updated", "type": "owner"},
    ) or []

    # Filter + rank by stars then last-updated
    repos_raw = [r for r in repos_raw if not r.get("fork", False)]
    repos_raw = sorted(repos_raw, key=lambda r: (r.get("stargazers_count", 0), r.get("updated_at", "")), reverse=True)
    repos_raw = [r for r in repos_raw if r.get("stargazers_count", 0) >= min_stars]
    repos_raw = repos_raw[:max_repos]

    # ── 3. Enrich each repo with language breakdown + README ──
    repos = []
    all_languages: Dict[str, int] = {}
    all_topics: List[str] = []

    for idx, repo in enumerate(repos_raw):
        name = repo["name"]
        if on_progress:
            on_progress(f"Reading repo {idx+1}/{len(repos_raw)}: {name}…")

        # Language bytes
        lang_data = _get(f"{GITHUB_API}/repos/{username}/{name}/languages", headers) or {}
        for lang, bytes_count in lang_data.items():
            all_languages[lang] = all_languages.get(lang, 0) + bytes_count

        # Topics
        topics = repo.get("topics", [])
        all_topics.extend(topics)

        # README
        readme_text = _fetch_readme(username, name, headers)

        repos.append({
            "name": name,
            "description": repo.get("description") or "",
            "url": repo.get("html_url", ""),
            "stars": repo.get("stargazers_count", 0),
            "language": repo.get("language") or "",
            "languages": list(lang_data.keys()),
            "topics": topics,
            "readme_text": readme_text,
        })

    # Build ranked language list (most bytes first)
    sorted_langs = sorted(all_languages.items(), key=lambda x: x[1], reverse=True)
    languages = [lang for lang, _ in sorted_langs]

    # Deduplicate topics
    seen: set = set()
    unique_topics = [t for t in all_topics if not (t in seen or seen.add(t))]  # type: ignore[func-returns-value]

    return {
        "username": username,
        "profile_url": github_url.strip(),
        "name": user.get("name") or username,
        "bio": user.get("bio") or "",
        "company": user.get("company") or "",
        "blog": user.get("blog") or "",
        "location": user.get("location") or "",
        "followers": user.get("followers", 0),
        "following": user.get("following", 0),
        "public_repos": user.get("public_repos", 0),
        "languages": languages,
        "topics": unique_topics,
        "repos": repos,
    }


def extract_github_keywords(profile_data: Optional[Dict]) -> List[str]:
    """
    Return a flat list of technical keywords: languages + topics.
    Usable as a quick skill gap input.
    """
    if not profile_data:
        return []

    kws = list(profile_data.get("languages", []))
    kws += profile_data.get("topics", [])

    seen: set = set()
    return [k for k in kws if k.lower() not in seen and not seen.add(k.lower())]  # type: ignore[func-returns-value]


def summarise_repo_for_resume(
    repo: Dict,
    llm_client,
    max_readme_chars: int = 3000,
) -> Dict:
    """
    Use the LLM to convert a single repo into a resume-ready project entry:
      { name, bullets: [str], skills: [str], link: {name, url} }

    The README is truncated to avoid excessive token usage.
    """
    from core.llm_provider import LLMClient  # local import to avoid circular

    readme_snippet = (repo.get("readme_text") or "")[:max_readme_chars]
    description = repo.get("description", "")
    topics = ", ".join(repo.get("topics", []))
    languages = ", ".join(repo.get("languages", []))

    prompt = f"""You are an expert technical resume writer.

Convert the following GitHub repository into a RESUME PROJECT ENTRY.

Repository Name: {repo['name']}
Description: {description}
Programming Languages: {languages}
Topics / Tags: {topics}
README (may be truncated):
---
{readme_snippet}
---

Output strict JSON only (no markdown fences):
{{
  "bullets": [
    "Strong action-verb achievement sentence (quantified if possible, ≤25 words)",
    "Second key achievement or technical highlight",
    "Third highlight if applicable"
  ],
  "skills": ["Skill1", "Skill2", "..."]
}}

Rules:
- bullets: 2–3 concise lines, start with strong verbs (Built, Designed, Implemented…)
- Do NOT include the repo name in bullets
- skills: only concrete technologies (languages, frameworks, tools) — no soft skills
- If the README is empty/minimal, use the description and languages only
- Output ONLY the JSON object, nothing else
"""
    result = llm_client.generate_json(prompt=prompt, temperature=0.2, max_tokens=600)
    if not result:
        # Fallback: minimal entry
        result = {
            "bullets": [description] if description else [f"Open-source project built with {languages}"],
            "skills": repo.get("languages", []),
        }
    result["name"] = repo["name"]
    result["link"] = {"name": "GitHub", "url": repo.get("url", "")}
    return result


# ── Internal helpers ────────────────────────────────────────────────────────


def _get(url: str, headers: Dict, params: Optional[Dict] = None):
    """GET a GitHub API endpoint; return parsed JSON or None on error."""
    try:
        resp = requests.get(url, headers=headers, params=params, timeout=15)
        if resp.status_code == 404:
            logger.warning("GitHub 404: %s", url)
            return None
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        logger.error("GitHub API error for %s: %s", url, exc)
        return None


def _fetch_readme(username: str, repo_name: str, headers: Dict) -> str:
    """Fetch and decode the README for a repo. Returns empty string if absent."""
    data = _get(f"{GITHUB_API}/repos/{username}/{repo_name}/readme", headers)
    if not data:
        return ""
    try:
        content = data.get("content", "")
        encoding = data.get("encoding", "base64")
        if encoding == "base64":
            decoded = base64.b64decode(content).decode("utf-8", errors="replace")
            # Strip markdown image/badge lines to keep signal-to-noise high
            lines = [l for l in decoded.splitlines() if not l.strip().startswith("[![")]
            return "\n".join(lines)
        return content
    except Exception as exc:
        logger.warning("Could not decode README for %s/%s: %s", username, repo_name, exc)
        return ""


def _extract_username(github_url: str) -> Optional[str]:
    """Extract GitHub username from various URL formats or bare usernames."""
    url = github_url.strip().rstrip("/")

    if "github.com/" in url:
        parts = url.split("github.com/")
        if len(parts) > 1:
            candidate = parts[1].split("/")[0].strip()
            if candidate and candidate not in ("", "orgs", "settings", "explore", "topics"):
                return candidate
    elif re.match(r"^[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,37}[a-zA-Z0-9])?$", url):
        # Bare username
        return url

    return None
