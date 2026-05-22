from datetime import datetime
from pydantic import BaseModel


class ParticipantResponse(BaseModel):
    id: int
    meeting_id: int
    user_id: int | None
    display_name: str
    role: str
    is_muted: bool
    is_video_off: bool
    joined_at: datetime
    left_at: datetime | None

    model_config = {"from_attributes": True}


class MeetingResponse(BaseModel):
    id: int
    meeting_id: str
    title: str
    description: str | None
    host_id: int
    type: str
    status: str
    scheduled_at: datetime | None
    duration_mins: int
    invite_link: str
    started_at: datetime | None
    ended_at: datetime | None
    created_at: datetime
    participant_count: int = 0

    model_config = {"from_attributes": True}


class MeetingListResponse(BaseModel):
    upcoming: list[MeetingResponse]
    recent: list[MeetingResponse]


class CreateInstantMeetingRequest(BaseModel):
    host_name: str = "Default User"


class CreateScheduledMeetingRequest(BaseModel):
    title: str
    description: str | None = None
    scheduled_at: datetime
    duration_mins: int = 60
    host_name: str = "Default User"


class UpdateMeetingStatusRequest(BaseModel):
    status: str


class JoinMeetingRequest(BaseModel):
    display_name: str
    user_id: int | None = None


class MuteParticipantRequest(BaseModel):
    is_muted: bool


class MuteVideoRequest(BaseModel):
    is_video_off: bool


class MuteAllRequest(BaseModel):
    is_muted: bool = True


class JoinMeetingResponse(BaseModel):
    meeting: MeetingResponse
    participant: ParticipantResponse


class MuteAllResponse(BaseModel):
    updated_count: int
