"""
Space Repository - Data access layer for spaces
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES
import logging

logger = logging.getLogger(__name__)

class SpaceRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['SPACES']

    def get_by_owner_id(self, owner_id: str) -> List[Dict]:
        """Get spaces by owner ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            docs = self.db.collection(self.collection).where('ownerId', '==', owner_id).stream()
            return [{'spaceId': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error fetching spaces for owner {owner_id}: {e}", exc_info=True)
            raise

    def get_by_member_id(self, member_id: str) -> List[Dict]:
        """Get spaces where user is a member"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            docs = self.db.collection(self.collection).where('members', 'array_contains', member_id).stream()
            return [{'spaceId': doc.id, **doc.to_dict()} for doc in docs]
        except Exception as e:
            logger.error(f"Error fetching spaces for member {member_id}: {e}", exc_info=True)
            raise

    def get_all_for_user(self, user_id: str) -> List[Dict]:
        """Get all spaces where user is owner or member"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            owned = self.get_by_owner_id(user_id)
            member_of = self.get_by_member_id(user_id)
            
            # Combine and deduplicate
            space_dict = {}
            for space in owned + member_of:
                space_id = space['spaceId']
                if space_id not in space_dict:
                    space_dict[space_id] = space
            
            return list(space_dict.values())
        except Exception as e:
            logger.error(f"Error fetching all spaces for user {user_id}: {e}", exc_info=True)
            raise

    def get_by_id(self, space_id: str) -> Optional[Dict]:
        """Get space by ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(space_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['spaceId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching space {space_id}: {e}", exc_info=True)
            raise

    def create(self, space_data: Dict) -> Dict:
        """Create space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            space_id = space_data.pop('spaceId')
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc_ref.set(space_data)
            space_data['spaceId'] = space_id
            return space_data
        except Exception as e:
            logger.error(f"Error creating space: {e}", exc_info=True)
            raise

    def update(self, space_id: str, updates: Dict) -> None:
        """Update space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating space {space_id}: {e}", exc_info=True)
            raise

    def delete(self, space_id: str) -> None:
        """Delete space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc_ref.delete()
        except Exception as e:
            logger.error(f"Error deleting space {space_id}: {e}", exc_info=True)
            raise

    def add_member(self, space_id: str, member_id: str) -> Dict:
        """Add member to space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc = doc_ref.get()
            if not doc.exists:
                raise ValueError(ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            space_data = doc.to_dict()
            members = space_data.get('members', [])
            if member_id not in members:
                members.append(member_id)
                doc_ref.update({'members': members})
            
            updated_doc = doc_ref.get()
            updated_data = updated_doc.to_dict()
            updated_data['spaceId'] = space_id
            return updated_data
        except Exception as e:
            logger.error(f"Error adding member to space {space_id}: {e}", exc_info=True)
            raise

    def remove_member(self, space_id: str, member_id: str) -> Dict:
        """Remove member from space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc = doc_ref.get()
            if not doc.exists:
                raise ValueError(ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            space_data = doc.to_dict()
            members = space_data.get('members', [])
            if member_id in members:
                members.remove(member_id)
                doc_ref.update({'members': members})
            
            updated_doc = doc_ref.get()
            updated_data = updated_doc.to_dict()
            updated_data['spaceId'] = space_id
            return updated_data
        except Exception as e:
            logger.error(f"Error removing member from space {space_id}: {e}", exc_info=True)
            raise

    def transfer_ownership(self, space_id: str, new_owner_id: str) -> Dict:
        """Transfer space ownership"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc = doc_ref.get()
            if not doc.exists:
                raise ValueError(ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            space_data = doc.to_dict()
            old_owner_id = space_data.get('ownerId')
            
            # Update owner
            updates = {'ownerId': new_owner_id}
            
            # Add old owner to members if not already there
            members = space_data.get('members', [])
            if old_owner_id not in members:
                members.append(old_owner_id)
            updates['members'] = members
            
            # Remove new owner from members if they were a member
            if new_owner_id in members:
                members.remove(new_owner_id)
                updates['members'] = members
            
            doc_ref.update(updates)
            
            updated_doc = doc_ref.get()
            updated_data = updated_doc.to_dict()
            updated_data['spaceId'] = space_id
            return updated_data
        except Exception as e:
            logger.error(f"Error transferring ownership of space {space_id}: {e}", exc_info=True)
            raise

    def add_admin(self, space_id: str, admin_id: str) -> Dict:
        """Add admin to space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc = doc_ref.get()
            if not doc.exists:
                raise ValueError(ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            space_data = doc.to_dict()
            admins = space_data.get('admins', [])
            if admin_id not in admins:
                admins.append(admin_id)
                doc_ref.update({'admins': admins})
            
            updated_doc = doc_ref.get()
            updated_data = updated_doc.to_dict()
            updated_data['spaceId'] = space_id
            return updated_data
        except Exception as e:
            logger.error(f"Error adding admin to space {space_id}: {e}", exc_info=True)
            raise

    def remove_admin(self, space_id: str, admin_id: str) -> Dict:
        """Remove admin from space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(space_id)
            doc = doc_ref.get()
            if not doc.exists:
                raise ValueError(ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            space_data = doc.to_dict()
            admins = space_data.get('admins', [])
            if admin_id in admins:
                admins.remove(admin_id)
                doc_ref.update({'admins': admins})
            
            updated_doc = doc_ref.get()
            updated_data = updated_doc.to_dict()
            updated_data['spaceId'] = space_id
            return updated_data
        except Exception as e:
            logger.error(f"Error removing admin from space {space_id}: {e}", exc_info=True)
            raise

