"""
Rate Limiting Middleware
Implements rate limiting for AI endpoints (20/day) and general API endpoints (100/minute)
"""
import time
import logging
from typing import Dict, Optional
from fastapi import HTTPException, Request
from collections import defaultdict

logger = logging.getLogger(__name__)

_rate_limit_store: Dict[str, Dict] = defaultdict(dict)

DAILY_QUERY_LIMIT = 20
AI_BURST_LIMIT = 5
ROLLING_WINDOW_HOURS = 24
BURST_WINDOW_SECONDS = 60

GENERAL_API_LIMIT = 100
GENERAL_API_WINDOW_SECONDS = 60


class RateLimitInfo:
    """Rate limit information"""
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.requests: list = []
        self.burst_requests: list = []
        self.general_requests: list = []
    
    def add_request(self, is_ai: bool = False):
        """Add a new request timestamp"""
        now = time.time()
        if is_ai:
            self.requests.append(now)
            self.burst_requests.append(now)
            cutoff = now - (ROLLING_WINDOW_HOURS * 3600)
            self.requests = [req for req in self.requests if req > cutoff]
            burst_cutoff = now - BURST_WINDOW_SECONDS
            self.burst_requests = [req for req in self.burst_requests if req > burst_cutoff]
        else:
            self.general_requests.append(now)
            general_cutoff = now - GENERAL_API_WINDOW_SECONDS
            self.general_requests = [req for req in self.general_requests if req > general_cutoff]
    
    def check_daily_limit(self) -> tuple[bool, int, int]:
        """Check if daily limit is exceeded for AI"""
        count = len(self.requests)
        remaining = max(0, DAILY_QUERY_LIMIT - count)
        is_allowed = count < DAILY_QUERY_LIMIT
        reset_time = None
        if self.requests:
            oldest_request = min(self.requests)
            reset_time = int(oldest_request + (ROLLING_WINDOW_HOURS * 3600))
        return is_allowed, remaining, reset_time
    
    def check_burst_limit(self) -> tuple[bool, int]:
        """Check if burst limit is exceeded for AI"""
        count = len(self.burst_requests)
        remaining = max(0, AI_BURST_LIMIT - count)
        is_allowed = count < AI_BURST_LIMIT
        return is_allowed, remaining
    
    def check_general_limit(self) -> tuple[bool, int]:
        """Check if general API limit is exceeded"""
        count = len(self.general_requests)
        remaining = max(0, GENERAL_API_LIMIT - count)
        is_allowed = count < GENERAL_API_LIMIT
        return is_allowed, remaining


def get_rate_limit_info(user_id: str) -> RateLimitInfo:
    """Get or create rate limit info for user"""
    if user_id not in _rate_limit_store:
        _rate_limit_store[user_id] = RateLimitInfo(user_id)
    return _rate_limit_store[user_id]


def check_rate_limit(user_id: str, is_ai: bool = False) -> tuple[bool, Optional[Dict]]:
    """Check rate limits for a user"""
    rate_info = get_rate_limit_info(user_id)
    
    if is_ai:
        burst_allowed, burst_remaining = rate_info.check_burst_limit()
        if not burst_allowed:
            return False, {
                "error": "rate_limit_exceeded",
                "type": "burst",
                "message": f"Too many requests. Please wait a minute before trying again.",
                "limit": AI_BURST_LIMIT,
                "remaining": 0,
                "reset_time": int(time.time() + BURST_WINDOW_SECONDS)
            }
        
        daily_allowed, daily_remaining, reset_time = rate_info.check_daily_limit()
        if not daily_allowed:
            return False, {
                "error": "rate_limit_exceeded",
                "type": "daily",
                "message": f"You've reached your daily limit of {DAILY_QUERY_LIMIT} queries. Please try again later.",
                "limit": DAILY_QUERY_LIMIT,
                "remaining": 0,
                "reset_time": reset_time
            }
        
        rate_info.add_request(is_ai=True)
        return True, {
            "remaining": daily_remaining - 1,
            "limit": DAILY_QUERY_LIMIT,
            "reset_time": reset_time
        }
    else:
        general_allowed, general_remaining = rate_info.check_general_limit()
        if not general_allowed:
            return False, {
                "error": "rate_limit_exceeded",
                "type": "general",
                "message": f"Too many requests. Please wait a minute before trying again.",
                "limit": GENERAL_API_LIMIT,
                "remaining": 0,
                "reset_time": int(time.time() + GENERAL_API_WINDOW_SECONDS)
            }
        
        rate_info.add_request(is_ai=False)
        return True, {
            "remaining": general_remaining - 1,
            "limit": GENERAL_API_LIMIT,
            "reset_time": int(time.time() + GENERAL_API_WINDOW_SECONDS)
        }


async def rate_limit_middleware(request: Request, call_next):
    """Rate limiting middleware for all API routes"""
    path = request.url.path
    
    if not path.startswith('/api/'):
        return await call_next(request)
    
    user_id = None
    if hasattr(request.state, 'user_id'):
        user_id = request.state.user_id
    elif hasattr(request, 'user') and hasattr(request.user, 'uid'):
        user_id = request.user.uid
    
    if not user_id:
        return await call_next(request)
    
    is_ai = path.startswith('/api/ai/')
    is_allowed, info = check_rate_limit(user_id, is_ai=is_ai)
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for user {user_id} on {path}: {info}")
        raise HTTPException(status_code=429, detail=info)
    
    response = await call_next(request)
    limit_key = "X-RateLimit-Limit"
    remaining_key = "X-RateLimit-Remaining"
    reset_key = "X-RateLimit-Reset"
    
    response.headers[limit_key] = str(info.get("limit", 0))
    response.headers[remaining_key] = str(info.get("remaining", 0))
    if info.get("reset_time"):
        response.headers[reset_key] = str(info["reset_time"])
    
    return response

