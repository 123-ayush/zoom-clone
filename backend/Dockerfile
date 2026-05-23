FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install dependencies first for layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Run as an unprivileged user.
RUN useradd --create-home --shell /bin/bash app && \
    mkdir -p /app/data /app/recordings && \
    chown -R app:app /app
USER app

EXPOSE 8000

# Apply migrations, then start the server. `alembic upgrade head` is a no-op
# when no revisions exist yet; the lifespan still runs `create_all` as a safety
# net for fresh databases.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
