FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System dependencies for WeasyPrint (PDF rendering) and pytesseract (OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    tesseract-ocr \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    curl \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements/ requirements/
ARG REQUIREMENTS_FILE=requirements/base.txt
RUN pip install --upgrade pip && pip install -r ${REQUIREMENTS_FILE}

COPY backend/ .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
