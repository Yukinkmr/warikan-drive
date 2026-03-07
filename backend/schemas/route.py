from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class RouteSegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    polyline: str | None = None
    summary: str | None
    distance_km: float
    duration_min: int
    toll_etc_yen: int
    toll_cash_yen: int


class RouteCreate(BaseModel):
    label: str | None = None
    origin: str
    destination: str
    departure_time: datetime | None = None
    time_type: Literal["DEPARTURE", "ARRIVAL"] = "DEPARTURE"


class RouteUpdate(BaseModel):
    label: str | None = None
    origin: str | None = None
    destination: str | None = None
    departure_time: datetime | None = None
    time_type: Literal["DEPARTURE", "ARRIVAL"] | None = None
    is_include_split: bool | None = None
    day_id: UUID | None = None


class RouteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    day_id: UUID
    label: str | None
    origin: str
    origin_lat: float | None
    origin_lng: float | None
    destination: str
    dest_lat: float | None
    dest_lng: float | None
    departure_time: datetime | None
    time_type: Literal["DEPARTURE", "ARRIVAL"]
    selected_segment_id: UUID | None
    distance_km: float | None
    toll_yen: int
    fuel_yen: int
    is_include_split: bool
    created_at: datetime
    updated_at: datetime


class RouteSearchRequest(BaseModel):
    departure_time: str  # ISO8601 e.g. 2026-03-04T09:00:00+09:00
    payment_method: str  # ETC | CASH
    time_type: Literal["DEPARTURE", "ARRIVAL"] = "DEPARTURE"


class RouteSearchResponse(BaseModel):
    segments: list[RouteSegmentResponse]


class RouteSelectRequest(BaseModel):
    segment_id: UUID
