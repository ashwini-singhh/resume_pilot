"""
Formatter Module
Combines optimized bullets into a final resume output.
Generates change logs and diff views.
"""

from typing import List, Dict, Tuple


def format_final_resume(
    original_sections: Dict[str, List[str]],
    optimized_results: List[Dict],
) -> str:
    """
    Combine optimized bullets into a clean final resume.
    Replaces original bullets with their optimized versions where applicable.
    """
    # Build a lookup from original bullet to optimized version
    optimization_map = {}
    for result in optimized_results:
        original = result.get("original", "")
        modified = result.get("modified", original)
        if original:
            optimization_map[original] = modified

    # Rebuild resume sections
    output_lines = []

    for section_name, bullets in original_sections.items():
        output_lines.append(f"\n{'=' * 50}")
        output_lines.append(f"  {section_name.upper()}")
        output_lines.append(f"{'=' * 50}\n")

        for bullet in bullets:
            optimized = optimization_map.get(bullet, bullet)
            output_lines.append(f"  • {optimized}")

        output_lines.append("")

    return "\n".join(output_lines)


def format_bullets_only(optimized_results: List[Dict]) -> str:
    """Format only the optimized bullet list."""
    lines = []
    for i, result in enumerate(optimized_results, 1):
        modified = result.get("modified", result.get("original", ""))
        lines.append(f"  {i}. {modified}")
    return "\n".join(lines)


def generate_change_log(optimized_results: List[Dict]) -> List[Dict]:
    """
    Generate a structured change log showing all modifications.
    """
    changes = []

    for result in optimized_results:
        original = result.get("original", "")
        modified = result.get("modified", original)
        keywords = result.get("keywords_added", [])
        change_type = result.get("change_type", "none")

        was_modified = original != modified and change_type != "none"

        changes.append({
            "original": original,
            "modified": modified,
            "was_modified": was_modified,
            "keywords_added": keywords,
            "change_type": change_type,
            "confidence": result.get("confidence", 0.0),
        })

    return changes


def generate_diff_pairs(
    optimized_results: List[Dict],
) -> List[Tuple[str, str, List[str], bool]]:
    """
    Generate (original, modified, keywords, was_changed) tuples for diff display.
    """
    pairs = []
    for result in optimized_results:
        original = result.get("original", "")
        modified = result.get("modified", original)
        keywords = result.get("keywords_added", [])
        was_changed = (
            original != modified
            and result.get("change_type", "none") != "none"
        )
        pairs.append((original, modified, keywords, was_changed))
    return pairs


def compute_optimization_stats(optimized_results: List[Dict]) -> Dict:
    """
    Compute summary statistics for the optimization run.
    """
    total = len(optimized_results)
    modified_count = sum(
        1
        for r in optimized_results
        if r.get("change_type", "none") != "none"
        and r.get("original") != r.get("modified")
    )
    unchanged_count = total - modified_count

    all_keywords = []
    for r in optimized_results:
        all_keywords.extend(r.get("keywords_added", []))

    avg_confidence = 0.0
    if total > 0:
        avg_confidence = sum(
            r.get("confidence", 0.0) for r in optimized_results
        ) / total

    return {
        "total_bullets": total,
        "modified": modified_count,
        "unchanged": unchanged_count,
        "modification_rate": round(modified_count / max(total, 1) * 100, 1),
        "total_keywords_injected": len(all_keywords),
        "unique_keywords_injected": len(set(all_keywords)),
        "average_confidence": round(avg_confidence, 3),
    }
