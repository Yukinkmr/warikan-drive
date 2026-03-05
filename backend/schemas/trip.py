from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class TripCreate(BaseModel):
    name: str
    payment_method: str = "ETC"  # ETC | CASH
    fuel_efficiency: float
    gas_price: int
    driver_weight: float
    owner_id: UUID | None = None


class TripUpdate(BaseModel):
    name: str | None = None
    payment_method: str | None = None
    fuel_efficiency: float | None = None
    gas_price: int | None = None
    driver_weight: float | None = None


class TripResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    owner_id: UUID
    payment_method: str
    fuel_efficiency: float
    gas_price: int
    driver_weight: float
    created_at: datetime
    updated_at: datetime


class TripListResponse(BaseModel):
    trips: list[TripResponse]
