"""
Notification management routes
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, HTTPException, Depends
from backend.models import Notification, NotificationCreate
from backend.middleware.auth import verify_token
from backend.config import db
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/notifications", tags=["notifications"])

# Initialize repository (imported from config to avoid circular imports)
from backend.config import notification_repo

@router.get("", response_model=List[Notification])
async def get_notifications(token_data: dict = Depends(verify_token)):
    """Get all notifications for the current user"""
    if not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    try:
        notifications = notification_repo.get_by_user_id(user_id)
        return [Notification(**notif) for notif in notifications]
    except Exception as e:
        logger.error(f"Error fetching notifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch notifications: {str(e)}")

@router.put("/{notification_id}/read")
async def mark_notification_read(notification_id: str, token_data: dict = Depends(verify_token)):
    """Mark a notification as read"""
    if not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    # Verify notification belongs to user
    notification = notification_repo.get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.get('userId') != user_id:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
    
    try:
        notification_repo.update(notification_id, {'read': True})
        return {"message": "Notification marked as read"}
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to mark notification as read: {str(e)}")

@router.delete("/{notification_id}")
async def delete_notification(notification_id: str, token_data: dict = Depends(verify_token)):
    """Delete a notification"""
    if not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    # Verify notification belongs to user
    notification = notification_repo.get_by_id(notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    if notification.get('userId') != user_id:
        raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
    
    try:
        notification_repo.delete(notification_id)
        return {"message": "Notification deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting notification: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete notification: {str(e)}")

@router.delete("")
async def clear_all_notifications(token_data: dict = Depends(verify_token)):
    """Delete all notifications for the current user"""
    if not notification_repo:
        raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
    
    user_id = token_data['uid']
    
    try:
        # Get all notifications for the user
        notifications = notification_repo.get_by_user_id(user_id, limit=1000)
        deleted_count = 0
        for notification in notifications:
            try:
                notification_repo.delete(notification.get('notificationId'))
                deleted_count += 1
            except Exception as e:
                logger.warning(f"Failed to delete notification {notification.get('notificationId')}: {e}")
        
        return {"message": f"Cleared {deleted_count} notifications", "deletedCount": deleted_count}
    except Exception as e:
        logger.error(f"Error clearing notifications: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to clear notifications: {str(e)}")

