"""WebSocket endpoint that powers in-meeting real-time state."""
import logging
from typing import Any

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from app.crud import chat as crud_chat
from app.crud import meetings as crud_meetings
from app.crud import participants as crud_participants
from app.database import SessionLocal
from app.schemas.chat import ChatSendPayload
from app.time_utils import ensure_aware, utcnow
from app.ws.manager import room_manager

router = APIRouter()
logger = logging.getLogger(__name__)


def _isoformat(dt) -> str:
    return (ensure_aware(dt) or utcnow()).isoformat()


@router.websocket("/ws/meetings/{meeting_id}")
async def meeting_ws(
    websocket: WebSocket, meeting_id: str, participant_id: int = Query(...)
):
    # --- Validate + collect initial state -----------------------------------
    db = SessionLocal()
    try:
        meeting = crud_meetings.get_meeting_by_meeting_id(db, meeting_id)
        if meeting is None or meeting.status == "ended":
            await websocket.close(code=4004, reason="Meeting not available")
            return

        participant = crud_participants.get_participant(db, participant_id)
        if participant is None or participant.meeting_id != meeting.id:
            await websocket.close(code=4004, reason="Participant not found")
            return

        meeting_pk = meeting.id
        sender_role = participant.role
        sender_name = participant.display_name

        active = crud_participants.get_active_participants(db, meeting_pk)
        peers_payload = [
            {
                "clientId": p.id,
                "displayName": p.display_name,
                "role": p.role,
                "isMuted": p.is_muted,
                "isVideoOff": p.is_video_off,
            }
            for p in active
            if p.id != participant_id
        ]
        chat_history = [
            {
                "id": m.id,
                "clientId": m.participant_id,
                "displayName": m.display_name,
                "body": m.body,
                "createdAt": _isoformat(m.created_at),
            }
            for m in crud_chat.get_messages(db, meeting_pk)
        ]

        join_announce = {
            "clientId": participant_id,
            "displayName": participant.display_name,
            "role": participant.role,
            "isMuted": participant.is_muted,
            "isVideoOff": participant.is_video_off,
        }
    finally:
        db.close()

    # --- Register and announce ----------------------------------------------
    await room_manager.connect(meeting_id, participant_id, websocket)
    await websocket.send_json(
        {"type": "room-state", "payload": {"peers": peers_payload, "chatHistory": chat_history}}
    )
    await room_manager.broadcast(
        meeting_id,
        {"type": "peer-joined", "payload": join_announce},
        exclude=participant_id,
    )

    # --- Event loop ---------------------------------------------------------
    try:
        while True:
            msg = await websocket.receive_json()
            await _dispatch(
                meeting_id=meeting_id,
                meeting_pk=meeting_pk,
                sender_id=participant_id,
                sender_role=sender_role,
                sender_name=sender_name,
                msg=msg,
            )
    except WebSocketDisconnect:
        pass
    except Exception as exc:  # noqa: BLE001
        logger.exception("WS handler crashed: %s", exc)
    finally:
        db = SessionLocal()
        try:
            crud_participants.leave_meeting(db, participant_id)
        finally:
            db.close()
        await room_manager.disconnect(meeting_id, participant_id)
        await room_manager.broadcast(
            meeting_id,
            {"type": "peer-left", "payload": {"clientId": participant_id}},
        )


async def _dispatch(
    *,
    meeting_id: str,
    meeting_pk: int,
    sender_id: int,
    sender_role: str,
    sender_name: str,
    msg: dict[str, Any],
) -> None:
    msg_type = msg.get("type")
    payload: dict[str, Any] = msg.get("payload") or {}

    if msg_type == "state-update":
        await _handle_state_update(meeting_id, sender_id, payload)
    elif msg_type == "chat-send":
        await _handle_chat_send(meeting_id, meeting_pk, sender_id, sender_name, payload)
    elif msg_type == "host-mute-all":
        if sender_role == "host":
            await _handle_mute_all(meeting_id, meeting_pk, sender_id)
    elif msg_type == "host-remove":
        if sender_role == "host":
            await _handle_remove(meeting_id, meeting_pk, payload)
    elif msg_type in ("wb-stroke", "wb-clear", "wb-snapshot-request"):
        # Whiteboard relay to other peers.
        await room_manager.broadcast(
            meeting_id,
            {"type": msg_type, "payload": {**payload, "from": sender_id}},
            exclude=sender_id,
        )
    elif msg_type == "wb-snapshot":
        # Targeted snapshot reply (late-joiner gets one peer's canvas).
        target = payload.get("to")
        if isinstance(target, int):
            await room_manager.send_to(
                meeting_id,
                target,
                {"type": "wb-snapshot", "payload": {**payload, "from": sender_id}},
            )
    elif msg_type in ("rtc-offer", "rtc-answer", "rtc-ice"):
        target = payload.get("to")
        if isinstance(target, int):
            await room_manager.send_to(
                meeting_id,
                target,
                {"type": msg_type, "payload": {**payload, "from": sender_id}},
            )
    elif msg_type in ("recording-started", "recording-stopped"):
        await room_manager.broadcast(
            meeting_id,
            {"type": msg_type, "payload": {"clientId": sender_id, **payload}},
        )
    elif msg_type == "peer-rename":
        await _handle_rename(meeting_id, sender_id, payload)
    else:
        logger.debug("Ignoring unknown WS message type: %s", msg_type)


