# Architecture

## System overview

```
┌─────────────────────────┐         ┌─────────────────────────┐
│      Browser A          │         │      Browser B          │
│  ┌───────────────────┐  │         │  ┌───────────────────┐  │
│  │  Next.js client   │  │         │  │  Next.js client   │  │
│  │  • REST (api.ts)  │  │         │  │  • REST (api.ts)  │  │
│  │  • WebSocket (ws) │  │         │  │  • WebSocket (ws) │  │
│  │  • WebRTC peers   │◄─┼─── P2P ─┼──┤  • WebRTC peers   │  │
│  └─────────┬─────────┘  │  audio/ │  └─────────┬─────────┘  │
└────────────┼────────────┘  video  └────────────┼────────────┘
             │                                   │
             │     REST + WebSocket signaling     │
             ▼                                   ▼
        ┌────────────────────────────────────────┐
        │              FastAPI backend           │
        │  • REST routers (meetings, parts,      │
        │     chat history, recordings)          │
        │  • WebSocket router + RoomManager      │
        │  • SQLAlchemy + Alembic                │
        │  • Recordings on disk (env-driven)     │
        └────────────────┬───────────────────────┘
                         │
                ┌────────▼────────┐
                │   SQLite (dev)  │
                │  Postgres (prod)│
                └─────────────────┘
```

## Frontend (Next.js 16, App Router)

- **Pages** — `/` dashboard, `/join`, `/schedule`, `/meeting/[meetingId]`, `/clips`.
- **Real-time hooks** — `useWebSocket`, `useWebRTC`, `useChat`, `useRecording`,
  `useMeeting`. Each owns one slice of in-meeting state.
- **Single implicit user** — `UserContext` holds a constant "Demo User" (configurable
  via `NEXT_PUBLIC_DEFAULT_USER_NAME`); there is no auth.
- **Error boundaries** — `app/error.tsx` and `app/meeting/[meetingId]/error.tsx`.

## Backend (FastAPI + SQLAlchemy + Alembic)

- **Layered** — `models/`, `schemas/`, `crud/`, `routers/`. Pydantic validates input.
- **WebSocket layer** — `app/ws/router.py` plus an in-memory `RoomManager`. One
  socket per client per meeting. See [api.md](api.md) for the full message catalog.
- **Single implicit user** — `app/dependencies.get_current_user` is the only place
  the default user is created or read. Both name and email come from settings.

## WebRTC — P2P full mesh

For each pair of peers we open one `RTCPeerConnection`. **The newcomer always
initiates the offer**: when a new participant joins, the server delivers
`room-state` listing existing peers; the newcomer creates an offer to each. Existing
peers receive `peer-joined` (informational) and then `rtc-offer` from the newcomer.
That asymmetry avoids glare without needing full perfect-negotiation logic.

```
newcomer N joins room with peers A,B,C

server  →  N  : room-state { peers: [A,B,C], chatHistory: [...] }
server  →  A,B,C : peer-joined { clientId: N }

N → server → A : rtc-offer {to: A, sdp}
A → server → N : rtc-answer {to: N, sdp}
N ↔ server ↔ A : rtc-ice ...   (trickle ICE both directions)

(repeated for B and C)
```

**Mesh sizing** — N peers means N·(N−1)/2 connections, each peer uploading their
media N−1 times. Practical ceiling is ~4–6 participants per meeting. Beyond that,
the production path is an SFU (LiveKit, mediasoup) — out of scope here.

### ICE servers — STUN only, no TURN

We use Google's public STUN servers
(`stun.l.google.com:19302`, `stun1.l.google.com:19302`) and **no TURN relay**. STUN
covers most home / mobile networks but fails on strict / symmetric NAT
(~10–15% of users in some corporate or hotel networks). The trade-off is
deliberate: TURN requires either a paid third-party (Metered, Twilio) or a
self-hosted coturn instance, both adding deployment surface that this assignment
doesn't justify. In production, add `iceServers` entries via env config and the
mesh starts working for those users immediately.

## Real-time state — WebSockets, not polling

Originally the frontend polled `GET /api/meetings/{id}/participants` every 3
seconds. That was replaced by a single WebSocket connection per client per
meeting. Server broadcasts:

- `room-state` on connect (peers + chat history)
- `peer-joined` / `peer-left` on roster changes
- `state-update` on mute / video / screen-share toggles
- `chat-message` on every chat send
- `meeting-ended` when the host ends, or when the meeting is deleted

The client reconnects with exponential backoff (1 → 2 → 4 → 8 → 15 s, capped).
Close codes in the 4000–4999 range (app-specific rejections) skip reconnect.

## Recordings

`MediaRecorder` runs **client-side**. When the user stops a recording, the
collected `Blob` is uploaded multipart to `POST /api/meetings/{id}/recordings`.
The backend stores files under `settings.recordings_dir` (a Docker-mountable
path) and indexes them in the `recordings` table for the Clips library.

Scale path: swap the local-disk write for object storage (S3 / GCS). Schema and
HTTP surface stay the same.

## Limitations & deliberate non-goals

- No authentication (the assignment specifies "assume a default user is logged in").
- No TURN — strict-NAT peers cannot connect (see above).
- WebSocket `RoomManager` is in-memory, single-process — horizontal scaling
  requires a pub/sub layer (Redis).
- SQLite is the dev default; Postgres is recommended for any deploy that should
  survive a restart.
