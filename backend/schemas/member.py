from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MemberCreate(BaseModel):
    user_id: UUID
    role: str  # driver | passenger


class MemberUpdate(BaseModel):
    role: str | None = None  # driver | passenger


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    user_id: UUID
    role: str
    joined_at: datetime
