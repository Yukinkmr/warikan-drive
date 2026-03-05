import uuid
from sqlalchemy import Column, String, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    paypay_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    trips_owned = relationship("Trip", back_populates="owner", foreign_keys="Trip.owner_id")
    memberships = relationship("Member", back_populates="user")
