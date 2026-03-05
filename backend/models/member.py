import uuid
from sqlalchemy import Column, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, ENUM
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base

member_role_enum = ENUM("driver", "passenger", name="member_role_enum", create_type=False)


class Member(Base):
    __tablename__ = "members"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trip_id = Column(UUID(as_uuid=True), ForeignKey("trips.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(member_role_enum, nullable=False)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (UniqueConstraint("trip_id", "user_id", name="uq_members_trip_user"),)

    trip = relationship("Trip", back_populates="members")
    user = relationship("User", back_populates="memberships")
    payments = relationship("Payment", back_populates="member", cascade="all, delete-orphan")
