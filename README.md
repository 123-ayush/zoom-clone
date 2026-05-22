# Zoom Clone

A full-stack Zoom clone built for a programming assignment. Replicates Zoom's UI design, meeting workflows, and core functionality.

---

## Tech Stack

| Layer     | Technology                         |
|-----------|------------------------------------|
| Frontend  | Next.js 16 (App Router), TypeScript, Tailwind CSS v4 |
| Backend   | Python 3.14, FastAPI               |
| Database  | SQLite via SQLAlchemy ORM          |
| Icons     | Lucide React                       |

---

## Features

- **Landing Dashboard** — Zoom-style navbar, quick action cards, upcoming and recent meetings sections
- **Instant Meeting** — One-click meeting creation with auto-generated meeting ID and shareable invite link
- **Join Meeting** — Join by meeting ID or invite link, display name entry before joining
- **Schedule Meetings** — Form with title, description, date/time picker, duration; appears in Upcoming section
- **Meeting Room** — Live camera feed (via `getUserMedia`), participant tiles, mute/video toggle
- **Host Controls** — Mute All, remove individual participants, end meeting for all
- **Responsive Design** — Works on mobile (375px), tablet, and desktop

---

## Local Setup

### Prerequisites

- Python 3.10+ (tested on 3.14)
- Node.js 18+ and npm

### 1. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
python -m app.seed          # seeds the SQLite database with sample data
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 2. Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # or create .env.local manually (see below)
npm run dev
```

Open http://localhost:3000

### Frontend Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
```

### Backend Environment Variables (`.env`)

```env
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=http://localhost:3000
```

---

## Database Schema

### `users`
Stores the default logged-in user. Seeded with one row (id=1).

### `meetings`
Single table for both instant and scheduled meetings, distinguished by a `type` column (`instant` / `scheduled`). Uses a human-readable `meeting_id` (e.g. `abc-def0-1234`) as the URL key, separate from the integer primary key used for foreign keys.

### `participants`
Tracks every join event. `user_id` is nullable to support guest joins (name-only). Mute/video state persists to the DB so host controls are real. `left_at` records departure time for duration calculation.

---

## Assumptions

- **No real authentication** — a single default user (id=1) is always considered logged in.
- **No WebRTC peer-to-peer** — the local user's camera is shown via `getUserMedia`. Other participant tiles are simulated avatar cards (colored by name hash). This keeps deployment simple with no signaling server.
- **Polling instead of WebSockets** — the meeting room polls `GET /api/meetings/{id}/participants` every 3 seconds to sync mute state.
- **SQLite** — stored at `backend/zoom_clone.db`. Not suitable for concurrent multi-user production use; intended for this assignment.

---

## Deployment

| Service  | Target  | Notes                                      |
|----------|---------|--------------------------------------------|
| Frontend | Vercel  | Set `NEXT_PUBLIC_API_URL` to backend URL   |
| Backend  | Render  | Add `Procfile` with `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT` |

Set `ALLOWED_ORIGINS` on Render to your Vercel deployment URL.
