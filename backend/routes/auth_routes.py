"""
Authentication routes
"""
import os
import uuid
import jwt
import logging
import bcrypt
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, HTTPException, Depends
from backend.models import User, SessionCreate, SessionResponse, PasswordAuth
from backend.middleware.auth import verify_token, verify_firebase_token
from backend.config import db
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Initialize repositories (imported from config to avoid circular imports)
from backend.config import user_repo, space_repo, notification_repo

@router.post("/session", response_model=SessionResponse)
async def create_session(session_data: SessionCreate):
    try:
        # Verify Firebase ID token
        try:
            decoded_token = await verify_firebase_token(session_data.idToken)
        except Exception as token_error:
            logger.error(f"Token verification failed: {token_error}")
            raise HTTPException(
                status_code=401, 
                detail=f"Token verification failed: {str(token_error)}. Please ensure Firebase Admin is properly configured."
            )
        
        # Handle both 'uid' and 'sub' (Firebase uses 'sub' in ID tokens)
        user_id = decoded_token.get('uid') or decoded_token.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing user identifier")
        email = decoded_token.get('email')
        
        # Check if user exists in Firestore
        if not user_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        existing_user = user_repo.get_by_id(user_id)
        
        now = datetime.now(timezone.utc).isoformat()
        
        if not existing_user:
            # Create new user
            user_doc = {
                "userId": user_id,
                "email": email,
                "displayName": decoded_token.get('name'),
                "photoURL": decoded_token.get('picture'),
                "createdAt": now,
                "lastLogin": now,
                "passwordEnabled": False,
                "masterPasswordHash": None,
                "preferences": {}
            }
            user_repo.create(user_doc)
            
            # Create default personal space
            if space_repo:
                space_id = f"space_{uuid.uuid4()}"
                space_doc = {
                    "name": "Personal",
                    "type": "personal",
                    "ownerId": user_id,
                    "members": [],
                    "admins": [],
                    "createdAt": now
                }
                space_repo.create({"spaceId": space_id, **space_doc})
        else:
            # Update last login
            user_repo.update(user_id, {"lastLogin": now})
        
        # Create login notification for the user (only if this is a new login, not a session refresh)
        # Check if there's already a recent login notification (within last 5 minutes)
        if notification_repo:
            try:
                import uuid
                from datetime import timedelta
                # Get recent login notifications
                recent_logins = notification_repo.get_by_user_id(user_id, limit=10)
                recent_login = None
                for notif in recent_logins:
                    if notif.get('type') == 'LOGIN':
                        try:
                            notif_created_at = notif.get('createdAt', '')
                            if notif_created_at:
                                # Parse ISO format timestamp
                                if 'Z' in notif_created_at:
                                    notif_time = datetime.fromisoformat(notif_created_at.replace('Z', '+00:00'))
                                else:
                                    notif_time = datetime.fromisoformat(notif_created_at)
                                
                                # Parse current time
                                if 'Z' in now:
                                    current_time = datetime.fromisoformat(now.replace('Z', '+00:00'))
                                else:
                                    current_time = datetime.fromisoformat(now)
                                
                                # Calculate time difference (handle timezone-aware datetimes)
                                if notif_time.tzinfo is not None:
                                    notif_time = notif_time.replace(tzinfo=None)
                                if current_time.tzinfo is not None:
                                    current_time = current_time.replace(tzinfo=None)
                                
                                time_diff = (current_time - notif_time).total_seconds()
                                if time_diff < 300:  # 5 minutes
                                    recent_login = notif
                                    break
                        except (ValueError, AttributeError) as e:
                            logger.warning(f"Error parsing notification timestamp: {e}")
                            continue
                
                # Only create notification if there's no recent login notification
                if not recent_login:
                    notification_id = f"notif_{uuid.uuid4()}"
                    notification_doc = {
                        "notificationId": notification_id,
                        "userId": user_id,
                        "title": "Login Successful",
                        "message": f"You logged in successfully",
                        "type": "LOGIN",
                        "read": False,
                        "createdAt": now
                    }
                    notification_repo.create(notification_doc)
                    logger.info(f"Created login notification for user {user_id}")
                else:
                    logger.info(f"Skipping login notification - recent login found for user {user_id}")
            except Exception as notif_error:
                logger.warning(f"Failed to create login notification: {notif_error}")
        
        # Notify space owners where user is a member (if login notifications enabled)
        if space_repo and notification_repo:
            try:
                # Get all spaces where user is a member
                member_spaces = space_repo.get_by_member_id(user_id)
                user_display_name = existing_user.get('displayName') if existing_user else decoded_token.get('name', 'User')
                
                for space in member_spaces:
                    owner_id = space.get('ownerId')
                    if owner_id and owner_id != user_id:
                        # Check if owner has login notifications enabled (default: true)
                        owner = user_repo.get_by_id(owner_id)
                        if owner and owner.get('preferences', {}).get('loginNotifications', True):
                            notification_id = f"notif_{uuid.uuid4()}"
                            notification_doc = {
                                "notificationId": notification_id,
                                "userId": owner_id,
                                "title": "Space Member Logged In",
                                "message": f"{user_display_name} logged in and is a member of space '{space.get('name', 'Unknown')}'",
                                "type": "SPACE_MEMBER_LOGIN",
                                "read": False,
                                "createdAt": now
                            }
                            notification_repo.create(notification_doc)
            except Exception as space_notif_error:
                logger.warning(f"Failed to create space member login notifications: {space_notif_error}")
        
        # Create session
        session_token = jwt.encode(
            {"userId": user_id, "exp": datetime.now(timezone.utc) + timedelta(hours=24)},
            os.environ.get('JWT_SECRET', 'your-secret-key'),
            algorithm="HS256"
        )
        
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['USER_NOT_FOUND'])
        return SessionResponse(sessionToken=session_token, user=User(**user))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Session creation error: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

