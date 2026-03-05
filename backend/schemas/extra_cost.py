from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ExtraCostCreate(BaseModel):
    day_id: UUID | None = None
    type: str  # rental | parking | other
    label: str
    amount_yen: int
    distance_km: float | None = None


class ExtraCostUpdate(BaseModel):
    type: str | None = None
    label: str | None = None
    amount_yen: int | None = None
    distance_km: float | None = None


class ExtraCostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    day_id: UUID | None
    type: str
    label: str
    amount_yen: int
    distance_km: float | None
    created_at: datetime
