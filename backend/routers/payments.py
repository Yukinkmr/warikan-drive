from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from auth import get_current_user, get_split_for_user
from database import get_db
from models import Payment, User
from schemas.payment import PaymentResponse, PaymentUpdate

router = APIRouter(prefix="/splits/{split_id}/payments", tags=["payments"])


def serialize_payment(payment: Payment) -> PaymentResponse:
    return PaymentResponse(
        id=payment.id,
        split_id=payment.split_id,
        member_id=payment.member_id,
        member_name=payment.member.display_name,
        member_role=payment.member.role,
        amount_yen=payment.amount_yen,
        status=payment.status,
        paypay_request_id=payment.paypay_request_id,
        paid_at=payment.paid_at,
    )


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    split_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_split_for_user(split_id, db, current_user)
    payments = (
        db.query(Payment)
        .options(joinedload(Payment.member))
        .filter(Payment.split_id == split_id)
        .order_by(Payment.participant_order.asc(), Payment.member_id.asc())
        .all()
    )
    return [serialize_payment(payment) for payment in payments]


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    split_id: UUID,
    payment_id: UUID,
    body: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_split_for_user(split_id, db, current_user)
    payment = (
        db.query(Payment)
        .options(joinedload(Payment.member))
        .filter(Payment.id == payment_id, Payment.split_id == split_id)
        .first()
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = body.status
    if body.status == "paid":
        from datetime import datetime, timezone

        payment.paid_at = datetime.now(timezone.utc)
    else:
        payment.paid_at = None

    db.commit()
    db.refresh(payment)
    return serialize_payment(payment)
