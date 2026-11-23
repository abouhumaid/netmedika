
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies required by Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Configure uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv

# Copy dependency files
COPY pyproject.toml uv.lock ./

# Install production dependencies
RUN uv sync --frozen --no-install-project --no-dev

# Copy application source
COPY . .

# Start FastAPI
EXPOSE 8000

CMD ["uv", "run", "--no-sync", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
