import base64
import hashlib
import hmac
import json
import os
import re
import time
from uuid import UUID

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import Day, Route, Split, Trip, User

AUTH_SECRET = os.getenv("AUTH_SECRET", "warikan-drive-dev-secret")
AUTH_TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", str(60 * 60 * 24 * 30)))
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
PASSWORD_PATTERN = re.compile(r"^(?=.*[A-Za-z])(?=.*\d).{8,}$")
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
PASSWORD_ITERATIONS = 100_000

bearer_scheme = HTTPBearer(auto_error=False)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def validate_password(password: str) -> None:
    if not PASSWORD_PATTERN.match(password):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Password must be at least 8 characters and include letters and numbers",
        )


def validate_email(email: str) -> None:
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Please enter a valid email address",
        )


def exchange_google_code(code: str, redirect_uri: str) -> dict:
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google login is not configured",
        )
    if not code or not redirect_uri:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Google code and redirect URI are required",
        )

    try:
        with httpx.Client(timeout=10.0) as client:
            token_res = client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "code": code,
                    "client_id": GOOGLE_CLIENT_ID,
                    "client_secret": GOOGLE_CLIENT_SECRET,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to reach Google OAuth",
        ) from exc

    if token_res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google authorization failed",
        )

    token_payload = token_res.json()
    access_token = token_payload.get("access_token")
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google access token is missing",
        )

    try:
        with httpx.Client(timeout=10.0) as client:
            userinfo_res = client.get(
                "https://openidconnect.googleapis.com/v1/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to load Google user profile",
        ) from exc

    if userinfo_res.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unable to verify Google user profile",
        )

    payload = userinfo_res.json()
    email = str(payload.get("email") or "").strip().lower()
    validate_email(email)
    if payload.get("email_verified") not in {True, "true"}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account email is not verified",
        )
    sub = str(payload.get("sub") or "").strip()
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google account identifier is missing",
        )
    name = str(payload.get("name") or email.split("@")[0]).strip() or "Google User"
    return {"sub": sub, "email": email, "name": name}


def hash_password(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PASSWORD_ITERATIONS,
    )
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${_b64url_encode(salt)}${_b64url_encode(digest)}"


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        _, iterations_str, salt_b64, digest_b64 = password_hash.split("$", 3)
        digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _b64url_decode(salt_b64),
            int(iterations_str),
        )
        return hmac.compare_digest(_b64url_encode(digest), digest_b64)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: UUID) -> str:
    payload = {
        "sub": str(user_id),
        "exp": int(time.time()) + AUTH_TOKEN_TTL_SECONDS,
    }
    payload_bytes = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    signature = hmac.new(
        AUTH_SECRET.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).digest()
    return f"{_b64url_encode(payload_bytes)}.{_b64url_encode(signature)}"


def decode_access_token(token: str) -> UUID:
    try:
        payload_b64, signature_b64 = token.split(".", 1)
        payload_bytes = _b64url_decode(payload_b64)
        expected_signature = hmac.new(
            AUTH_SECRET.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).digest()
        if not hmac.compare_digest(_b64url_encode(expected_signature), signature_b64):
            raise ValueError("invalid signature")
        payload = json.loads(payload_bytes)
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("token expired")
        return UUID(str(payload["sub"]))
    except (KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    user_id = decode_access_token(credentials.credentials)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def get_trip_for_user(trip_id: UUID, db: Session, user: User) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def get_day_for_user(day_id: UUID, db: Session, user: User) -> Day:
    day = (
        db.query(Day)
        .join(Trip, Day.trip_id == Trip.id)
        .filter(Day.id == day_id, Trip.owner_id == user.id)
        .first()
    )
    if not day:
        raise HTTPException(status_code=404, detail="Day not found")
    return day


def get_route_for_user(route_id: UUID, db: Session, user: User) -> Route:
    route = (
        db.query(Route)
        .join(Day, Route.day_id == Day.id)
        .join(Trip, Day.trip_id == Trip.id)
        .filter(Route.id == route_id, Trip.owner_id == user.id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return route


def get_split_for_user(split_id: UUID, db: Session, user: User) -> Split:
    split = (
        db.query(Split)
        .join(Trip, Split.trip_id == Trip.id)
        .filter(Split.id == split_id, Trip.owner_id == user.id)
        .first()
    )
    if not split:
        raise HTTPException(status_code=404, detail="Split not found")
    return split
