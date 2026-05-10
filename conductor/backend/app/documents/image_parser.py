"""OCR parser for images using pytesseract."""
from PIL import Image
import pytesseract


def parse_image(file_path: str) -> str:
    """Extract text from image via OCR."""
    image = Image.open(file_path)
    text = pytesseract.image_to_string(image, lang="eng")
    return text.strip()
