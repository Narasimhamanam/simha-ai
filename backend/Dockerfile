FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (layer caching)
COPY requirements.txt .

# Install CPU-only torch first (smaller), then rest
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch==2.11.0+cpu \
        --extra-index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Create necessary directories
RUN mkdir -p uploads chroma_db

# Expose port (Railway sets $PORT automatically)
EXPOSE 8000

# Start the server with 2 workers for concurrent multi-user support
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2 --timeout-keep-alive 75
