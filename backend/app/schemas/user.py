from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    name: str
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    is_admin: int
    email_notifications_enabled: int
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email_notifications_enabled: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class FollowRequest(BaseModel):
    trader_id: int
    email_notify: int = 1


class FollowResponse(BaseModel):
    id: int
    user_id: int
    trader_id: int
    email_notify: int
    created_at: datetime
    trader_name: str = ""
    trader_slug: str = ""

    class Config:
        from_attributes = True
