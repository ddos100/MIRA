FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app


COPY backend/requirements/ requirements/
ARG REQUIREMENTS_FILE=requirements/base.txt
RUN pip install --upgrade pip && pip install -r ${REQUIREMENTS_FILE}

COPY backend/ .

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120"]
