"""
TOTP Repository - Data access layer for TOTP secrets
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES, QUERY_LIMITS
from backend.services.cache_service import cache_service
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300

class TOTPRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['TOTP_SECRETS']

    def get_by_user_id(self, user_id: str, space_id: Optional[str] = None, include_shared: bool = True) -> List[Dict]:
        """Get TOTPs by user ID, optionally filtered by space and including shared items"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        cache_key = f"totps_{user_id}_{space_id or 'all'}_{include_shared}"
        cached = cache_service.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            totps = []
            
            query = self.db.collection(self.collection).where('userId', '==', user_id)
            if space_id:
                query = query.where('spaceId', '==', space_id)
            docs = query.limit(QUERY_LIMITS['TOTP']).stream()
            for doc in docs:
                data = doc.to_dict()
                data['totpId'] = doc.id
                data['isShared'] = False
                totps.append(data)
            
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
                            shared_docs = shared_query.limit(QUERY_LIMITS['TOTP']).stream()
                            for doc in shared_docs:
                                data = doc.to_dict()
                                if data.get('userId') != user_id:
                                    data['totpId'] = doc.id
                                    data['isShared'] = True
                                    totps.append(data)
                    else:
                        for shared_space_id in shared_space_ids:
                            shared_query = self.db.collection(self.collection).where('spaceId', '==', shared_space_id)
                            shared_docs = shared_query.limit(QUERY_LIMITS['TOTP']).stream()
                            for doc in shared_docs:
                                data = doc.to_dict()
                                if data.get('userId') != user_id:
                                    data['totpId'] = doc.id
                                    data['isShared'] = True
                                    totps.append(data)
                else:
                    for shared_space_id in shared_space_ids:
                        if space_id and space_id != shared_space_id:
                            continue
                        shared_query = self.db.collection(self.collection).where('spaceId', '==', shared_space_id)
                        shared_docs = shared_query.limit(QUERY_LIMITS['TOTP']).stream()
                        for doc in shared_docs:
                            data = doc.to_dict()
                            if data.get('userId') != user_id:
                                data['totpId'] = doc.id
                                data['isShared'] = True
                                totps.append(data)
            
            cache_service.set(cache_key, totps, CACHE_TTL)
            return totps
        except Exception as e:
            logger.error(f"Error fetching TOTPs: {e}", exc_info=True)
            raise

    def get_by_id(self, totp_id: str) -> Optional[Dict]:
        """Get TOTP by ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(totp_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['totpId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching TOTP {totp_id}: {e}", exc_info=True)
            raise

    def create(self, totp_data: Dict) -> Dict:
        """Create TOTP"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            totp_id = totp_data.pop('totpId', None)
            if not totp_id:
                raise ValueError("totpId is required")
            doc_ref = self.db.collection(self.collection).document(totp_id)
            doc_ref.set(totp_data)
            totp_data['totpId'] = totp_id
            
            user_id = totp_data.get('userId')
            if user_id:
                cache_service.invalidate_pattern(f"totps_{user_id}_")
            
            return totp_data
        except Exception as e:
            logger.error(f"Error creating TOTP: {e}", exc_info=True)
            raise

    def update(self, totp_id: str, updates: Dict) -> None:
        """Update TOTP"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            existing = self.get_by_id(totp_id)
            doc_ref = self.db.collection(self.collection).document(totp_id)
            doc_ref.update(updates)
            
            if existing:
                user_id = existing.get('userId')
                if user_id:
                    cache_service.invalidate_pattern(f"totps_{user_id}_")
        except Exception as e:
            logger.error(f"Error updating TOTP {totp_id}: {e}", exc_info=True)
            raise

    def delete(self, totp_id: str) -> None:
        """Delete TOTP"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            existing = self.get_by_id(totp_id)
            doc_ref = self.db.collection(self.collection).document(totp_id)
            doc_ref.delete()
            
            if existing:
                user_id = existing.get('userId')
                if user_id:
                    cache_service.invalidate_pattern(f"totps_{user_id}_")
        except Exception as e:
            logger.error(f"Error deleting TOTP {totp_id}: {e}", exc_info=True)
            raise

