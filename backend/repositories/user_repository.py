"""
User Repository - Data access layer for users
"""
from typing import Dict, Optional, List
from firebase_admin import firestore, auth
from backend.constants import COLLECTIONS, ERROR_MESSAGES
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['USERS']

    def get_by_id(self, user_id: str) -> Optional[Dict]:
        """Get user by ID (excludes inactive users unless explicitly requested)"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(user_id).get()
            if doc.exists:
                data = doc.to_dict()
                # Filter out inactive users (soft deleted)
                if data.get('active') is False:
                    return None
                data['userId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching user {user_id}: {e}", exc_info=True)
            raise

    def create(self, user_data: Dict) -> Dict:
        """Create user"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            user_id = user_data['userId']
            doc_ref = self.db.collection(self.collection).document(user_id)
            doc_ref.set(user_data)
            return user_data
        except Exception as e:
            logger.error(f"Error creating user: {e}", exc_info=True)
            raise

    def update(self, user_id: str, updates: Dict) -> None:
        """Update user"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(user_id)
            doc_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating user {user_id}: {e}", exc_info=True)
            raise

    def search(self, query: str, limit: int = 20) -> List[Dict]:
        """Search users by name or email in Firestore and Firebase Auth"""
        search_query = query.lower().strip()
        if not search_query or len(search_query) < 2:
            logger.warning(f"Search query too short: '{query}'")
            return []
        
        logger.info(f"🔍 Starting user search for query: '{query}' (normalized: '{search_query}')")
        results = []
        seen_user_ids = set()
        
        # First, search Firebase Auth users (authenticated users)
        logger.info("📍 Searching Firebase Authentication users...")
        try:
            # List Firebase Auth users (paginated, but limit total pages for performance)
            max_pages = 10  # Limit to first 10 pages (1000 users per page = 10,000 users max)
            page = auth.list_users(max_results=1000)
            page_count = 0
            total_users_checked = 0
            
            while page and page_count < max_pages:
                users_list = list(page.users)
                total_users_checked += len(users_list)
                logger.info(f"  📄 Page {page_count + 1}: Checking {len(users_list)} users (total checked: {total_users_checked})")
                
                for user_record in users_list:
                    if len(results) >= limit:
                        break
                    
                    user_id = user_record.uid
                    if user_id in seen_user_ids:
                        continue
                    
                    email = (user_record.email or '').lower()
                    display_name = (user_record.display_name or '').lower()
                    
                    # Log each user being checked (for debugging)
                    logger.debug(f"  👤 Checking user: {user_record.email} (name: {user_record.display_name})")
                    
                    # Check if search query matches email or display name
                    email_match = search_query in email
                    name_match = search_query in display_name
                    
                    if email_match or name_match:
                        logger.info(f"  ✅ MATCH FOUND: {user_record.email} (email_match: {email_match}, name_match: {name_match})")
                        # Check if user exists in Firestore for additional data
                        firestore_user = None
                        if self.db:
                            try:
                                doc = self.db.collection(self.collection).document(user_id).get()
                                if doc.exists:
                                    firestore_user = doc.to_dict()
                                    logger.debug(f"  📝 Found Firestore data for {user_id}")
                            except Exception as fs_error:
                                logger.debug(f"  ⚠️  Firestore lookup failed for {user_id}: {fs_error}")
                        
                        results.append({
                            'userId': user_id,
                            'email': user_record.email or '',
                            'displayName': firestore_user.get('displayName') if firestore_user else user_record.display_name or '',
                            'photoURL': firestore_user.get('photoURL') if firestore_user else user_record.photo_url or ''
                        })
                        seen_user_ids.add(user_id)
                
                if len(results) >= limit:
                    break
                
                page_count += 1
                # Get next page if available
                try:
                    page = page.get_next_page()
                except Exception as page_error:
                    logger.debug(f"  📄 No more pages available: {page_error}")
                    page = None
                    break
            
            logger.info(f"✅ Firebase Auth search complete: Found {len(results)} users matching '{query}' (checked {total_users_checked} total users)")
            
        except Exception as e:
            logger.error(f"❌ Error searching Firebase Auth users: {e}", exc_info=True)
            # Fall back to Firestore search if Auth search fails
            # Check if it's a permissions issue
            if 'permission' in str(e).lower() or 'unauthorized' in str(e).lower():
                logger.error("🔒 Firebase Admin Auth permissions issue. Ensure service account has 'Firebase Authentication Admin' role.")
            else:
                logger.error(f"🔒 Firebase Auth error type: {type(e).__name__}, message: {str(e)}")
        
        # If we haven't reached the limit, also search Firestore for users not in Auth
        if len(results) < limit and self.db:
            logger.info(f"📍 Searching Firestore users collection (need {limit - len(results)} more results)...")
            try:
                # Filter out inactive users (active field is not False)
                all_users = self.db.collection(self.collection).limit(500).stream()
                firestore_count = 0
                
                for doc in all_users:
                    if len(results) >= limit:
                        break
                    
                    user_id = doc.id
                    if user_id in seen_user_ids:
                        continue
                    
                    firestore_count += 1
                    user_data = doc.to_dict()
                    # Filter out inactive users (soft deleted)
                    if user_data.get('active') is False:
                        continue
                    
                    email = user_data.get('email', '').lower()
                    display_name = user_data.get('displayName', '').lower()
                    
                    # Check if search query matches email or display name
                    if search_query in email or search_query in display_name:
                        logger.info(f"  ✅ Firestore MATCH: {user_data.get('email')}")
                        results.append({
                            'userId': user_id,
                            'email': user_data.get('email', ''),
                            'displayName': user_data.get('displayName', ''),
                            'photoURL': user_data.get('photoURL', '')
                        })
                        seen_user_ids.add(user_id)
                
                logger.info(f"✅ Firestore search complete: Checked {firestore_count} users, found {len(results)} total matches")
                
            except Exception as e:
                logger.error(f"❌ Error searching Firestore users: {e}", exc_info=True)
        
        logger.info(f"🎯 FINAL RESULT: Returning {len(results)} users for query '{query}'")
        return results[:limit]

