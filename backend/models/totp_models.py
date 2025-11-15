"""
TOTP-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict
from typing import Optional

class TOTPCreate(BaseModel):
    spaceId: str = "personal"
    serviceName: str
    account: str
    encryptedSecret: str
    algorithm: str = "SHA1"
    digits: int = 6
    period: int = 30

class TOTP(BaseModel):
    model_config = ConfigDict(extra="ignore")
    totpId: str
    userId: str
    spaceId: str
    serviceName: str
    account: str
    encryptedSecret: str
    algorithm: str
    digits: int
    period: int
    createdAt: str
    isShared: Optional[bool] = False

