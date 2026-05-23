from pydantic import BaseModel, ConfigDict, computed_field

from app.time_utils import UtcDateTime


class RecordingResponse(BaseModel):
    id: int
    meeting_id: int
    title: str
    duration_secs: int
    size_bytes: int
    status: str
    created_at: UtcDateTime

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def url(self) -> str:
        return f"/api/recordings/{self.id}/file"
