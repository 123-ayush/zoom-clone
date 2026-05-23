# Zoom Clone

A full-stack video-conferencing app built as a coding assignment. Real
peer-to-peer video and audio over WebRTC, live chat, collaborative whiteboard,
in-meeting recording with a Clips library, and a Zoom-style UI throughout.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · React 19 |
| Backend | Python 3.11 · FastAPI · SQLAlchemy 2 · Alembic |
| Real-time | WebSockets (signaling, presence, chat, whiteboard) · WebRTC P2P mesh |
| Database | SQLite (dev) · Postgres (prod) |
| Tests | pytest · Vitest · React Testing Library |
| Deploy | Docker — works on Render, Railway, Fly.io · Vercel for the frontend |

---

## Features

- **Landing dashboard** — Quick actions, upcoming meetings, recent meetings.
- **Instant meetings** — One click creates a meeting with a shareable invite link.
- **Schedule meetings** — Title, description, date/time picker, duration; appears
  under Upcoming.
- **Join by ID** — 11-digit meeting ID, display-name prompt before entering.
- **Real video and audio** — WebRTC peer-to-peer mesh with STUN. No simulated
  participant tiles.
- **Live chat** — Persisted to the database; history replays for late joiners.
- **Screen share** — `getDisplayMedia` + `replaceTrack`, with a visible indicator.
- **Collaborative whiteboard** — Multi-color pen, eraser, clear, snapshot sync.
- **Recording** — Client-side `MediaRecorder` uploads to the backend; appears in
  the **Clips** library with play / download / delete.
- **Host controls** — Mute all (broadcast `force-mute`), remove participant
  (closes their socket).
- **Production-ready edges** — error boundaries, WS reconnect with exponential
  backoff, permission-denied UX, timezone-aware datetimes, structured logging,
  input validation, automated tests.

---

## Quick start (Docker)

```bash
docker compose up --build
```

- API: <http://localhost:8000> · API docs: <http://localhost:8000/docs>
- Seed demo data: `docker compose exec backend python -m app.seed`

Then in another shell:

```bash
cd frontend
cp .env.local.example .env.local
pnpm install
pnpm dev
```

Open <http://localhost:3000>.

> Without Docker the backend needs Python **3.11** specifically (3.12+ has broken
> `pydantic-core` wheels on Windows). See [docs/deployment.md](docs/deployment.md)
> for the non-Docker path.

---

## Project layout

```
zoom-clone/
├── backend/                 FastAPI app
│   ├── app/
│   │   ├── config.py         pydantic-settings — every env var
│   │   ├── database.py       SQLAlchemy engine (env-driven SQLite/Postgres)
│   │   ├── dependencies.py   get_current_user — the only place "demo user" lives
│   │   ├── time_utils.py     utcnow(), UtcDateTime serializer
│   │   ├── models/           User, Meeting, Participant, ChatMessage, Recording
│   │   ├── schemas/          Pydantic request/response models with validation
│   │   ├── crud/             database operations
│   │   ├── routers/          REST endpoints
│   │   ├── ws/               WebSocket router + in-memory RoomManager
│   │   └── seed.py           idempotent demo data
│   ├── alembic/              migrations
│   └── tests/                pytest
├── frontend/                Next.js 16 App Router
│   ├── src/
│   │   ├── app/              routes — /, /join, /schedule, /meeting/[id], /clips
│   │   ├── components/       UI (meeting/, dashboard/, modals/, layout/, ui/)
│   │   ├── context/          UserContext (single implicit user)
│   │   ├── hooks/            useWebSocket, useWebRTC, useChat, useRecording, useMeeting
│   │   ├── lib/              api.ts (REST), ws.ts (WS message catalog), utils.ts
│   │   └── types/            shared TypeScript types
│   └── tests/                Vitest
├── docs/                    architecture, deployment, API, schema, decisions
├── docker-compose.yml
└── .github/workflows/ci.yml
```

---

## Configuration

Every backend setting lives in `backend/app/config.py` and reads from environment
variables — see [backend/.env.example](backend/.env.example) and
[frontend/.env.local.example](frontend/.env.local.example). The full list is
documented in [docs/deployment.md](docs/deployment.md).

---

## Documentation

- [docs/architecture.md](docs/architecture.md) — System overview, WebRTC mesh,
  WebSockets, scaling limits, no-TURN caveat.
- [docs/api.md](docs/api.md) — REST endpoints and the full WebSocket message
  catalog.
- [docs/database.md](docs/database.md) — Schema and relationships.
- [docs/deployment.md](docs/deployment.md) — Docker, Vercel, env vars, platform
  notes.
- [docs/decisions.md](docs/decisions.md) — Architecture Decision Records
  explaining every non-obvious choice.

---

## Tests

```bash
# Backend
cd backend
pip install -r requirements-dev.txt
ruff check .
pytest

# Frontend
cd frontend
pnpm install
pnpm lint
pnpm test --run
pnpm build
```

CI (`.github/workflows/ci.yml`) runs all of the above on every push and PR.

---

## Known limitations

- **No TURN.** Strict / symmetric NAT users may fail to connect. Adding a
  hosted TURN service is a one-env-var change — see ADR-2.
- **Single-instance backend.** The WebSocket `RoomManager` is in-memory.
  Horizontal scaling requires a pub/sub layer (Redis) that we have not built.
- **Mesh scaling.** ~4–6 participants per meeting comfortably; an SFU is the
  production path beyond that.
- **No authentication.** The assignment specifies "assume a default user is
  logged in"; the whole app uses one implicit user. See ADR-3.