@router.get("/user", response_model=User)
async def get_current_user(token_data: dict = Depends(verify_token)):
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user = user_repo.get_by_id(token_data['uid'])
    if not user:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['USER_NOT_FOUND'])
    return User(**user)

@router.post("/set-password")
async def set_master_password(password_data: PasswordAuth, token_data: dict = Depends(verify_token)):
    """Set or update master password (passkey)"""
    user_id = token_data['uid']
    
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    # Validate password strength (minimum 8 characters)
    if len(password_data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
    
    # Hash the password using bcrypt
    password_hash = bcrypt.hashpw(password_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    try:
        user_repo.update(user_id, {
            'passwordEnabled': True,
            'masterPasswordHash': password_hash
        })
        
        logger.info(f"Password enabled for user {user_id}")
        return {"message": "Passkey set successfully", "passwordEnabled": True}
    except Exception as e:
        logger.error(f"Error setting password for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to set passkey: {str(e)}")

@router.post("/verify-password")
async def verify_master_password(password_data: PasswordAuth, token_data: dict = Depends(verify_token)):
    """Verify master password (passkey)"""
    user_id = token_data['uid']
    
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user = user_repo.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['USER_NOT_FOUND'])
    
    if not user.get('passwordEnabled'):
        raise HTTPException(status_code=400, detail="Passkey authentication not enabled")
    
    stored_hash = user.get('masterPasswordHash')
    if not stored_hash:
        raise HTTPException(status_code=400, detail="No passkey set for this user")
    
    # Verify password using bcrypt
    try:
        if bcrypt.checkpw(password_data.password.encode('utf-8'), stored_hash.encode('utf-8')):
            return {"verified": True}
        else:
            raise HTTPException(status_code=401, detail="Incorrect passkey")
    except Exception as e:
        logger.error(f"Error verifying password for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=401, detail="Incorrect passkey")

