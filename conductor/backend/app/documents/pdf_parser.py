"""PDF parser using pdfplumber — extracts text and tables."""
from typing import Dict, List, Tuple
import pdfplumber


def parse_pdf(file_path: str) -> Tuple[str, List[Dict], int]:
    """
    Returns: (full_text, page_texts_with_metadata, page_count)
    page_texts_with_metadata: list of {page: int, text: str, tables: list}
    """
    pages_data: List[Dict] = []
    full_text_parts: List[str] = []

    with pdfplumber.open(file_path) as pdf:
        page_count = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text() or ""

            # Extract tables as text
            table_texts: List[str] = []
            for table in page.extract_tables():
                rows = []
                for row in table:
                    clean_row = [cell or "" for cell in row]
                    rows.append(" | ".join(clean_row))
                table_texts.append("\n".join(rows))

            combined = page_text
            if table_texts:
                combined += "\n\nTABLES:\n" + "\n\n".join(table_texts)

            pages_data.append({
                "page": page.page_number,
                "text": page_text,
                "tables": table_texts,
            })
            if combined.strip():
                full_text_parts.append(f"--- Page {page.page_number} ---\n{combined}")

    return "\n\n".join(full_text_parts), pages_data, page_count
