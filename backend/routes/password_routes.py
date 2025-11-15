"""
Password management routes
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.models import Password, PasswordCreate
from backend.middleware.auth import verify_token
from backend.config import db, user_repo
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/passwords", tags=["passwords"])

# Initialize repository (imported from config to avoid circular imports)
from backend.config import password_repo

@router.post("", response_model=Password)
async def create_password_endpoint(password_data: PasswordCreate, token_data: dict = Depends(verify_token)):
    if not password_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    password_id = f"pwd_{uuid.uuid4()}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "passwordId": password_id,
        "userId": user_id,
        **password_data.model_dump(),
        "createdAt": now,
        "updatedAt": now,
        "lastUsed": None
    }
    
    try:
        created = password_repo.create(doc)
        return Password(**created)
    except Exception as e:
        logger.error(f"Error creating password: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create password: {str(e)}")

@router.get("/export")
async def export_passwords(token_data: dict = Depends(verify_token)):
    """Export all passwords for the user. Requires passkey to be enabled."""
    if not password_repo or not user_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    # Check if user has passkey enabled
    try:
        user = user_repo.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['USER_NOT_FOUND'])
        
        if not user.get('passwordEnabled'):
            raise HTTPException(
                status_code=403,
                detail="Passkey must be enabled to download passwords. Please set up a passkey in Settings."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking user passkey: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to verify passkey: {str(e)}")
    
    try:
        # Get all passwords for the user (including shared)
        logger.info(f"Fetching passwords for user {user_id}")
        passwords = password_repo.get_by_user_id(user_id, space_id=None, include_shared=True)
        logger.info(f"Found {len(passwords)} passwords for export")
        
        # Format passwords for export (include all metadata)
        export_passwords = []
        for pwd in passwords:
            try:
                export_pwd = {
                    "passwordId": pwd.get('passwordId') or '',
                    "displayName": pwd.get('displayName') or '',
                    "website": pwd.get('website') or '',
                    "username": pwd.get('username') or '',
                    "encryptedPassword": pwd.get('encryptedPassword') or '',  # Encrypted, frontend will decrypt
                    "encryptedNotes": pwd.get('encryptedNotes') or '',
                    "tags": pwd.get('tags') or [],
                    "spaceId": pwd.get('spaceId') or '',
                    "isShared": pwd.get('isShared', False),
                    "createdAt": pwd.get('createdAt') or '',
                    "updatedAt": pwd.get('updatedAt') or '',
                    "lastUsed": pwd.get('lastUsed')
                }
                export_passwords.append(export_pwd)
            except Exception as pwd_error:
                logger.warning(f"Error formatting password {pwd.get('passwordId', 'unknown')}: {pwd_error}")
                continue
        
        export_data = {
            "exportDate": datetime.now(timezone.utc).isoformat(),
            "userId": user_id,
            "totalPasswords": len(export_passwords),
            "passwords": export_passwords
        }
        
        logger.info(f"Export data prepared: {len(export_passwords)} passwords")
        return export_data
    except Exception as e:
        logger.error(f"Error exporting passwords: {e}", exc_info=True)
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Failed to export passwords: {str(e)}")

@router.get("", response_model=List[Password])
async def get_passwords(spaceId: Optional[str] = None, includeShared: Optional[bool] = True, token_data: dict = Depends(verify_token)):
    if not password_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    try:
        passwords = password_repo.get_by_user_id(user_id, space_id=spaceId, include_shared=includeShared)
        return [Password(**pwd) for pwd in passwords]
    except Exception as e:
        logger.error(f"Error fetching passwords: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch passwords: {str(e)}")

@router.put("/{password_id}", response_model=Password)
async def update_password_endpoint(password_id: str, password_data: PasswordCreate, token_data: dict = Depends(verify_token)):
    if not password_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    
    # Verify password belongs to user
    existing = password_repo.get_by_id(password_id)
    if not existing:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['PASSWORD_NOT_FOUND'])
    
    if existing.get('userId') != user_id:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
    
    update_doc = {
        **password_data.model_dump(),
        "updatedAt": datetime.now(timezone.utc).isoformat()
    }
    
    try:
        password_repo.update(password_id, update_doc)
        updated = password_repo.get_by_id(password_id)
        return Password(**updated)
    except Exception as e:
        logger.error(f"Error updating password: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update password: {str(e)}")

@router.delete("/{password_id}")
async def delete_password_endpoint(password_id: str, token_data: dict = Depends(verify_token)):
    if not password_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    
    # Verify password belongs to user
    existing = password_repo.get_by_id(password_id)
    if not existing:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['PASSWORD_NOT_FOUND'])
    
    if existing.get('userId') != user_id:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
    
    try:
        password_repo.delete(password_id)
        return {"message": "Password deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting password: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete password: {str(e)}")


