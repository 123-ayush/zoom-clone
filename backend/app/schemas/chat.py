from pydantic import BaseModel, ConfigDict, Field

from app.time_utils import UtcDateTime


class ChatMessageResponse(BaseModel):
    id: int
    meeting_id: int
    participant_id: int | None
    display_name: str
    body: str
    created_at: UtcDateTime

    model_config = ConfigDict(from_attributes=True)


class ChatSendPayload(BaseModel):
    """Validates the body of an inbound `chat-send` WebSocket message."""

    model_config = ConfigDict(str_strip_whitespace=True)

    body: str = Field(min_length=1, max_length=2000)
