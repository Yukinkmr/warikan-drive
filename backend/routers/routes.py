from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Trip, Day, Route, RouteSegment
from sqlalchemy.orm import joinedload
from schemas.route import (
    RouteCreate,
    RouteUpdate,
    RouteResponse,
    RouteSearchRequest,
    RouteSearchResponse,
    RouteSelectRequest,
    RouteSegmentResponse,
)
from services.google_maps import search_route_segments

router = APIRouter(tags=["routes"])


def _get_day(day_id: UUID, db: Session) -> Day:
    day = db.query(Day).filter(Day.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


def _get_route(route_id: UUID, db: Session) -> Route:
    route = db.query(Route).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


@router.post("/days/{day_id}/routes", response_model=RouteResponse)
def create_route(day_id: UUID, body: RouteCreate, db: Session = Depends(get_db)):
    day = _get_day(day_id, db)
    dep = body.departure_time
    route = Route(
        day_id=day_id,
        label=body.label,
        origin=body.origin,
        destination=body.destination,
        departure_time=dep,
    )
    db.add(route)
    db.commit()
    db.refresh(route)
    return route


@router.get("/days/{day_id}/routes", response_model=list[RouteResponse])
def list_routes(day_id: UUID, db: Session = Depends(get_db)):
    _get_day(day_id, db)
    routes = db.query(Route).filter(Route.day_id == day_id).order_by(Route.created_at).all()
    return routes


@router.patch("/days/{day_id}/routes/{route_id}", response_model=RouteResponse)
def update_route(
    day_id: UUID, route_id: UUID, body: RouteUpdate, db: Session = Depends(get_db)
):
    day = _get_day(day_id, db)
    route = db.query(Route).filter(Route.id == route_id, Route.day_id == day_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(route, k, v)
    db.commit()
    db.refresh(route)
    return route


@router.delete("/days/{day_id}/routes/{route_id}", status_code=204)
def delete_route(day_id: UUID, route_id: UUID, db: Session = Depends(get_db)):
    _get_day(day_id, db)
    route = db.query(Route).filter(Route.id == route_id, Route.day_id == day_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    db.delete(route)
    db.commit()
    return None


@router.post("/routes/{route_id}/search", response_model=RouteSearchResponse)
def search_route(route_id: UUID, body: RouteSearchRequest, db: Session = Depends(get_db)):
    route = _get_route(route_id, db)
    segments_data = search_route_segments(
        origin=route.origin,
        destination=route.destination,
        departure_time=body.departure_time,
        payment_method=body.payment_method,
    )
    # 既存の segment を削除して新規保存
    db.query(RouteSegment).filter(RouteSegment.route_id == route_id).delete()
    first = True
    for s in segments_data:
        seg = RouteSegment(
            route_id=route_id,
            polyline=s.get("polyline"),
            distance_km=s["distance_km"],
            duration_min=s["duration_min"],
            toll_etc_yen=s["toll_etc_yen"],
            toll_cash_yen=s["toll_cash_yen"],
            summary=s.get("summary") or "",
        )
        db.add(seg)
        # 最初のセグメントから出発地・目的地の緯度経度を Route に保存
        if first and s.get("origin_lat") is not None:
            route.origin_lat = s["origin_lat"]
            route.origin_lng = s["origin_lng"]
            route.dest_lat = s["dest_lat"]
            route.dest_lng = s["dest_lng"]
            first = False
    db.commit()
    segments = db.query(RouteSegment).filter(RouteSegment.route_id == route_id).all()
    return RouteSearchResponse(
        segments=[RouteSegmentResponse.model_validate(seg) for seg in segments]
    )


@router.get("/routes/{route_id}/segments", response_model=RouteSearchResponse)
def get_route_segments(route_id: UUID, db: Session = Depends(get_db)):
    _get_route(route_id, db)
    segments = db.query(RouteSegment).filter(RouteSegment.route_id == route_id).all()
    return RouteSearchResponse(
        segments=[RouteSegmentResponse.model_validate(s) for s in segments]
    )


@router.patch("/routes/{route_id}/select", response_model=RouteResponse)
def select_segment(route_id: UUID, body: RouteSelectRequest, db: Session = Depends(get_db)):
    route = db.query(Route).options(joinedload(Route.day).joinedload(Day.trip)).filter(Route.id == route_id).first()
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    seg = db.query(RouteSegment).filter(
        RouteSegment.id == body.segment_id,
        RouteSegment.route_id == route_id,
    ).first()
    if not seg:
        raise HTTPException(status_code=404, detail="Segment not found")
    route.selected_segment_id = body.segment_id
    route.distance_km = seg.distance_km
    route.toll_yen = seg.toll_etc_yen if route.day.trip.payment_method == "ETC" else seg.toll_cash_yen
    db.commit()
    db.refresh(route)
    return route
