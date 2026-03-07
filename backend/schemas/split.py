from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SplitCreate(BaseModel):
    route_ids: list[UUID]
    include_extra_cost_ids: list[UUID] = []
    fuel_efficiency: float | None = None
    gas_price: int | None = None
    driver_weight: float | None = None
    people: int | None = None


class SplitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    trip_id: UUID
    total_yen: int
    toll_yen: int
    fuel_yen: int
    extra_yen: int
    distance_km: float
    driver_yen: int
    passenger_yen: int
    calculated_at: datetime


class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    split_id: UUID
    member_id: UUID
    amount_yen: int
    status: str
    paypay_request_id: str | None
    paid_at: datetime | None
