from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import Member, User
from schemas.member import MemberCreate, MemberUpdate, MemberResponse

router = APIRouter(prefix="/trips/{trip_id}/members", tags=["members"])


@router.post("", response_model=MemberResponse)
def create_member(
    trip_id: UUID,
    body: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    member = Member(trip_id=trip_id, user_id=body.user_id, role=body.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.get("", response_model=list[MemberResponse])
def list_members(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    members = db.query(Member).filter(Member.trip_id == trip_id).all()
    return members


@router.patch("/{member_id}", response_model=MemberResponse)
def update_member(
    trip_id: UUID,
    member_id: UUID,
    body: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.trip_id == trip_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_member(
    trip_id: UUID,
    member_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    member = db.query(Member).filter(
        Member.id == member_id,
        Member.trip_id == trip_id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return None
