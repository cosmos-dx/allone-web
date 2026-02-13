"""
Password Repository - Data access layer for passwords
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES, QUERY_LIMITS
from backend.services.cache_service import cache_service
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300

class PasswordRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['PASSWORDS']

    def get_by_user_id(self, user_id: str, space_id: Optional[str] = None, include_shared: bool = True) -> List[Dict]:
        """Get passwords by user ID, optionally filtered by space and including shared items"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        cache_key = f"passwords_{user_id}_{space_id or 'all'}_{include_shared}"
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            passwords = []
            
            query = self.db.collection(self.collection).where('userId', '==', user_id)
            if space_id:
                query = query.where('spaceId', '==', space_id)
            docs = query.limit(QUERY_LIMITS['PASSWORDS']).stream()
            for doc in docs:
                data = doc.to_dict()
                data['passwordId'] = doc.id
                data['isShared'] = False
                passwords.append(data)
            
            if include_shared:
                member_spaces = self.db.collection(COLLECTIONS['SPACES']).where('members', 'array_contains', user_id).stream()
                shared_space_ids = [doc.id for doc in member_spaces]
                
                if len(shared_space_ids) > 0 and len(shared_space_ids) <= 10:
                    space_cache_key = f"spaces_member_{user_id}"
                    space_cache = cache_service.get(space_cache_key)
                    if space_cache is None:
                        cache_service.set(space_cache_key, shared_space_ids, CACHE_TTL)
                    
                    if space_id:
                        if space_id in shared_space_ids:
                            shared_query = self.db.collection(self.collection).where('spaceId', '==', space_id)
                            shared_docs = shared_query.limit(QUERY_LIMITS['PASSWORDS']).stream()
                            for doc in shared_docs:
                                data = doc.to_dict()
                                if data.get('userId') != user_id:
                                    data['passwordId'] = doc.id
                                    data['isShared'] = True
                                    passwords.append(data)
                    else:
                        for shared_space_id in shared_space_ids:
                            shared_query = self.db.collection(self.collection).where('spaceId', '==', shared_space_id)
                            shared_docs = shared_query.limit(QUERY_LIMITS['PASSWORDS']).stream()
                            for doc in shared_docs:
                                data = doc.to_dict()
                                if data.get('userId') != user_id:
                                    data['passwordId'] = doc.id
                                    data['isShared'] = True
                                    passwords.append(data)
                else:
                    for shared_space_id in shared_space_ids:
                        if space_id and space_id != shared_space_id:
                            continue
                        shared_query = self.db.collection(self.collection).where('spaceId', '==', shared_space_id)
                        shared_docs = shared_query.limit(QUERY_LIMITS['PASSWORDS']).stream()
                        for doc in shared_docs:
                            data = doc.to_dict()
                            if data.get('userId') != user_id:
                                data['passwordId'] = doc.id
                                data['isShared'] = True
                                passwords.append(data)
            
            cache_service.set(cache_key, passwords, CACHE_TTL)
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
            
            user_id = password_data.get('userId')
            if user_id:
                cache_service.invalidate_pattern(f"passwords_{user_id}_")
            
            return password_data
        except Exception as e:
            logger.error(f"Error creating password: {e}", exc_info=True)
            raise

    def update(self, password_id: str, updates: Dict) -> None:
        """Update password"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            existing = self.get_by_id(password_id)
            doc_ref = self.db.collection(self.collection).document(password_id)
            doc_ref.update(updates)
            
            if existing:
                user_id = existing.get('userId')
                if user_id:
                    cache_service.invalidate_pattern(f"passwords_{user_id}_")
        except Exception as e:
            logger.error(f"Error updating password {password_id}: {e}", exc_info=True)
            raise

    def delete(self, password_id: str) -> None:
        """Delete password"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            existing = self.get_by_id(password_id)
            doc_ref = self.db.collection(self.collection).document(password_id)
            doc_ref.delete()
            
            if existing:
                user_id = existing.get('userId')
                if user_id:
                    cache_service.invalidate_pattern(f"passwords_{user_id}_")
        except Exception as e:
            logger.error(f"Error deleting password {password_id}: {e}", exc_info=True)
            raise

