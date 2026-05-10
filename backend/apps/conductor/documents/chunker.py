"""Recursive character text splitter with overlap."""
from typing import List


def chunk_text(text: str, chunk_size: int = 1000, chunk_overlap: int = 150) -> List[str]:
    if not text or not text.strip():
        return []
    separators = ["\n\n", "\n", ". ", " ", ""]
    return _split(text, separators, chunk_size, chunk_overlap)


def _split(text: str, separators: List[str], chunk_size: int, overlap: int) -> List[str]:
    sep = separators[0]
    remaining_seps = separators[1:]

    if sep:
        parts = text.split(sep)
    else:
        parts = list(text)

    chunks: List[str] = []
    current = ""

    for part in parts:
        segment = (current + sep + part).strip() if current else part
        if len(segment) <= chunk_size:
            current = segment
        else:
            if current:
                chunks.append(current)
                overlap_text = current[-overlap:] if len(current) > overlap else current
                current = (overlap_text + sep + part).strip()
            else:
                if remaining_seps and len(part) > chunk_size:
                    sub = _split(part, remaining_seps, chunk_size, overlap)
                    chunks.extend(sub)
                    current = sub[-1][-overlap:] if sub and len(sub[-1]) > overlap else (sub[-1] if sub else "")
                else:
                    current = part

    if current:
        chunks.append(current)

    return [c for c in chunks if c.strip()]
