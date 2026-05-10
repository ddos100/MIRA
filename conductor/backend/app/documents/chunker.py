"""Recursive character chunker with overlap for RAG ingestion."""
from typing import List


def chunk_text(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 150,
) -> List[str]:
    if not text or not text.strip():
        return []

    separators = ["\n\n", "\n", ". ", " ", ""]
    return _split_recursive(text.strip(), chunk_size, chunk_overlap, separators)


def _split_recursive(
    text: str, chunk_size: int, overlap: int, separators: List[str]
) -> List[str]:
    if len(text) <= chunk_size:
        return [text] if text.strip() else []

    separator = ""
    for sep in separators:
        if sep in text:
            separator = sep
            break

    if separator == "":
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size - overlap)]

    splits = text.split(separator)
    chunks: List[str] = []
    current = ""

    for split in splits:
        candidate = (current + separator + split).strip() if current else split.strip()
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(split) > chunk_size:
                chunks.extend(_split_recursive(split, chunk_size, overlap, separators[1:]))
                current = ""
            else:
                current = split.strip()

    if current:
        chunks.append(current)

    # Apply overlap by prepending tail of previous chunk
    overlapped: List[str] = []
    for i, chunk in enumerate(chunks):
        if i > 0 and overlap > 0:
            prev_tail = chunks[i - 1][-overlap:]
            chunk = prev_tail + " " + chunk
        overlapped.append(chunk)

    return [c for c in overlapped if c.strip()]