async def _handle_state_update(
    meeting_id: str, sender_id: int, payload: dict[str, Any]
) -> None:
    is_muted = payload.get("isMuted")
    is_video_off = payload.get("isVideoOff")
    is_screen_sharing = payload.get("isScreenSharing")

    db = SessionLocal()
    try:
        if isinstance(is_muted, bool):
            crud_participants.mute_participant(db, sender_id, is_muted)
        if isinstance(is_video_off, bool):
            crud_participants.set_video_off(db, sender_id, is_video_off)
    finally:
        db.close()

    out: dict[str, Any] = {"clientId": sender_id}
    if isinstance(is_muted, bool):
        out["isMuted"] = is_muted
    if isinstance(is_video_off, bool):
        out["isVideoOff"] = is_video_off
    if isinstance(is_screen_sharing, bool):
        out["isScreenSharing"] = is_screen_sharing

    await room_manager.broadcast(meeting_id, {"type": "state-update", "payload": out})


async def _handle_chat_send(
    meeting_id: str,
    meeting_pk: int,
    sender_id: int,
    sender_name: str,
    payload: dict[str, Any],
) -> None:
    try:
        valid = ChatSendPayload.model_validate(payload)
    except Exception:
        await room_manager.send_to(
            meeting_id,
            sender_id,
            {
                "type": "error",
                "payload": {"code": "chat_invalid", "message": "Empty or too-long message"},
            },
        )
        return

    db = SessionLocal()
    try:
        msg = crud_chat.create_message(db, meeting_pk, sender_id, sender_name, valid.body)
        out = {
            "id": msg.id,
            "clientId": sender_id,
            "displayName": sender_name,
            "body": valid.body,
            "createdAt": _isoformat(msg.created_at),
        }
    finally:
        db.close()

    await room_manager.broadcast(meeting_id, {"type": "chat-message", "payload": out})


async def _handle_rename(
    meeting_id: str, sender_id: int, payload: dict[str, Any]
) -> None:
    new_name = payload.get("displayName", "")
    if not isinstance(new_name, str) or not new_name.strip():
        return
    new_name = new_name.strip()
    db = SessionLocal()
    try:
        crud_participants.rename_participant(db, sender_id, new_name)
    finally:
        db.close()
    await room_manager.broadcast(
        meeting_id,
        {"type": "peer-renamed", "payload": {"clientId": sender_id, "displayName": new_name}},
    )


async def _handle_mute_all(meeting_id: str, meeting_pk: int, sender_id: int) -> None:
    db = SessionLocal()
    try:
        crud_participants.mute_all_participants(db, meeting_pk)
    finally:
        db.close()
    await room_manager.broadcast(
        meeting_id, {"type": "force-mute", "payload": {}}, exclude=sender_id
    )


async def _handle_remove(
    meeting_id: str, meeting_pk: int, payload: dict[str, Any]
) -> None:
    target_id = payload.get("targetClientId")
    if not isinstance(target_id, int):
        return

    db = SessionLocal()
    try:
        crud_participants.remove_participant(db, meeting_pk, target_id)
    finally:
        db.close()

    await room_manager.send_to(
        meeting_id, target_id, {"type": "removed", "payload": {}}
    )
    target_ws = room_manager.get_socket(meeting_id, target_id)
    if target_ws is not None:
        try:
            await target_ws.close(code=4003, reason="Removed by host")
        except Exception:
            pass
