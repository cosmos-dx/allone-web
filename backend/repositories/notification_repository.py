"""
Notification Repository - Data access layer for notifications
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES
import logging

logger = logging.getLogger(__name__)

class NotificationRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['NOTIFICATIONS']

    def get_by_user_id(self, user_id: str, limit: int = 100) -> List[Dict]:
        """Get notifications by user ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            query = self.db.collection(self.collection).where('userId', '==', user_id).order_by('createdAt', direction=firestore.Query.DESCENDING).limit(limit)
            docs = query.stream()
            return [{'notificationId': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            # If order_by fails due to missing index, try without ordering
            logger.warning(f"Order by failed for notifications, trying without order: {e}")
            try:
                query = self.db.collection(self.collection).where('userId', '==', user_id).limit(limit)
                docs = query.stream()
                results = [{'notificationId': doc.id, **doc.to_dict()} for doc in docs]
                # Sort in memory
                results.sort(key=lambda x: x.get('createdAt', ''), reverse=True)
                return results
            except Exception as e2:
                logger.error(f"Error fetching notifications for user {user_id}: {e2}", exc_info=True)
                raise

    def get_by_id(self, notification_id: str) -> Optional[Dict]:
        """Get notification by ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(notification_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['notificationId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching notification {notification_id}: {e}", exc_info=True)
            raise

    def create(self, notification_data: Dict) -> Dict:
        """Create notification"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            notification_id = notification_data.pop('notificationId', None)
            if not notification_id:
                raise ValueError("notificationId is required")
            doc_ref = self.db.collection(self.collection).document(notification_id)
            doc_ref.set(notification_data)
            notification_data['notificationId'] = notification_id
            return notification_data
        except Exception as e:
            logger.error(f"Error creating notification: {e}", exc_info=True)
            raise

    def update(self, notification_id: str, updates: Dict) -> None:
        """Update notification"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(notification_id)
            doc_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating notification {notification_id}: {e}", exc_info=True)
            raise

    def delete(self, notification_id: str) -> None:
        """Delete notification"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(notification_id)
            doc_ref.delete()
        except Exception as e:
            logger.error(f"Error deleting notification {notification_id}: {e}", exc_info=True)
            raise

