from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MemberCreate(BaseModel):
    user_id: UUID | None = None
    display_name: str | None = None
    role: Literal["driver", "passenger"] = "passenger"


class MemberUpdate(BaseModel):
    display_name: str | None = None
    role: Literal["driver", "passenger"] | None = None


class MemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    user_id: UUID | None
    display_name: str
    role: Literal["driver", "passenger"]
    joined_at: datetime
