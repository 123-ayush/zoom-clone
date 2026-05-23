from pydantic import BaseModel, ConfigDict

from app.time_utils import UtcDateTime


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    created_at: UtcDateTime

    model_config = ConfigDict(from_attributes=True)
