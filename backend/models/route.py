import uuid
from sqlalchemy import Column, String, Numeric, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class RouteSegment(Base):
    __tablename__ = "route_segments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    route_id = Column(UUID(as_uuid=True), ForeignKey("routes.id", ondelete="CASCADE"), nullable=False)
    polyline = Column(String, nullable=True)
    distance_km = Column(Numeric(7, 2), nullable=False)
    duration_min = Column(Integer, nullable=False)
    toll_etc_yen = Column(Integer, nullable=False, default=0)
    toll_cash_yen = Column(Integer, nullable=False, default=0)
    summary = Column(String(200), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    route = relationship(
        "Route",
        back_populates="segments",
        foreign_keys=[route_id],
    )


class Route(Base):
    __tablename__ = "routes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    day_id = Column(UUID(as_uuid=True), ForeignKey("days.id", ondelete="CASCADE"), nullable=False)
    label = Column(String(50), nullable=True)
    origin = Column(String(200), nullable=False)
    origin_lat = Column(Numeric(9, 6), nullable=True)
    origin_lng = Column(Numeric(9, 6), nullable=True)
    destination = Column(String(200), nullable=False)
    dest_lat = Column(Numeric(9, 6), nullable=True)
    dest_lng = Column(Numeric(9, 6), nullable=True)
    departure_time = Column(DateTime(timezone=True), nullable=True)
    time_type = Column(String(20), nullable=False, default="DEPARTURE", server_default="DEPARTURE")
    use_highways = Column(Boolean, nullable=False, default=True, server_default="true")
    use_tolls = Column(Boolean, nullable=False, default=True, server_default="true")
    selected_segment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("route_segments.id", ondelete="SET NULL", use_alter=True, name="fk_routes_segment"),
        nullable=True,
    )
    distance_km = Column(Numeric(7, 2), nullable=True)
    toll_yen = Column(Integer, default=0)
    fuel_yen = Column(Integer, default=0)
    is_include_split = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    day = relationship("Day", back_populates="routes")
    segments = relationship(
        "RouteSegment",
        back_populates="route",
        cascade="all, delete-orphan",
        foreign_keys="RouteSegment.route_id",
    )
    selected_segment = relationship(
        "RouteSegment",
        foreign_keys=[selected_segment_id],
        post_update=True,
    )
