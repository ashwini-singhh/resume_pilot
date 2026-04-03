"""
Keyword Matcher Module
Matches resume bullets against job description keywords.
Ranks bullets by relevance and identifies keyword gaps.
"""

import re
from typing import List, Dict, Tuple
from collections import Counter


def extract_jd_keywords(job_description: str) -> List[str]:
    """
    Extract meaningful keywords from a job description.
    Filters out stop words and common filler terms.
    Returns keywords sorted by frequency (most common first).
    """
    # Normalize text
    text = job_description.lower()

    # Remove special characters but keep hyphens for compound words
    text = re.sub(r"[^a-z0-9\s\-+#.]", " ", text)

    # Split into tokens
    tokens = text.split()

    # Filter out stop words and short tokens
    stop_words = _get_stop_words()
    filtered = [
        t.strip(".-")
        for t in tokens
        if t.strip(".-") not in stop_words
        and len(t.strip(".-")) > 1
        and not t.strip(".-").isdigit()
    ]

    # Count frequencies
    counter = Counter(filtered)

    # Extract multi-word phrases (bigrams)
    bigrams = _extract_bigrams(job_description)
    for bigram, count in bigrams.items():
        counter[bigram] = count

    # Sort by frequency, return unique keywords
    sorted_keywords = sorted(counter.items(), key=lambda x: x[1], reverse=True)

    # Return top keywords (deduplicated)
    seen = set()
    result = []
    for keyword, freq in sorted_keywords:
        if keyword not in seen and freq >= 1:
            seen.add(keyword)
            result.append(keyword)

    return result[:50]  # Cap at top 50 keywords


def match_bullets_to_keywords(
    bullets: List[str], keywords: List[str]
) -> List[Dict]:
    """
    Match each resume bullet against JD keywords.
    Returns a list of dicts with bullet, matched keywords, missing keywords, and score.
    """
    results = []

    for bullet in bullets:
        bullet_lower = bullet.lower()
        matched = []
        missing = []

        for kw in keywords[:30]:  # Focus on top 30 keywords
            if kw.lower() in bullet_lower:
                matched.append(kw)
            else:
                missing.append(kw)

        # Calculate relevance score
        score = len(matched) / max(len(keywords[:30]), 1)

        results.append({
            "bullet": bullet,
            "matched_keywords": matched,
            "missing_keywords": missing[:10],  # Top 10 missing
            "relevance_score": round(score, 3),
            "match_count": len(matched),
        })

    # Sort by relevance score descending
    results.sort(key=lambda x: x["relevance_score"], reverse=True)

    return results


def compute_keyword_coverage(
    bullets: List[str], keywords: List[str]
) -> Dict:
    """
    Compute overall keyword coverage across all resume bullets.
    Returns coverage stats and lists of covered/uncovered keywords.
    """
    all_text = " ".join(bullets).lower()

    covered = []
    uncovered = []

    for kw in keywords:
        if kw.lower() in all_text:
            covered.append(kw)
        else:
            uncovered.append(kw)

    total = max(len(keywords), 1)
    coverage_pct = round(len(covered) / total * 100, 1)

    return {
        "total_keywords": len(keywords),
        "covered": len(covered),
        "uncovered": len(uncovered),
        "coverage_percentage": coverage_pct,
        "covered_keywords": covered,
        "uncovered_keywords": uncovered,
    }


def get_optimization_candidates(
    match_results: List[Dict], top_n: int = 10
) -> List[Dict]:
    """
    Identify the best candidates for optimization.
    These are bullets with moderate match scores that can benefit from keyword injection.
    """
    # Filter bullets that have some relevance but room for improvement
    candidates = [
        r for r in match_results
        if 0.0 <= r["relevance_score"] <= 0.8 and r["missing_keywords"]
    ]

    # Sort by potential impact (bullets with some matches + missing keywords)
    candidates.sort(
        key=lambda x: (x["match_count"], -len(x["missing_keywords"])),
        reverse=True,
    )

    return candidates[:top_n]


def _extract_bigrams(text: str) -> Dict[str, int]:
    """Extract meaningful two-word phrases from text."""
    text_lower = text.lower()
    text_clean = re.sub(r"[^a-z0-9\s\-+#.]", " ", text_lower)
    words = text_clean.split()
    stop_words = _get_stop_words()

    bigrams: Dict[str, int] = {}
    for i in range(len(words) - 1):
        w1, w2 = words[i].strip(".-"), words[i + 1].strip(".-")
        if w1 not in stop_words and w2 not in stop_words and len(w1) > 1 and len(w2) > 1:
            bigram = f"{w1} {w2}"
            bigrams[bigram] = bigrams.get(bigram, 0) + 1

    # Only return bigrams that appear more than once or are high-value
    return {k: v for k, v in bigrams.items() if v >= 2}


def _get_stop_words() -> set:
    """Return a set of common English stop words."""
    return {
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
        "being", "have", "has", "had", "do", "does", "did", "will", "would",
        "could", "should", "may", "might", "shall", "can", "must", "need",
        "this", "that", "these", "those", "it", "its", "i", "you", "we",
        "they", "he", "she", "my", "your", "our", "their", "his", "her",
        "as", "if", "not", "no", "so", "up", "out", "about", "into",
        "over", "after", "under", "between", "through", "during", "before",
        "while", "than", "then", "also", "just", "more", "most", "very",
        "all", "each", "every", "both", "few", "some", "any", "other",
        "such", "only", "own", "same", "well", "us", "etc", "able",
        "across", "within", "including", "using", "work", "working",
        "related", "required", "preferred", "experience", "years", "role",
        "position", "team", "company", "job", "strong", "looking",
        "responsibilities", "requirements", "qualifications", "join",
        "apply", "candidate", "ideal", "plus", "bonus", "new", "best",
        "good", "great", "excellent", "ability", "skills", "knowledge",
    }
