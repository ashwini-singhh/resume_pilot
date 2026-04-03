"""
Reusable UI components — skill tags and diff rendering.
"""
from difflib import SequenceMatcher
from typing import Dict, List


def render_skill_tags(skills_dict: Dict[str, List[str]]) -> str:
    """Render skill categories with tag chips."""
    html = ""
    for category, tags in skills_dict.items():
        html += f'<div class="tag-cat">{category}</div>'
        html += "".join(f'<span class="tag">{t}</span>' for t in tags)
    return html


def word_diff_html(original: str, modified: str) -> str:
    """Compute word-level inline diff HTML for the resume document."""
    orig_words = original.split()
    mod_words = modified.split()
    sm = SequenceMatcher(None, orig_words, mod_words)
    parts = []
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            parts.append(" ".join(mod_words[j1:j2]))
        elif tag == "replace":
            parts.append('<span class="r-inline-rm">' + " ".join(orig_words[i1:i2]) + "</span>")
            parts.append('<span class="r-inline-add">' + " ".join(mod_words[j1:j2]) + "</span>")
        elif tag == "delete":
            parts.append('<span class="r-inline-rm">' + " ".join(orig_words[i1:i2]) + "</span>")
        elif tag == "insert":
            parts.append('<span class="r-inline-add">' + " ".join(mod_words[j1:j2]) + "</span>")
    return " ".join(parts)
