# Dockerfile for Cactario Casa Molle Backend
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Ensure pip is available and up to date
RUN python -m ensurepip --upgrade && \
    python -m pip install --upgrade pip setuptools wheel

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN python -m pip install -r requirements.txt

# Copy application code
COPY . .

# Expose port (Railway will use PORT env var)
EXPOSE 8000

# Start command - use Python script to handle PORT correctly
# Railway healthcheck is configured in railway.json (healthcheckPath: /health)
CMD ["python", "start.py"]

