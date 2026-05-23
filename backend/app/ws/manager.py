"""In-memory room manager for WebSocket meeting connections.

This is intentionally single-instance. Horizontal scaling would require a shared
pub/sub layer (Redis, NATS), which is out of scope — the trade-off is documented
in `docs/architecture.md`.
"""
import asyncio
import logging
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger(__name__)


class RoomManager:
    def __init__(self) -> None:
        # meeting_id -> { participant_id : WebSocket }
        self._rooms: dict[str, dict[int, WebSocket]] = defaultdict(dict)
        self._lock = asyncio.Lock()

    async def connect(
        self, meeting_id: str, client_id: int, websocket: WebSocket
    ) -> None:
        await websocket.accept()
        async with self._lock:
            room = self._rooms[meeting_id]
            existing = room.get(client_id)
            if existing is not None:
                # Duplicate join (same participant_id) — close the stale connection.
                try:
                    await existing.close(code=4001, reason="Replaced by new connection")
                except Exception:
                    pass
            room[client_id] = websocket
        logger.info("WS connect meeting=%s client=%d", meeting_id, client_id)

    async def disconnect(self, meeting_id: str, client_id: int) -> None:
        async with self._lock:
            room = self._rooms.get(meeting_id)
            if room is None:
                return
            if room.get(client_id) is not None:
                del room[client_id]
            if not room:
                self._rooms.pop(meeting_id, None)
        logger.info("WS disconnect meeting=%s client=%d", meeting_id, client_id)

    def get_socket(self, meeting_id: str, client_id: int) -> WebSocket | None:
        return self._rooms.get(meeting_id, {}).get(client_id)

    def peers(self, meeting_id: str) -> list[int]:
        return list(self._rooms.get(meeting_id, {}).keys())

    async def send_to(
        self, meeting_id: str, client_id: int, message: dict[str, Any]
    ) -> bool:
        ws = self.get_socket(meeting_id, client_id)
        if ws is None:
            return False
        try:
            await ws.send_json(message)
            return True
        except Exception as exc:  # noqa: BLE001
            logger.warning("WS send_to failed client=%d: %s", client_id, exc)
            return False

    async def broadcast(
        self,
        meeting_id: str,
        message: dict[str, Any],
        exclude: int | None = None,
    ) -> None:
        # Snapshot to avoid mutation during iteration if a peer disconnects.
        snapshot = dict(self._rooms.get(meeting_id, {}))
        for cid, ws in snapshot.items():
            if cid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception as exc:  # noqa: BLE001
                logger.warning("WS broadcast failed client=%d: %s", cid, exc)


room_manager = RoomManager()
