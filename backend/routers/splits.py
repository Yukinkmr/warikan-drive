from uuid import UUID
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import Day, ExtraCost, Member, Payment, Route, RouteSegment, Split, User
from schemas.split import SplitCreate, SplitResponse
from services.split_calculator import calculate_split

router = APIRouter(prefix="/trips/{trip_id}/splits", tags=["splits"])


@router.post("", response_model=SplitResponse)
def create_split(
    trip_id: UUID,
    body: SplitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_trip_for_user(trip_id, db, current_user)
    route_ids = body.route_ids
    include_extra_cost_ids = body.include_extra_cost_ids or []

    day_ids = [d.id for d in db.query(Day).filter(Day.trip_id == trip_id).all()]
    routes = db.query(Route).filter(
        Route.id.in_(route_ids),
        Route.day_id.in_(day_ids),
        Route.is_include_split == True,
    ).all()

    distance_km = 0.0
    toll_yen = 0
    for route in routes:
        if route.selected_segment_id:
            seg = db.query(RouteSegment).filter(
                RouteSegment.id == route.selected_segment_id
            ).first()
            if seg:
                distance_km += float(seg.distance_km)
                if trip.payment_method == "ETC":
                    toll_yen += seg.toll_etc_yen
                else:
                    toll_yen += seg.toll_cash_yen
        elif route.distance_km is not None:
            distance_km += float(route.distance_km)
            toll_yen += route.toll_yen or 0

    extra_yen = 0
    if include_extra_cost_ids:
        costs = db.query(ExtraCost).filter(
            ExtraCost.trip_id == trip_id,
            ExtraCost.id.in_(include_extra_cost_ids),
        ).all()
        extra_yen = sum(c.amount_yen for c in costs)

    fuel_eff = float(body.fuel_efficiency) if body.fuel_efficiency is not None else float(trip.fuel_efficiency)
    gas_price = body.gas_price if body.gas_price is not None else trip.gas_price
    driver_weight = float(body.driver_weight) if body.driver_weight is not None else float(trip.driver_weight)
    members = db.query(Member).filter(Member.trip_id == trip_id).all()
    people = body.people if body.people is not None else (max(1, len(members)) if members else 1)
    people = max(1, min(people, 99))

    result = calculate_split(
        distance_km=distance_km,
        toll_yen=toll_yen,
        fuel_efficiency=fuel_eff,
        gas_price=gas_price,
        extra_yen=extra_yen,
        people=people,
        driver_weight=driver_weight,
    )

    split = Split(
        trip_id=trip_id,
        total_yen=result["total_yen"],
        toll_yen=result["toll_yen"],
        fuel_yen=result["fuel_yen"],
        extra_yen=result["extra_yen"],
        distance_km=Decimal(str(result["distance_km"])),
        driver_yen=result["driver_yen"],
        passenger_yen=result["passenger_yen"],
    )
    db.add(split)
    db.commit()
    db.refresh(split)

    drivers = [m for m in members if m.role == "driver"]
    passengers = [m for m in members if m.role == "passenger"]
    for d in drivers:
        db.add(Payment(split_id=split.id, member_id=d.id, amount_yen=result["driver_yen"], status="pending"))
    for p in passengers:
        db.add(Payment(split_id=split.id, member_id=p.id, amount_yen=result["passenger_yen"], status="pending"))
    db.commit()

    return split


@router.get("/latest", response_model=SplitResponse)
def get_latest_split(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    split = db.query(Split).filter(Split.trip_id == trip_id).order_by(Split.calculated_at.desc()).first()
    if not split:
        raise HTTPException(status_code=404, detail="No split found")
    return split


@router.get("/{split_id}", response_model=SplitResponse)
def get_split(
    trip_id: UUID,
    split_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    split = db.query(Split).filter(Split.id == split_id, Split.trip_id == trip_id).first()
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    return split
