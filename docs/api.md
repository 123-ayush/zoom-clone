# API Reference

The backend exposes a REST API for durable operations (creating / scheduling /
listing meetings, joining, recordings) and a WebSocket for real-time meeting
state (presence, chat, signaling, whiteboard). The live OpenAPI docs are at
`/docs` on the running backend.

## REST

All paths are prefixed with `/api`. Errors return `{ "detail": "..." }`.

### Meetings

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/meetings/instant` | _(none)_ | `{meeting, participant}` — meeting is `active`, participant is `host`. |
| `POST` | `/meetings/schedule` | `{title, description?, scheduled_at, duration_mins?}` | The created meeting. `scheduled_at` must be in the future. |
| `GET` | `/meetings` | — | `{upcoming: [...], recent: [...]}` |
| `GET` | `/meetings/{meeting_id}` | — | One meeting; 404 if missing. |
| `PATCH` | `/meetings/{meeting_id}/status` | `{status: "waiting" \| "active" \| "ended"}` | Updated meeting. Broadcasts `meeting-ended` over WS when status becomes `ended`. |
| `DELETE` | `/meetings/{meeting_id}` | — | `{message: "deleted"}`. Broadcasts `meeting-ended` first. |
| `POST` | `/meetings/{meeting_id}/join` | `{display_name}` | `{meeting, participant}`. 409 if the meeting is `ended`. |
| `GET` | `/meetings/{meeting_id}/participants` | — | Active participants (those with `left_at` null). |
| `PATCH` | `/meetings/{meeting_id}/mute-all` | `{is_muted: true}` | `{updated_count}`. Affects role=`participant` only. |
| `DELETE` | `/meetings/{meeting_id}/participants/{participant_id}` | — | Sets `left_at`, closes the kicked peer's WebSocket. |

### Participants

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `PATCH` | `/participants/{id}/mute` | `{is_muted: bool}` | Participant. |
| `PATCH` | `/participants/{id}/video` | `{is_video_off: bool}` | Participant. |
| `PATCH` | `/participants/{id}/leave` | — | Participant. |

### Chat

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/meetings/{meeting_id}/chat` | All chat messages for the meeting, oldest first. |

Sending happens over WebSocket (`chat-send`).

### Recordings

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| `POST` | `/meetings/{meeting_id}/recordings` | `multipart/form-data`: `file`, `title`, `duration_secs`, `participant_id?` | `Recording`. Caps at 500 MB. |
| `GET` | `/recordings` | — | All recordings, newest first. |
| `GET` | `/recordings/{id}/file` | — | Streams the recording file. |
| `DELETE` | `/recordings/{id}` | — | Removes the row and the file on disk. |

### Health

| Method | Path | Returns |
| --- | --- | --- |
| `GET` | `/health` | `{status: "ok"}` |
| `GET` | `/` | Welcome message. |

## WebSocket

```
ws://<host>/ws/meetings/{meeting_id}?participant_id={id}
```

The `participant_id` must match a participant whose `meeting_id` equals
`meeting_id` and whose meeting is not `ended`, otherwise the server closes the
socket with code 4004. A duplicate connection for the same `participant_id`
closes the older one with 4001.

Every wire message is JSON: `{ "type": string, "payload": object }`.

### Server → client

| Type | Payload | When |
| --- | --- | --- |
| `room-state` | `{peers: [...], chatHistory: [...]}` | Right after connect. `peers` excludes self. |
| `peer-joined` | `{clientId, displayName, role, isMuted, isVideoOff}` | Another participant joined. |
| `peer-left` | `{clientId}` | A peer disconnected or was removed. |
| `state-update` | `{clientId, isMuted?, isVideoOff?, isScreenSharing?}` | Peer toggled mute / video / share. |
| `chat-message` | `{id, clientId, displayName, body, createdAt}` | New chat message persisted. |
| `meeting-ended` | `{meetingId}` | Host ended the meeting, or it was deleted. |
| `error` | `{code, message}` | Validation / app-level error. |
| `force-mute` | `{}` | Host muted everyone — clients should mute their own mic. |
| `removed` | `{}` | Sent only to the kicked client; socket then closes with code 4003. |
| `rtc-offer` | `{from, to, sdp}` | WebRTC offer relayed from another peer. |
| `rtc-answer` | `{from, to, sdp}` | WebRTC answer relayed. |
| `rtc-ice` | `{from, to, candidate}` | ICE candidate relayed. |
| `wb-stroke` | `{from, points, color, width, tool}` | Whiteboard stroke from another peer. |
| `wb-clear` | `{from}` | Whiteboard cleared. |
| `wb-snapshot-request` | `{from}` | Another peer wants the current board image. |
| `wb-snapshot` | `{from, to, dataUrl}` | Snapshot for a late-joiner. |
| `recording-started` | `{clientId, recordingId?}` | A peer started recording. |
| `recording-stopped` | `{clientId, recordingId?}` | A peer stopped recording. |

### Client → server

| Type | Payload | Server effect |
| --- | --- | --- |
| `state-update` | `{isMuted?, isVideoOff?, isScreenSharing?}` | Updates DB; broadcasts to room. |
| `chat-send` | `{body}` | Persists; broadcasts `chat-message`. |
| `host-mute-all` | `{}` | Host only. Mutes participants; broadcasts `force-mute`. |
| `host-remove` | `{targetClientId}` | Host only. Sets `left_at`; sends `removed` to target; closes their socket. |
| `wb-stroke` | `{points, color, width, tool}` | Relays to other peers as `wb-stroke`. |
| `wb-clear` | `{}` | Relays to other peers. |
| `wb-snapshot-request` | `{}` | Broadcast to peers; one responds with `wb-snapshot`. |
| `wb-snapshot` | `{to, dataUrl}` | Forwarded to the one target. |
| `rtc-offer` / `rtc-answer` / `rtc-ice` | `{to, ...}` | Relayed to `to`. |
| `recording-started` / `recording-stopped` | `{recordingId?}` | Broadcast to room. |

Close codes:

| Code | Meaning |
| --- | --- |
| `1000` | Normal close (client unmounted). |
| `4001` | Replaced by a newer connection for the same participant. |
| `4003` | Removed by host. |
| `4004` | Meeting not found, ended, or participant invalid. |
