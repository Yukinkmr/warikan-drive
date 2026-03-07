from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuthUserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    email: str
    created_at: datetime


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class GoogleLoginRequest(BaseModel):
    code: str
    redirect_uri: str


class UpdateMeRequest(BaseModel):
    name: str


class AuthResponse(BaseModel):
    token: str
    user: AuthUserResponse
