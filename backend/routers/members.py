from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import get_current_user, get_trip_for_user
from database import get_db
from models import Member, User
from schemas.member import MemberCreate, MemberResponse, MemberUpdate

router = APIRouter(prefix="/trips/{trip_id}/members", tags=["members"])


@router.post("", response_model=MemberResponse)
def create_member(
    trip_id: UUID,
    body: MemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)

    user = None
    if body.user_id:
        user = db.query(User).filter(User.id == body.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

    display_name = (body.display_name or (user.name if user else "")).strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="display_name is required",
        )

    member = Member(
        trip_id=trip_id,
        user_id=body.user_id,
        display_name=display_name,
        role=body.role,
    )
    db.add(member)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Member already exists for this trip",
        ) from exc
    db.refresh(member)
    return member


@router.get("", response_model=list[MemberResponse])
def list_members(
    trip_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    return (
        db.query(Member)
        .filter(Member.trip_id == trip_id)
        .order_by(Member.joined_at.asc())
        .all()
    )


@router.patch("/{member_id}", response_model=MemberResponse)
def update_member(
    trip_id: UUID,
    member_id: UUID,
    body: MemberUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_trip_for_user(trip_id, db, current_user)
    member = (
        db.query(Member)
        .filter(Member.id == member_id, Member.trip_id == trip_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")

    updates = body.model_dump(exclude_unset=True)
    if "display_name" in updates:
        display_name = (updates["display_name"] or "").strip()
        if not display_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="display_name is required",
            )
        updates["display_name"] = display_name

    for key, value in updates.items():
        setattr(member, key, value)

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
    member = (
        db.query(Member)
        .filter(Member.id == member_id, Member.trip_id == trip_id)
        .first()
    )
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return None
