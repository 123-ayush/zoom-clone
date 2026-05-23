# Decisions

Architecture Decision Records for the choices that shaped this codebase.

## ADR-1 — Video: WebRTC P2P mesh, not an SFU

**Decision.** Run a full mesh of `RTCPeerConnection`s with the signaling server
inside the existing FastAPI backend.

**Why.** The assignment is graded on code understanding; a self-contained
peer-to-peer implementation is auditable end-to-end. An SFU (LiveKit, mediasoup)
is the right production choice but moves the interesting parts off-platform.
For the 2–6 participants this clone targets, mesh is fine.

**Trade-off.** Each peer uploads media N−1 times. Practical cap ≈ 4–6 participants.

## ADR-2 — STUN only, no TURN

**Decision.** Ship Google's public STUN servers; do not configure a TURN relay.

**Why.** TURN requires either a paid third-party (Metered, Twilio) or a
self-hosted `coturn` instance — both add deployment surface that the assignment
doesn't justify. Most home / mobile networks reach each other over STUN alone.

**Trade-off.** Users on strict / symmetric NAT (corporate or hotel networks,
roughly 10–15% of cases) cannot connect. This is documented in the deployment
guide and surfaced as a visible "peer connection failed" outcome.

## ADR-3 — Single implicit user, no auth

**Decision.** The whole app operates as one logged-in user (`id=1`,
configurable via `DEFAULT_USER_NAME` / `DEFAULT_USER_EMAIL`). There is no
signup, login, or password.

**Why.** The assignment brief explicitly says *"assume a default user is logged
in"*. Authentication is listed as a bonus, not core. Building it would dilute
the focus from the core meeting workflows.

**Trade-off.** A real Zoom needs accounts. The single user is centralized in
`app/dependencies.get_current_user` so swapping in real auth later is a
localized change.

## ADR-4 — WebSockets for live state, not polling

**Decision.** All in-meeting real-time state (presence, mute, chat, whiteboard,
recording status, WebRTC signaling) flows over one WebSocket per client per
meeting. The previous 3-second poll is gone.

**Why.** Polling causes a 3-second lag for every user-visible state change and
multiplies HTTP load with participant count. A WebSocket is the natural fit
when we need bidirectional pushes for chat and signaling anyway.

**Trade-off.** Backend now needs to be a single instance (the `RoomManager` is
in-memory). Horizontal scaling requires a pub/sub layer that we have not built.

## ADR-5 — Build every stubbed feature

**Decision.** Implement Chat, Screen Share, Whiteboard, Recording, and the
Clips library for real. Remove no UI elements that the user could click and get
nothing.

**Why.** The user explicitly requested it ("build everything"). Stub buttons
are worse than no buttons — they advertise functionality the app doesn't have.

**Trade-off.** Whiteboard collaborative-canvas state recovery for late joiners
is a snapshot-on-request scheme (one peer sends their canvas image to the
newcomer) rather than an event log. Strokes drawn while the asker was
disconnected and no peer is currently present are lost.

## ADR-6 — Clips = recorded meetings, no separate Loom-style feature

**Decision.** `MediaRecorder` runs client-side during a meeting. When the user
stops, the blob uploads to `POST /api/meetings/{id}/recordings`. The Clips page
lists every stored recording across all meetings.

**Why.** Combining "in-meeting recording" and "Clips library" into one concept
is coherent for users and avoids building a second screen-record-from-dashboard
feature that doesn't fit a video-conference clone.

## ADR-7 — Pydantic-settings + typed config, not scattered `os.getenv`

**Decision.** All backend configuration goes through `app.config.Settings`
(pydantic-settings). One place defines every variable, default, and type.

**Why.** Removes the original "Default User" / URL constants scattered across
six files. Eliminates surprise-typed env reads.

## ADR-8 — SQLite by default, Postgres on demand

**Decision.** `DATABASE_URL` defaults to a local SQLite file. Any deploy that
needs to survive a restart should set it to a Postgres URL.

**Why.** SQLite is zero-config and matches the assignment brief. Postgres
support is one env var away because SQLAlchemy abstracts the engine and
`psycopg2-binary` is already in `requirements.txt`. The `database.py` layer
also normalizes the `postgres://` → `postgresql://` prefix that Railway /
Render emit.

## ADR-9 — Datetimes are timezone-aware UTC, serialized with explicit offset

**Decision.** All datetime columns use `DateTime(timezone=True)`. The Python
side uses `app.time_utils.utcnow()` (which returns aware UTC). All API response
datetimes flow through `UtcDateTime` — a Pydantic annotated type that always
serializes as ISO-8601 with `+00:00`.

**Why.** SQLite drops `tzinfo` on read, so even with `timezone=True` columns,
values come back naive. Without the serializer, the frontend's
`new Date(naiveString)` would parse the value as local time, displaying meeting
times in the wrong zone for any user outside UTC. The annotated type prevents
this entire category of bug.

## ADR-10 — Standardize on `pnpm`

**Decision.** Frontend uses `pnpm`; the old `package-lock.json` was deleted.

**Why.** The repo had both `package-lock.json` and `pnpm-lock.yaml`, which
guarantees install drift between contributors. Picked one.
