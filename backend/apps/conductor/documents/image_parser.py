"""OCR-based image parser via pytesseract."""
import logging

logger = logging.getLogger(__name__)


def parse_image(file_path: str) -> str:
    try:
        import pytesseract
        from PIL import Image
        img = Image.open(file_path)
        return pytesseract.image_to_string(img)
    except ImportError:
        logger.warning("pytesseract/Pillow not installed — OCR unavailable")
        return ""
    except Exception as exc:
        logger.error("Image OCR error %s: %s", file_path, exc)
        return ""
