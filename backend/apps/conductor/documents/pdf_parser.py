"""PDF parsing with pdfplumber including table extraction."""
import logging
from pathlib import Path
from typing import List, Tuple

logger = logging.getLogger(__name__)


def parse_pdf(file_path: str) -> Tuple[str, List[dict], int]:
    """Returns (full_text, pages_data, page_count)."""
    try:
        import pdfplumber
    except ImportError:
        logger.error("pdfplumber not installed")
        return "", [], 0

    full_text_parts = []
    pages_data = []

    try:
        with pdfplumber.open(file_path) as pdf:
            page_count = len(pdf.pages)
            for i, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                tables = page.extract_tables()
                table_text = ""
                for table in tables:
                    for row in table:
                        clean = [str(c or "") for c in row]
                        table_text += " | ".join(clean) + "\n"
                page_text = f"{text}\n{table_text}".strip()
                full_text_parts.append(page_text)
                pages_data.append({"page": i, "text": page_text, "has_tables": bool(tables)})
        return "\n\n".join(full_text_parts), pages_data, page_count
    except Exception as exc:
        logger.error("PDF parse error %s: %s", file_path, exc)
        return "", [], 0
