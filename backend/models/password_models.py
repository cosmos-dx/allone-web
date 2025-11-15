"""
Password-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List

class PasswordCreate(BaseModel):
    spaceId: str = "personal"
    encryptedPassword: str
    displayName: str
    username: Optional[str] = None
    website: Optional[str] = None
    category: Optional[str] = "Other"
    tags: List[str] = []
    notes: Optional[str] = None
    favicon: Optional[str] = None
    strength: Optional[int] = 0

class Password(BaseModel):
    model_config = ConfigDict(extra="ignore")
    passwordId: str
    userId: str
    spaceId: str
    encryptedPassword: str
    displayName: str
    username: Optional[str] = None
    website: Optional[str] = None
    category: str
    tags: List[str]
    notes: Optional[str] = None
    favicon: Optional[str] = None
    strength: int
    createdAt: str
    updatedAt: str
    lastUsed: Optional[str] = None

