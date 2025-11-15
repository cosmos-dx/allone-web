"""
Search-related Pydantic models
"""
from pydantic import BaseModel
from typing import Optional, Dict

class SearchQuery(BaseModel):
    query: str
    filters: Optional[Dict] = {}

