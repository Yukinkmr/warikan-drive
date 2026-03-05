from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DayCreate(BaseModel):
    date: date


class DayUpdate(BaseModel):
    date: date | None = None


class DayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    date: date
    created_at: datetime
