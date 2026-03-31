FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python deps
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire repo (DOCX files live at root)
COPY . /repo

# Copy backend source
COPY backend/ /app/

# Run ingestion then start the server
# The ingest script looks for DOCX files at /repo (DOCS_DIR = repo root)
ENV PYTHONPATH=/app
CMD ["sh", "-c", "cd /app && python ingest.py && uvicorn main:app --host 0.0.0.0 --port 8000"]
