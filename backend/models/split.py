import uuid
from sqlalchemy import Column, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class Split(Base):
    __tablename__ = "splits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    total_yen = Column(Integer, nullable=False)
    toll_yen = Column(Integer, nullable=False)
    fuel_yen = Column(Integer, nullable=False)
    extra_yen = Column(Integer, nullable=False)
    distance_km = Column(Numeric(7, 2), nullable=False)
    driver_yen = Column(Integer, nullable=False)
    passenger_yen = Column(Integer, nullable=False)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="splits")
    payments = relationship("Payment", back_populates="split", cascade="all, delete-orphan")
