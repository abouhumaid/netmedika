# Stage 1: Build stage
FROM python:3.11-slim as builder

WORKDIR /app

# Install build dependencies if needed (e.g., for psycopg2 or uv)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies into a local folder
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Stage 2: Runtime stage
FROM python:3.11-slim

WORKDIR /app

# Copy only the installed packages from the builder stage
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Create a non-root user for security
RUN adduser --disabled-password appuser
USER appuser

# Expose the port FastAPI runs on
EXPOSE 8000

# Start Uvicorn
# Using JSON syntax for CMD is recommended
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]