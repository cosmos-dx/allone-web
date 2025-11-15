"""
AI-related Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, Dict, List, Any

class AIQuery(BaseModel):
    query: str
    context: Optional[Dict] = {}

class AIChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    context: Optional[Dict] = {}

class AIChatResponse(BaseModel):
    type: str  # "text", "tool_call", "link", "error"
    content: Optional[str] = None
    tool_name: Optional[str] = None
    tool_args: Optional[Dict] = None
    tool_result: Optional[Dict] = None
    redirect_url: Optional[str] = None
    error: Optional[str] = None

class IntentClassification(BaseModel):
    intent: str
    confidence: float
    parameters: Dict[str, Any]
    missing_parameters: List[str]
    is_complete: bool
    optional_parameters: List[str]

class RateLimitInfo(BaseModel):
    remaining: int
    limit: int
    reset_time: Optional[int] = None
    error: Optional[str] = None
    message: Optional[str] = None

