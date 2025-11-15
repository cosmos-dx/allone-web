"""
Space management routes
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from backend.models import Space, SpaceCreate
from backend.middleware.auth import verify_token
from backend.config import db
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spaces", tags=["spaces"])

# Initialize repositories (imported from config to avoid circular imports)
from backend.config import space_repo, user_repo, notification_repo

@router.post("", response_model=Space)
async def create_space_endpoint(space_data: SpaceCreate, token_data: dict = Depends(verify_token)):
    if not space_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    space_id = f"space_{uuid.uuid4()}"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "spaceId": space_id,
        "ownerId": user_id,
        "name": space_data.name,
        "type": space_data.type,
        "members": space_data.members or [],
        "admins": space_data.admins or [],
        "createdAt": now
    }
    
    try:
        created = space_repo.create(doc)
        return Space(**created)
    except Exception as e:
        logger.error(f"Error creating space: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create space: {str(e)}")

@router.get("", response_model=List[Space])
async def get_spaces_endpoint(token_data: dict = Depends(verify_token)):
    if not space_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    user_id = token_data['uid']
    try:
        spaces = space_repo.get_all_for_user(user_id)
        return [Space(**s) for s in spaces]
    except Exception as e:
        logger.error(f"Error fetching spaces: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch spaces: {str(e)}")

@router.post("/{space_id}/members")
async def add_space_member(space_id: str, member_data: dict, token_data: dict = Depends(verify_token)):
    """Add a member to a space"""
    if not space_repo or not user_repo or not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    member_user_id = member_data.get('userId')
    
    if not member_user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    # Get space
    space = space_repo.get_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
    
    # Verify user is owner or admin
    is_owner = space.get('ownerId') == user_id
    is_admin = user_id in space.get('admins', [])
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['ONLY_OWNER_CAN_MANAGE'])
    
    # Get current members
    members = space.get('members', [])
    
    # Check if already a member
    if member_user_id in members:
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES['USER_ALREADY_MEMBER'])
    
    # Add member
    try:
        updated_space = space_repo.add_member(space_id, member_user_id)
        
        # Get owner info for notification
        owner = user_repo.get_by_id(space.get('ownerId'))
        owner_name = owner.get('displayName', 'the owner') if owner else 'the owner'
        
        # Create notification for the added member
        notification_id = f"notif_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        notification_doc = {
            "notificationId": notification_id,
            "userId": member_user_id,
            "title": "Added to Space",
            "message": f"You've been added to the space '{space.get('name', 'Unknown')}' by {owner_name}",
            "type": "info",
            "read": False,
            "createdAt": now,
            "spaceId": space_id
        }
        notification_repo.create(notification_doc)
        
        return Space(**updated_space)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding member: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add member: {str(e)}")

@router.delete("/{space_id}/members/{member_id}")
async def remove_space_member(space_id: str, member_id: str, token_data: dict = Depends(verify_token)):
    """Remove a member from a space"""
    if not space_repo or not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    # Get space
    space = space_repo.get_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
    
    # Verify user is owner or admin
    is_owner = space.get('ownerId') == user_id
    is_admin = user_id in space.get('admins', [])
    if not is_owner and not is_admin:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['ONLY_OWNER_CAN_MANAGE'])
    
    # Remove member
    try:
        updated_space = space_repo.remove_member(space_id, member_id)
        
        # Create notification for the removed member
        notification_id = f"notif_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        notification_doc = {
            "notificationId": notification_id,
            "userId": member_id,
            "title": "Removed from Space",
            "message": f"You've been removed from the space '{space.get('name', 'Unknown')}'",
            "type": "warning",
            "read": False,
            "createdAt": now,
            "spaceId": space_id
        }
        notification_repo.create(notification_doc)
        
        return Space(**updated_space)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error removing member: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to remove member: {str(e)}")

@router.post("/{space_id}/transfer-ownership")
async def transfer_ownership(space_id: str, transfer_data: dict, token_data: dict = Depends(verify_token)):
    """Transfer space ownership to another user"""
    if not space_repo or not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    new_owner_id = transfer_data.get('newOwnerId')
    
    if not new_owner_id:
        raise HTTPException(status_code=400, detail="newOwnerId is required")
    
    # Get space
    space = space_repo.get_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
    
    # Verify user is current owner
    if space.get('ownerId') != user_id:
        raise HTTPException(status_code=403, detail="Only space owner can transfer ownership")
    
    # Transfer ownership
    try:
        updated_space = space_repo.transfer_ownership(space_id, new_owner_id)
        
        # Create notification for new owner
        notification_id = f"notif_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        notification_doc = {
            "notificationId": notification_id,
            "userId": new_owner_id,
            "title": "Space Ownership Transferred",
            "message": f"You are now the owner of the space '{space.get('name', 'Unknown')}'",
            "type": "info",
            "read": False,
            "createdAt": now,
            "spaceId": space_id
        }
        notification_repo.create(notification_doc)
        
        return Space(**updated_space)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error transferring ownership: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to transfer ownership: {str(e)}")

@router.post("/{space_id}/admins")
async def add_space_admin(space_id: str, admin_data: dict, token_data: dict = Depends(verify_token)):
    """Add an admin to a space"""
    if not space_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    admin_user_id = admin_data.get('userId')
    
    if not admin_user_id:
        raise HTTPException(status_code=400, detail="userId is required")
    
    # Get space
    space = space_repo.get_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
    
    # Verify user is owner
    if space.get('ownerId') != user_id:
        raise HTTPException(status_code=403, detail="Only space owner can add admins")
    
    # Add admin
    try:
        updated_space = space_repo.add_admin(space_id, admin_user_id)
        return Space(**updated_space)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error adding admin: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to add admin: {str(e)}")

@router.delete("/{space_id}/admins/{admin_id}")
async def remove_space_admin(space_id: str, admin_id: str, token_data: dict = Depends(verify_token)):
    """Remove an admin from a space"""
    if not space_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    # Get space
    space = space_repo.get_by_id(space_id)
    if not space:
        raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
    
    # Verify user is owner
    if space.get('ownerId') != user_id:
        raise HTTPException(status_code=403, detail="Only space owner can remove admins")
    
    # Remove admin
    try:
        updated_space = space_repo.remove_admin(space_id, admin_id)
        return Space(**updated_space)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error removing admin: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to remove admin: {str(e)}")

