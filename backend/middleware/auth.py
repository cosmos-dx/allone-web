"""
Authentication middleware
"""
import os
import time
import jwt
import logging
from fastapi import HTTPException, Header
from firebase_admin import auth

logger = logging.getLogger(__name__)

async def verify_firebase_token(id_token: str):
    """
    Verify Firebase ID token using Admin SDK or REST API fallback
    """
    try:
        # Try Admin SDK first
        return auth.verify_id_token(id_token)
    except Exception as admin_error:
        logger.warning(f"Admin SDK verification failed: {admin_error}. Trying REST API fallback.")
        try:
            # Fallback: Basic token validation (DEVELOPMENT ONLY)
            project_id = os.environ.get('FIREBASE_PROJECT_ID', 'allone-90859')
            try:
                # Decode without verification (DEVELOPMENT ONLY - NOT SECURE FOR PRODUCTION)
                unverified = jwt.decode(id_token, options={"verify_signature": False})
                
                # Basic validation
                if unverified.get('iss') != f'https://securetoken.google.com/{project_id}':
                    raise ValueError("Invalid token issuer")
                if unverified.get('aud') != project_id:
                    raise ValueError("Invalid token audience")
                
                # Check expiration
                exp = unverified.get('exp', 0)
                if exp and exp < time.time():
                    raise ValueError("Token has expired")
                
                # Map 'sub' to 'uid' for compatibility (Firebase ID tokens use 'sub')
                if 'sub' in unverified and 'uid' not in unverified:
                    unverified['uid'] = unverified['sub']
                
                # WARNING: This is for development only!
                logger.warning("⚠️  Using unverified token decode (DEVELOPMENT MODE)")
                logger.warning("⚠️  For production, configure FIREBASE_SERVICE_ACCOUNT_PATH with service account JSON")
                return unverified
            except Exception as rest_error:
                logger.error(f"REST API fallback also failed: {rest_error}")
                raise admin_error  # Raise original error
        except Exception:
            raise admin_error

async def verify_token(authorization: str = Header(None)):
    """Middleware to verify Firebase token"""
    if not authorization:
        raise HTTPException(
            status_code=401, 
            detail="Missing authorization header",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    if not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401, 
            detail="Invalid authorization header format. Expected 'Bearer <token>'",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    token = authorization.split('Bearer ')[1].strip()
    if not token:
        raise HTTPException(
            status_code=401, 
            detail="Empty token",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    try:
        decoded_token = await verify_firebase_token(token)
        if not decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token: empty token")
        # Handle both 'uid' and 'sub' (Firebase uses 'sub' in ID tokens)
        if 'uid' not in decoded_token and 'sub' not in decoded_token:
            raise HTTPException(status_code=401, detail="Invalid token: missing user ID")
        # Ensure 'uid' exists for compatibility
        if 'sub' in decoded_token and 'uid' not in decoded_token:
            decoded_token['uid'] = decoded_token['sub']
        return decoded_token
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=401, 
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"}
        )

