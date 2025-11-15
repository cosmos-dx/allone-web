"""
TOTP management routes
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from backend.models import TOTP, TOTPCreate
from backend.middleware.auth import verify_token
from backend.config import db
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/totp", tags=["totp"])

# Initialize repository (imported from config to avoid circular imports)
from backend.config import totp_repo

@router.post("", response_model=TOTP)
async def create_totp_endpoint(totp_data: TOTPCreate, token_data: dict = Depends(verify_token)):
    if not totp_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    try:
        user_id = token_data['uid']
        totp_id = f"totp_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        
        doc = {
            "totpId": totp_id,
            "userId": user_id,
            **totp_data.model_dump(),
            "createdAt": now
        }
    
        created = totp_repo.create(doc)
        return TOTP(**created)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating TOTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create TOTP: {str(e)}")

@router.get("", response_model=List[TOTP])
async def get_totp_list(spaceId: Optional[str] = None, includeShared: Optional[bool] = True, token_data: dict = Depends(verify_token)):
    if not totp_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    try:
        totps = totp_repo.get_by_user_id(user_id, space_id=spaceId, include_shared=includeShared)
        return [TOTP(**t) for t in totps]
    except Exception as e:
        logger.error(f"Error fetching TOTPs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch TOTPs: {str(e)}")

@router.delete("/{totp_id}")
async def delete_totp_endpoint(totp_id: str, token_data: dict = Depends(verify_token)):
    if not totp_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    
    # Verify TOTP belongs to user
    existing = totp_repo.get_by_id(totp_id)
    if not existing:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['TOTP_NOT_FOUND'])
    
    if existing.get('userId') != user_id:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
    
    try:
        totp_repo.delete(totp_id)
        return {"message": "TOTP deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting TOTP: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete TOTP: {str(e)}")

