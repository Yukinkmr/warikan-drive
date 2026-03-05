import uuid
from sqlalchemy import Column, String, Integer, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

extra_cost_type_enum = ENUM("rental", "parking", "other", name="extra_cost_type_enum", create_type=False)


class ExtraCost(Base):
    __tablename__ = "extra_costs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    day_id = Column(UUID(as_uuid=True), ForeignKey("days.id", ondelete="SET NULL"), nullable=True)
    type = Column(extra_cost_type_enum, nullable=False)
    label = Column(String(100), nullable=False)
    amount_yen = Column(Integer, nullable=False)
    distance_km = Column(Numeric(7, 2), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trip = relationship("Trip", back_populates="extra_costs")
