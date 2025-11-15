"""
User-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, Dict

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    userId: str
    email: str
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    createdAt: str
    lastLogin: str
    passwordEnabled: bool = False
    masterPasswordHash: Optional[str] = None
    preferences: Optional[Dict] = {}

class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    photoURL: Optional[str] = None
    preferences: Optional[Dict] = None

class PasswordAuth(BaseModel):
    password: str

class SessionCreate(BaseModel):
    idToken: str

class SessionResponse(BaseModel):
    sessionToken: str
    user: User

