from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_split_for_user
from database import get_db
from models import Payment, User
from schemas.split import PaymentResponse
from schemas.payment import PaymentUpdate

router = APIRouter(prefix="/splits/{split_id}/payments", tags=["payments"])


@router.get("", response_model=list[PaymentResponse])
def list_payments(
    split_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_split_for_user(split_id, db, current_user)
    payments = db.query(Payment).filter(Payment.split_id == split_id).all()
    return payments


@router.patch("/{payment_id}", response_model=PaymentResponse)
def update_payment(
    split_id: UUID,
    payment_id: UUID,
    body: PaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_split_for_user(split_id, db, current_user)
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
