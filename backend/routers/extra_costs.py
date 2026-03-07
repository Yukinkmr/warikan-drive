from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import ExtraCost, User
from schemas.extra_cost import ExtraCostCreate, ExtraCostUpdate, ExtraCostResponse

router = APIRouter(prefix="/trips/{trip_id}/extra-costs", tags=["extra_costs"])


@router.post("", response_model=ExtraCostResponse)
def create_extra_cost(
    trip_id: UUID,
    body: ExtraCostCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    cost = ExtraCost(
        trip_id=trip_id,
        day_id=body.day_id,
        type=body.type,
        label=body.label,
        amount_yen=body.amount_yen,
        distance_km=body.distance_km,
    )
    db.add(cost)
    db.commit()
    db.refresh(cost)
    return cost


@router.get("", response_model=list[ExtraCostResponse])
def list_extra_costs(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    costs = db.query(ExtraCost).filter(ExtraCost.trip_id == trip_id).all()
    return costs


@router.patch("/{cost_id}", response_model=ExtraCostResponse)
def update_extra_cost(
    trip_id: UUID,
    cost_id: UUID,
    body: ExtraCostUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    cost = db.query(ExtraCost).filter(ExtraCost.id == cost_id, ExtraCost.trip_id == trip_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Extra cost not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(cost, k, v)
    db.commit()
    db.refresh(cost)
    return cost


@router.delete("/{cost_id}", status_code=204)
def delete_extra_cost(
    trip_id: UUID,
    cost_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    cost = db.query(ExtraCost).filter(ExtraCost.id == cost_id, ExtraCost.trip_id == trip_id).first()
    if not cost:
        raise HTTPException(status_code=404, detail="Extra cost not found")
    db.delete(cost)
    db.commit()
    return None
