"""
Cache Service - In-memory caching with TTL support
"""
import time
import logging
from typing import Any, Optional, Dict
from threading import Lock

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            if time.time() > entry['expires_at']:
                del self._cache[key]
                return None
            
            return entry['value']
    
    def set(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Set value in cache with TTL"""
        with self._lock:
            self._cache[key] = {
                'value': value,
                'expires_at': time.time() + ttl_seconds
            }
    
    def delete(self, key: str) -> None:
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching pattern (prefix match)"""
        count = 0
        with self._lock:
            keys_to_delete = [k for k in self._cache.keys() if k.startswith(pattern)]
            for key in keys_to_delete:
                del self._cache[key]
                count += 1
        return count
    
    def clear(self) -> None:
        """Clear all cache"""
        with self._lock:
            self._cache.clear()
    
    def cleanup_expired(self) -> int:
        """Remove expired entries, returns count of removed entries"""
        count = 0
        now = time.time()
        with self._lock:
            keys_to_delete = [
                k for k, v in self._cache.items()
                if now > v['expires_at']
            ]
            for key in keys_to_delete:
                del self._cache[key]
                count += 1
        return count

cache_service = CacheService()

