"""
Space-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import List

class SpaceCreate(BaseModel):
    name: str
    type: str = "personal"  # personal, family, work
    members: List[str] = []
    admins: List[str] = []

class Space(BaseModel):
    model_config = ConfigDict(extra="ignore")
    spaceId: str
    name: str
    type: str
    ownerId: str
    members: List[str]
    admins: List[str] = []
    createdAt: str

