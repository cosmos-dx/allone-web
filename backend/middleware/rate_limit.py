"""
Rate Limiting Middleware for AI Assistant
Implements 20 queries/day per user with rolling 24-hour window and burst protection
"""
import time
import logging
from typing import Dict, Optional
from fastapi import HTTPException, Request
from collections import defaultdict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

# In-memory storage for rate limits (in production, consider Redis)
_rate_limit_store: Dict[str, Dict] = defaultdict(dict)

# Rate limit configuration
DAILY_QUERY_LIMIT = 20
BURST_LIMIT = 5  # Max requests per minute
ROLLING_WINDOW_HOURS = 24
BURST_WINDOW_SECONDS = 60


class RateLimitInfo:
    """Rate limit information"""
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.requests: list = []
        self.burst_requests: list = []
    
    def add_request(self):
        """Add a new request timestamp"""
        now = time.time()
        self.requests.append(now)
        self.burst_requests.append(now)
        
        # Clean old requests outside rolling window
        cutoff = now - (ROLLING_WINDOW_HOURS * 3600)
        self.requests = [req for req in self.requests if req > cutoff]
        
        # Clean old burst requests
        burst_cutoff = now - BURST_WINDOW_SECONDS
        self.burst_requests = [req for req in self.burst_requests if req > burst_cutoff]
    
    def check_daily_limit(self) -> tuple[bool, int, int]:
        """
        Check if daily limit is exceeded
        Returns: (is_allowed, remaining, reset_time)
        """
        count = len(self.requests)
        remaining = max(0, DAILY_QUERY_LIMIT - count)
        is_allowed = count < DAILY_QUERY_LIMIT
        
        # Calculate reset time (oldest request + 24 hours)
        reset_time = None
        if self.requests:
            oldest_request = min(self.requests)
            reset_time = int(oldest_request + (ROLLING_WINDOW_HOURS * 3600))
        
        return is_allowed, remaining, reset_time
    
    def check_burst_limit(self) -> tuple[bool, int]:
        """
        Check if burst limit is exceeded
        Returns: (is_allowed, remaining)
        """
        count = len(self.burst_requests)
        remaining = max(0, BURST_LIMIT - count)
        is_allowed = count < BURST_LIMIT
        return is_allowed, remaining


def get_rate_limit_info(user_id: str) -> RateLimitInfo:
    """Get or create rate limit info for user"""
    if user_id not in _rate_limit_store:
        _rate_limit_store[user_id] = RateLimitInfo(user_id)
    return _rate_limit_store[user_id]


def check_rate_limit(user_id: str) -> tuple[bool, Optional[Dict]]:
    """
    Check rate limits for a user
    Returns: (is_allowed, error_info)
    """
    rate_info = get_rate_limit_info(user_id)
    
    # Check burst limit first
    burst_allowed, burst_remaining = rate_info.check_burst_limit()
    if not burst_allowed:
        return False, {
            "error": "rate_limit_exceeded",
            "type": "burst",
            "message": f"Too many requests. Please wait a minute before trying again.",
            "limit": BURST_LIMIT,
            "remaining": 0,
            "reset_time": int(time.time() + BURST_WINDOW_SECONDS)
        }
    
    # Check daily limit
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
    
    # Add request if allowed
    rate_info.add_request()
    
    return True, {
        "remaining": daily_remaining - 1,
        "limit": DAILY_QUERY_LIMIT,
        "reset_time": reset_time
    }


async def rate_limit_middleware(request: Request, call_next):
    """
    Rate limiting middleware for AI endpoints
    Only applies to /api/ai/* routes
    """
    path = request.url.path
    
    # Only apply to AI routes
    if not path.startswith('/api/ai/'):
        return await call_next(request)
    
    # Get user ID from token (should be set by auth middleware)
    user_id = None
    if hasattr(request.state, 'user_id'):
        user_id = request.state.user_id
    elif hasattr(request, 'user') and hasattr(request.user, 'uid'):
        user_id = request.user.uid
    
    # If no user ID, let auth middleware handle it
    if not user_id:
        return await call_next(request)
    
    # Check rate limit
    is_allowed, info = check_rate_limit(user_id)
    
    if not is_allowed:
        logger.warning(f"Rate limit exceeded for user {user_id}: {info}")
        raise HTTPException(
            status_code=429,
            detail=info
        )
    
    # Add rate limit headers to response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(DAILY_QUERY_LIMIT)
    response.headers["X-RateLimit-Remaining"] = str(info.get("remaining", 0))
    if info.get("reset_time"):
        response.headers["X-RateLimit-Reset"] = str(info["reset_time"])
    
    return response

