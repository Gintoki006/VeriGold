FROM python:3.11-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first (layer cache optimisation)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and risk engine
COPY app/ ./app/
COPY risk_engine/ ./risk_engine/

# Copy Alembic migration config (needed for release command)
COPY alembic.ini .
COPY alembic/ ./alembic/

# Copy ZK proof fallback artifact (for cloud deploys where Nargo isn't available)
COPY --chown=nobody:nogroup ../zk/proofs/ ./zk/proofs/ 2>/dev/null || true

# Expose the API port (Render/Railway override via $PORT; default 8000)
EXPOSE 8000

# Healthcheck matches the /health endpoint
HEALTHCHECK --interval=10s --timeout=5s --retries=5 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start with Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
