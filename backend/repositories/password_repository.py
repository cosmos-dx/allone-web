"""
Password Repository - Data access layer for passwords
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES, QUERY_LIMITS
import logging

logger = logging.getLogger(__name__)

class PasswordRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['PASSWORDS']

    def get_by_user_id(self, user_id: str, space_id: Optional[str] = None, include_shared: bool = True) -> List[Dict]:
        """Get passwords by user ID, optionally filtered by space and including shared items"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            passwords = []
            
            # Get passwords owned by user
            query = self.db.collection(self.collection).where('userId', '==', user_id)
            if space_id:
                query = query.where('spaceId', '==', space_id)
            docs = query.limit(QUERY_LIMITS['PASSWORDS']).stream()
            for doc in docs:
                data = doc.to_dict()
                data['passwordId'] = doc.id
                data['isShared'] = False
                passwords.append(data)
            
            # Get shared passwords if include_shared is True
            if include_shared:
                # Get spaces where user is a member
                member_spaces = self.db.collection(COLLECTIONS['SPACES']).where('members', 'array_contains', user_id).stream()
                shared_space_ids = [doc.id for doc in member_spaces]
                
                # Get passwords from shared spaces
                for shared_space_id in shared_space_ids:
                    shared_query = self.db.collection(self.collection).where('spaceId', '==', shared_space_id)
                    if space_id and space_id != shared_space_id:
                        continue
                    shared_docs = shared_query.limit(QUERY_LIMITS['PASSWORDS']).stream()
                    for doc in shared_docs:
                        data = doc.to_dict()
                        # Don't include if user owns it (already in list)
                        if data.get('userId') != user_id:
                            data['passwordId'] = doc.id
                            data['isShared'] = True
                            passwords.append(data)
            
            return passwords
        except Exception as e:
            logger.error(f"Error fetching passwords: {e}", exc_info=True)
            raise

    def get_by_id(self, password_id: str) -> Optional[Dict]:
        """Get password by ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(password_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['passwordId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching password {password_id}: {e}", exc_info=True)
            raise

    def create(self, password_data: Dict) -> Dict:
        """Create password"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            password_id = password_data.pop('passwordId', None)
            if not password_id:
                raise ValueError("passwordId is required")
            doc_ref = self.db.collection(self.collection).document(password_id)
            doc_ref.set(password_data)
            password_data['passwordId'] = password_id
            return password_data
        except Exception as e:
            logger.error(f"Error creating password: {e}", exc_info=True)
            raise

    def update(self, password_id: str, updates: Dict) -> None:
        """Update password"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(password_id)
            doc_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating password {password_id}: {e}", exc_info=True)
            raise

    def delete(self, password_id: str) -> None:
        """Delete password"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(password_id)
            doc_ref.delete()
        except Exception as e:
            logger.error(f"Error deleting password {password_id}: {e}", exc_info=True)
            raise

