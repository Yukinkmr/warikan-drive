from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Trip, Day
from schemas.day import DayCreate, DayUpdate, DayResponse

router = APIRouter(prefix="/trips/{trip_id}/days", tags=["days"])


def _get_trip(trip_id: UUID, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


@router.post("", response_model=DayResponse)
def create_day(trip_id: UUID, body: DayCreate, db: Session = Depends(get_db)):
    _get_trip(trip_id, db)
    day = Day(trip_id=trip_id, date=body.date)
    db.add(day)
    db.commit()
    db.refresh(day)
    return day


@router.get("", response_model=list[DayResponse])
def list_days(trip_id: UUID, db: Session = Depends(get_db)):
    _get_trip(trip_id, db)
    days = db.query(Day).filter(Day.trip_id == trip_id).order_by(Day.date).all()
    return days


@router.patch("/{day_id}", response_model=DayResponse)
def update_day(trip_id: UUID, day_id: UUID, body: DayUpdate, db: Session = Depends(get_db)):
    _get_trip(trip_id, db)
    day = db.query(Day).filter(Day.id == day_id, Day.trip_id == trip_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(day, k, v)
    db.commit()
    db.refresh(day)
    return day


@router.delete("/{day_id}", status_code=204)
def delete_day(trip_id: UUID, day_id: UUID, db: Session = Depends(get_db)):
    _get_trip(trip_id, db)
    day = db.query(Day).filter(Day.id == day_id, Day.trip_id == trip_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    db.delete(day)
    db.commit()
    return None
