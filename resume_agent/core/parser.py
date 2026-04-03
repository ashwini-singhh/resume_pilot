"""
Resume Parser Module
Extracts structured sections and bullet points from raw resume text.
Supports both plain text and PDF file uploads.
"""

import re
import io
from typing import List, Dict, Optional, Tuple


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF file using PyMuPDF (fitz).
    Returns the full text content of the PDF.
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise ImportError(
            "PyMuPDF is required for PDF parsing. Install with: pip install PyMuPDF"
        )

    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    for page in doc:
        text_parts.append(page.get_text())
    doc.close()
    return "\n".join(text_parts)


def extract_bullets(resume_text: str) -> List[str]:
    """
    Extract bullet points from resume text.
    Identifies lines starting with -, •, *, or numbered patterns.
    Also captures indented content that appears to be bullet-like.
    """
    bullets = []
    lines = resume_text.strip().split("\n")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Match common bullet patterns
        bullet_patterns = [
            r"^[-•*]\s+(.+)",       # - bullet, • bullet, * bullet
            r"^\d+[.)]\s+(.+)",     # 1. bullet, 1) bullet
            r"^[a-zA-Z][.)]\s+(.+)",  # a. bullet, a) bullet
            r"^►\s+(.+)",           # ► bullet
            r"^▪\s+(.+)",           # ▪ bullet
            r"^○\s+(.+)",           # ○ bullet
        ]

        matched = False
        for pattern in bullet_patterns:
            match = re.match(pattern, stripped)
            if match:
                bullets.append(match.group(1).strip())
                matched = True
                break

        # If not a bullet but looks like a content line (not a header)
        if not matched and len(stripped) > 30 and not stripped.isupper():
            # Check if it's likely a bullet without a marker
            if not _is_section_header(stripped):
                bullets.append(stripped)

    return bullets


def extract_sections(resume_text: str) -> Dict[str, List[str]]:
    """
    Extract resume into named sections with their bullet points.
    Returns a dict like {"Experience": [...], "Education": [...]}
    """
    sections: Dict[str, List[str]] = {}
    current_section = "General"
    current_bullets: List[str] = []

    lines = resume_text.strip().split("\n")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if _is_section_header(stripped):
            # Save previous section
            if current_bullets:
                sections[current_section] = current_bullets
            current_section = _clean_header(stripped)
            current_bullets = []
        else:
            bullet = _extract_bullet_text(stripped)
            if bullet:
                current_bullets.append(bullet)

    # Save last section
    if current_bullets:
        sections[current_section] = current_bullets

    return sections


def get_full_text_with_markers(resume_text: str) -> List[Dict]:
    """
    Parse resume text into a structured list of items with type markers.
    Used for the resume viewer to render a document-like view.

    Returns list of dicts: {"type": "header"|"bullet"|"text", "content": str, "section": str}
    """
    items = []
    current_section = "General"
    lines = resume_text.strip().split("\n")

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if _is_section_header(stripped):
            current_section = _clean_header(stripped)
            items.append({"type": "header", "content": stripped, "section": current_section})
        else:
            bullet_text = _extract_bullet_text(stripped)
            if bullet_text:
                items.append({"type": "bullet", "content": bullet_text, "section": current_section})
            elif len(stripped) > 5:
                items.append({"type": "text", "content": stripped, "section": current_section})

    return items


def _is_section_header(text: str) -> bool:
    """Determine if a line is a section header."""
    common_headers = [
        "experience", "education", "skills", "projects", "summary",
        "objective", "certifications", "awards", "publications",
        "professional experience", "work experience", "technical skills",
        "core competencies", "achievements", "volunteer", "interests",
        "professional summary", "career summary", "qualifications",
    ]

    cleaned = re.sub(r"[^a-zA-Z\s]", "", text).strip().lower()

    # Check against common headers
    if cleaned in common_headers:
        return True

    # Headers are typically short and may be uppercase
    if len(text) < 40 and (text.isupper() or text.istitle()):
        if not any(char in text for char in [",", ";", "(", ")"]):
            return True

    # Lines ending with : are often headers
    if text.endswith(":") and len(text) < 50:
        return True

    return False


def _clean_header(text: str) -> str:
    """Clean a section header for use as a dictionary key."""
    cleaned = re.sub(r"[^a-zA-Z\s]", "", text).strip()
    return cleaned.title()


def _extract_bullet_text(text: str) -> Optional[str]:
    """Extract the text content from a bullet point line."""
    # Remove bullet markers
    cleaned = re.sub(r"^[-•*►▪○]\s+", "", text.strip())
    cleaned = re.sub(r"^\d+[.)]\s+", "", cleaned)
    cleaned = re.sub(r"^[a-zA-Z][.)]\s+", "", cleaned)

    if len(cleaned) > 10:  # Filter out very short lines
        return cleaned.strip()
    return None
