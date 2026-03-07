from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from auth import (
    create_access_token,
    get_current_user,
    hash_password,
    validate_email,
    validate_password,
    verify_password,
)
from database import get_db
from models import User
from schemas.auth import AuthResponse, AuthUserResponse, LoginRequest, RegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=422, detail="Username is required")

    validate_email(email)
    validate_password(body.password)

    exists = db.query(User).filter(func.lower(User.email) == email).first()
    if exists:
        raise HTTPException(status_code=409, detail="Email is already registered")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return AuthResponse(token=create_access_token(user.id), user=AuthUserResponse.model_validate(user))


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    validate_email(email)
    user = db.query(User).filter(func.lower(User.email) == email).first()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return AuthResponse(token=create_access_token(user.id), user=AuthUserResponse.model_validate(user))


@router.get("/me", response_model=AuthUserResponse)
def me(current_user: User = Depends(get_current_user)):
    return AuthUserResponse.model_validate(current_user)
