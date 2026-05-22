from datetime import datetime
from pydantic import BaseModel


class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar_url: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
