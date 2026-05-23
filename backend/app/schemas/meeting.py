from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.time_utils import UtcDateTime


# --- Responses -------------------------------------------------------------


class ParticipantResponse(BaseModel):
    id: int
    meeting_id: int
    user_id: int | None
    display_name: str
    role: str
    is_muted: bool
    is_video_off: bool
    joined_at: UtcDateTime
    left_at: UtcDateTime | None

    model_config = ConfigDict(from_attributes=True)


class MeetingResponse(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: str | None
    host_id: int
    type: str
    status: str
    scheduled_at: UtcDateTime | None
    duration_mins: int
    invite_link: str
    started_at: UtcDateTime | None
    ended_at: UtcDateTime | None
    created_at: UtcDateTime
    participant_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class MeetingListResponse(BaseModel):
    upcoming: list[MeetingResponse]
    recent: list[MeetingResponse]


class JoinMeetingResponse(BaseModel):
    meeting: MeetingResponse
    participant: ParticipantResponse


class MuteAllResponse(BaseModel):
    updated_count: int


# --- Requests --------------------------------------------------------------


class CreateScheduledMeetingRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    scheduled_at: datetime
    duration_mins: int = Field(default=60, ge=1, le=1440)

    @field_validator("scheduled_at")
    @classmethod
    def _must_be_future(cls, v: datetime) -> datetime:
        aware = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
        if aware <= datetime.now(timezone.utc):
            raise ValueError("scheduled_at must be in the future")
        return v


class UpdateMeetingStatusRequest(BaseModel):
    status: Literal["waiting", "active", "ended"]


class JoinMeetingRequest(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    display_name: str = Field(min_length=1, max_length=100)


class MuteParticipantRequest(BaseModel):
    is_muted: bool


class MuteVideoRequest(BaseModel):
    is_video_off: bool


class MuteAllRequest(BaseModel):
    is_muted: bool = True
