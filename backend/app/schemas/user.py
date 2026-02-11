from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole, AuthProvider, OfficeLocation


class UserBase(BaseModel):
    email: str
    full_name: str


class UserCreate(UserBase):
    role: UserRole = UserRole.EMPLOYEE


class UserResponse(UserBase):
    id: UUID
    role: UserRole
    auth_provider: AuthProvider
    office_location: OfficeLocation | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    office_location: OfficeLocation | None = None


class UpdateOfficeLocation(BaseModel):
    office_location: OfficeLocation


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
