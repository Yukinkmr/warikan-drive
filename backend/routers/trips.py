from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import Trip, User
from schemas.trip import TripCreate, TripUpdate, TripResponse, TripListResponse

router = APIRouter(prefix="/trips", tags=["trips"])


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
    return TripListResponse(trips=trips)


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
