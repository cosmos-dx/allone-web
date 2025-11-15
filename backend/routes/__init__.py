"""
API Routes
"""
from .auth_routes import router as auth_router
from .password_routes import router as password_router
from .totp_routes import router as totp_router
from .space_routes import router as space_router
from .user_routes import router as user_router
from .search_routes import router as search_router
from .ai_routes import router as ai_router
from .bill_routes import router as bill_router
from .notification_routes import router as notification_router

__all__ = [
    'auth_router',
    'password_router',
    'totp_router',
    'space_router',
    'user_router',
    'search_router',
    'ai_router',
    'bill_router',
    'notification_router',
]

