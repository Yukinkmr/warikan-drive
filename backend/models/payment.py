import uuid
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

payment_status_enum = ENUM("pending", "paid", name="payment_status_enum", create_type=False)


class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    split_id = Column(UUID(as_uuid=True), ForeignKey("splits.id", ondelete="CASCADE"), nullable=False)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id", ondelete="CASCADE"), nullable=False)
    amount_yen = Column(Integer, nullable=False)
    status = Column(payment_status_enum, nullable=False, default="pending")
    paypay_request_id = Column(String(100), nullable=True)
    paid_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (UniqueConstraint("split_id", "member_id", name="uq_payments_split_member"),)

    split = relationship("Split", back_populates="payments")
    member = relationship("Member", back_populates="payments")
