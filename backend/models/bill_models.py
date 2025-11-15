"""
Bill-related Pydantic models
"""
from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional
from enum import Enum
from datetime import datetime

class BillSplitType(str, Enum):
    EQUAL = "equal"
    RATIO = "ratio"
    SPECIFIC_AMOUNT = "specific_amount"
    PARTIAL = "partial"

class BillParticipant(BaseModel):
    userId: str
    amount: float
    ratio: Optional[float] = None  # For ratio-based splits
    paid: bool = False
    paidAt: Optional[str] = None

class BillSettlement(BaseModel):
    billId: str
    userId: str
    amount: float
    paidAt: str
    notes: Optional[str] = None

class BillCreate(BaseModel):
    title: str
    amount: float = Field(gt=0, description="Bill amount must be greater than 0")
    date: str
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    splitType: BillSplitType
    participants: List[BillParticipant]
    spaceId: str

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    billId: str
    spaceId: str
    createdBy: str
    title: str
    amount: float
    date: str
    description: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    splitType: BillSplitType
    participants: List[BillParticipant]
    createdAt: str
    updatedAt: str
    isSettled: bool = False

class SettlementRequest(BaseModel):
    userId: str
    amount: float
    notes: Optional[str] = None

