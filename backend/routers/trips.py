from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Trip
from schemas.trip import TripCreate, TripUpdate, TripResponse, TripListResponse

router = APIRouter(prefix="/trips", tags=["trips"])
DEFAULT_OWNER_ID = UUID("00000000-0000-0000-0000-000000000001")


@router.post("", response_model=TripResponse)
def create_trip(body: TripCreate, db: Session = Depends(get_db)):
    owner_id = body.owner_id if body.owner_id else DEFAULT_OWNER_ID
    trip = Trip(
        name=body.name,
        owner_id=owner_id,
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
def list_trips(db: Session = Depends(get_db)):
    trips = db.query(Trip).order_by(Trip.created_at.desc()).all()
    return TripListResponse(trips=trips)


@router.get("/{trip_id}", response_model=TripResponse)
def get_trip(trip_id: UUID, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.patch("/{trip_id}", response_model=TripResponse)
def update_trip(trip_id: UUID, body: TripUpdate, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(trip, k, v)
    db.commit()
    db.refresh(trip)
    return trip


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: UUID, db: Session = Depends(get_db)):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    db.delete(trip)
    db.commit()
    return None
