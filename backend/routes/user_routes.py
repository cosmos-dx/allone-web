"""
User management routes
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from backend.middleware.auth import verify_token
from backend.config import db
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/users", tags=["users"])

# Initialize repository (imported from config to avoid circular imports)
from backend.config import user_repo

# Note: /search route must come before /{user_id} to avoid route conflicts
@router.get("/search")
async def search_users(query: str = "", token_data: dict = Depends(verify_token)):
    """Search users by name or email
    
    Searches in:
    1. Firebase Authentication (all authenticated users)
    2. Firestore users collection (users who have logged in)
    
    Returns users matching the query by email or display name.
    """
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    if not query or len(query) < 2:
        logger.warning(f"Search query too short: '{query}'")
        return []
    
    current_user_id = token_data['uid']
    
    try:
        logger.info(f"🔍 API: Searching users with query: '{query}' (current user: {current_user_id})")
        results = user_repo.search(query, limit=20)
        logger.info(f"📊 API: Repository returned {len(results)} users before filtering")
        
        # Filter out current user
        filtered_results = [r for r in results if r['userId'] != current_user_id]
        logger.info(f"✅ API: Returning {len(filtered_results)} users after filtering current user")
        
        if len(filtered_results) == 0 and len(results) > 0:
            logger.warning(f"⚠️  All results were filtered out (current user was in results)")
        
        return filtered_results
    except Exception as e:
        logger.error(f"❌ API: Error searching users: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search users: {str(e)}")

@router.get("/{user_id}")
async def get_user(user_id: str, token_data: dict = Depends(verify_token)):
    """Get user details by user ID"""
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    try:
        # Try to get from Firestore first
        user = user_repo.get_by_id(user_id)
        
        if user:
            # Return user data (excluding sensitive info)
            return {
                'userId': user.get('userId') or user_id,
                'email': user.get('email', ''),
                'displayName': user.get('displayName', ''),
                'photoURL': user.get('photoURL', '')
            }
        
        # If not in Firestore, try Firebase Auth
        try:
            from firebase_admin import auth
            user_record = auth.get_user(user_id)
            return {
                'userId': user_id,
                'email': user_record.email or '',
                'displayName': user_record.display_name or '',
                'photoURL': user_record.photo_url or ''
            }
        except Exception as auth_error:
            logger.warning(f"User {user_id} not found in Firestore or Auth: {auth_error}")
            raise HTTPException(status_code=404, detail=f"User not found: {user_id}")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch user: {str(e)}")

@router.patch("/me/settings")
async def update_settings(settings: dict, token_data: dict = Depends(verify_token)):
    """Update user preferences/settings"""
    user_id = token_data['uid']
    
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    try:
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['USER_NOT_FOUND'])
        
        # Allowed settings
        allowed_settings = ["autoLock", "loginNotifications", "clipboardAutoClear"]
        
        # Get current preferences
        preferences = user.get("preferences", {})
        
        # Update allowed settings
        updated_preferences = preferences.copy()
        for key, value in settings.items():
            if key in allowed_settings:
                updated_preferences[key] = value
            else:
                logger.warning(f"Attempted to update disallowed setting: {key}")
        
        # Update user
        user_repo.update(user_id, {"preferences": updated_preferences})
        
        logger.info(f"Updated settings for user {user_id}")
        return {"message": "Settings updated successfully", "preferences": updated_preferences}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating settings for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update settings: {str(e)}")

@router.delete("/me")
async def delete_account(token_data: dict = Depends(verify_token)):
    """Soft delete user account - mark as inactive instead of deleting"""
    user_id = token_data['uid']
    
    if not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    try:
        from datetime import datetime, timezone
        
        # Soft delete: mark as inactive
        user_repo.update(user_id, {
            'active': False,
            'deletedAt': datetime.now(timezone.utc).isoformat()
        })
        
        logger.info(f"User {user_id} account soft deleted")
        return {"message": "Account deleted successfully. Your data will be retained for 30 days."}
    except Exception as e:
        logger.error(f"Error deleting account for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete account: {str(e)}")

