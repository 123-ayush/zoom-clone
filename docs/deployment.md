# Deployment

The application is **Docker-first** so it can be deployed to any container host.
This guide covers local development plus the three Docker hosts we tested
against (Render, Railway, Fly.io) and Vercel for the frontend.

## Local — Docker Compose

```bash
docker compose up --build
```

- Backend API: <http://localhost:8000>
- API docs (OpenAPI): <http://localhost:8000/docs>
- Frontend (run locally with pnpm — see below)

The first run creates `backend/zoom_clone.db` (SQLite). Stop with `Ctrl-C`.

### Seed demo data

```bash
docker compose exec backend python -m app.seed
```

### Database migrations

Migrations are applied automatically by the backend container at startup. To
generate a new revision after changing models:

```bash
docker compose run --rm backend alembic revision --autogenerate -m "your message"
```

The generated file lands in `backend/alembic/versions/`.

## Local — without Docker

**Backend** (Python 3.11 only — Python 3.12+ has broken `pydantic-core` wheels on
Windows):

```bash
cd backend
py -3.11 -m venv venv
venv\Scripts\activate          # macOS / Linux: source venv/bin/activate
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

**Frontend**:

```bash
cd frontend
pnpm install
cp .env.local.example .env.local   # adjust if needed
pnpm dev
```

Open <http://localhost:3000>.

## Production

### Backend

Both Render and Railway auto-detect the `backend/Dockerfile`. Fly.io reads it via
`fly launch`. **The backend must run on a single instance** because the WebSocket
`RoomManager` is in-memory; scaling horizontally requires a pub/sub layer that we
have not built.

| Platform | Notes |
| --- | --- |
| **Render** | Free tier, native WebSocket support, sleeps when idle (cold start on first request). |
| **Railway** | No idle sleep; usage-based billing after trial credit. |
| **Fly.io** | Persistent volumes mean SQLite survives restarts; CLI-driven setup. |

### Backend env vars

| Variable | Default | Notes |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:3000` | Used to build invite links. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS allow-list. |
| `DATABASE_URL` | unset → SQLite file | Set to a Postgres URL in production. |
| `DEFAULT_USER_NAME` | `Demo User` | The single implicit user's display name. |
| `DEFAULT_USER_EMAIL` | `demo@zoomclone.app` | Stored once, not exposed. |
| `RECORDINGS_DIR` | `recordings` | Mount a persistent volume here. |
| `LOG_LEVEL` | `INFO` | `DEBUG`, `INFO`, `WARNING`, `ERROR`. |

### Frontend (Vercel)

1. Connect the GitHub repo; set the project root to `frontend/`.
2. Set environment variables:

   ```
   NEXT_PUBLIC_API_URL=https://your-backend.example.com
   NEXT_PUBLIC_WS_URL=wss://your-backend.example.com
   NEXT_PUBLIC_FRONTEND_URL=https://your-vercel-app.vercel.app
   NEXT_PUBLIC_DEFAULT_USER_NAME=Demo User
   ```

3. Add the Vercel URL to the backend's `ALLOWED_ORIGINS`.

### Database choice

| Use case | Choice | Why |
| --- | --- | --- |
| Local dev | SQLite (default) | Zero setup. |
| Demo deploy | SQLite + persistent volume (Fly.io) | Survives restarts. |
| Production | Postgres | Concurrent writes; managed backups. |

To switch to Postgres, set `DATABASE_URL` and the backend handles the rest —
SQLAlchemy abstracts the engine, and `psycopg2-binary` is already a dependency.

### Recordings storage

Recordings are written to `settings.recordings_dir` on the backend's filesystem.
For Docker deploys, mount a volume:

```yaml
# docker-compose.yml (excerpt)
backend:
  volumes:
    - recordings:/app/recordings
volumes:
  recordings:
```

For scale (multi-instance, multi-region), point `recordings_dir` at a mounted S3
bucket via [`s3fs`](https://github.com/s3fs-fuse/s3fs-fuse), or swap the storage
adapter in `app/routers/recordings.py` for an S3 client.

## CI

`.github/workflows/ci.yml` runs on every push and PR to `main`:

- **Backend** — `ruff check`, `pytest`.
- **Frontend** — `pnpm lint`, `pnpm test --run`, `pnpm build`.

Both jobs must pass before merging.
