import uuid
from sqlalchemy import Column, String, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

payment_method_enum = ENUM("ETC", "CASH", name="payment_method_enum", create_type=False)


class Trip(Base):
    __tablename__ = "trips"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    payment_method = Column(payment_method_enum, nullable=False, default="ETC")
    fuel_efficiency = Column(Numeric(5, 2), nullable=False)
    gas_price = Column(Integer, nullable=False)
    driver_weight = Column(Numeric(3, 2), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    owner = relationship("User", back_populates="trips_owned", foreign_keys=[owner_id])
    members = relationship("Member", back_populates="trip", cascade="all, delete-orphan")
    days = relationship("Day", back_populates="trip", cascade="all, delete-orphan")
    extra_costs = relationship("ExtraCost", back_populates="trip", cascade="all, delete-orphan")
    splits = relationship("Split", back_populates="trip", cascade="all, delete-orphan")
