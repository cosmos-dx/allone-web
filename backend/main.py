"""
Main FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.config import CORS_ORIGINS, logger
from backend.middleware.rate_limit import rate_limit_middleware
from backend.routes import (
    auth_router,
    password_router,
    totp_router,
    space_router,
    user_router,
    search_router,
    ai_router,
    bill_router,
    notification_router,
)

# Create the main app
app = FastAPI(
    title="AllOne Password Manager API",
    description="Secure password management API",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware)

# Include routers
# IMPORTANT: More specific routes (bill_router) must be registered BEFORE less specific ones (space_router)
# to ensure proper route matching in FastAPI
app.include_router(auth_router)
app.include_router(password_router)
app.include_router(totp_router)
app.include_router(bill_router)  # Register bill routes BEFORE space routes to avoid conflicts
app.include_router(space_router)
app.include_router(user_router)
app.include_router(search_router)
app.include_router(ai_router)
app.include_router(notification_router)

@app.on_event("startup")
async def startup_event():
    """Log startup information"""
    logger.info("🚀 AllOne API Server starting up...")
    logger.info(f"📡 CORS origins: {CORS_ORIGINS}")
    logger.info("✅ Server ready!")

@app.get("/")
async def root():
    return {"message": "AllOne Password Manager API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    import uvicorn
    import os
    import sys
    from pathlib import Path
    
    # Add parent directory to path to allow imports
    parent_dir = Path(__file__).parent.parent
    if str(parent_dir) not in sys.path:
        sys.path.insert(0, str(parent_dir))
    
    port = int(os.environ.get('PORT', 8000))
    host = os.environ.get('HOST', '0.0.0.0')
    # Use string reference to allow reload and proper module resolution
    uvicorn.run("backend.main:app", host=host, port=port, reload=True)

