from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel


class PaymentUpdate(BaseModel):
    status: Literal["pending", "paid"]


class PaymentResponse(BaseModel):
    id: UUID
    split_id: UUID
    member_id: UUID
    member_name: str
    member_role: Literal["driver", "passenger"]
    amount_yen: int
    status: Literal["pending", "paid"]
    paypay_request_id: str | None
    paid_at: datetime | None
