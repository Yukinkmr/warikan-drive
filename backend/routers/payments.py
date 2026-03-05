from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Split, Payment
from schemas.split import PaymentResponse
from schemas.payment import PaymentUpdate

router = APIRouter(prefix="/splits/{split_id}/payments", tags=["payments"])


def _get_split(split_id: UUID, db: Session) -> Split:
    split = db.query(Split).filter(Split.id == split_id).first()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    return split


@router.get("", response_model=list[PaymentResponse])
def list_payments(split_id: UUID, db: Session = Depends(get_db)):
    _get_split(split_id, db)
    payments = db.query(Payment).filter(Payment.split_id == split_id).all()
    return payments


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    split_id: UUID, payment_id: UUID, body: PaymentUpdate, db: Session = Depends(get_db)
):
    _get_split(split_id, db)
    payment = db.query(Payment).filter(
        Payment.id == payment_id,
        Payment.split_id == split_id,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    payment.status = body.status
    if body.status == "paid":
        from datetime import datetime, timezone
        payment.paid_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(payment)
    return payment
