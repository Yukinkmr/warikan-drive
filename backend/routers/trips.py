from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import Payment, Split, Trip, User
from schemas.trip import TripCreate, TripUpdate, TripResponse, TripListResponse

router = APIRouter(prefix="/trips", tags=["trips"])


def serialize_trip_with_payment_summary(trip: Trip, db: Session) -> TripResponse:
    latest_split = (
        db.query(Split)
        .filter(Split.trip_id == trip.id)
        .order_by(Split.calculated_at.desc())
        .first()
    )

    paid_count = None
    pending_count = None
    if latest_split:
        payments = db.query(Payment.status).filter(Payment.split_id == latest_split.id).all()
        paid_count = sum(1 for (status,) in payments if status == "paid")
        pending_count = sum(1 for (status,) in payments if status == "pending")

    return TripResponse(
        id=trip.id,
        name=trip.name,
        owner_id=trip.owner_id,
        payment_method=trip.payment_method,
        fuel_efficiency=float(trip.fuel_efficiency),
        gas_price=trip.gas_price,
        driver_weight=float(trip.driver_weight),
        created_at=trip.created_at,
        updated_at=trip.updated_at,
        paid_count=paid_count,
        pending_count=pending_count,
    )


@router.post("", response_model=TripResponse)
def create_trip(
    body: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = Trip(
        name=body.name,
        owner_id=current_user.id,
        payment_method=body.payment_method,
        fuel_efficiency=body.fuel_efficiency,
        gas_price=body.gas_price,
        driver_weight=body.driver_weight,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("", response_model=TripListResponse)
def list_trips(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trips = (
        db.query(Trip)
        .filter(Trip.owner_id == current_user.id)
        .order_by(Trip.created_at.desc())
        .all()
    )
    return TripListResponse(
        trips=[serialize_trip_with_payment_summary(trip, db) for trip in trips]
    )


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_trip_for_user(trip_id, db, current_user)


@router.patch("/{trip_id}", response_model=TripResponse)
def update_trip(
    trip_id: UUID,
    body: TripUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_trip_for_user(trip_id, db, current_user)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(trip, k, v)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=204)
def delete_trip(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = get_trip_for_user(trip_id, db, current_user)
    db.delete(trip)
    db.commit()
    return None
