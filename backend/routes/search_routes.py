"""
Search routes
"""
import logging
from fastapi import APIRouter, HTTPException, Depends
from backend.models import SearchQuery
from backend.middleware.auth import verify_token
from backend.config import db
from backend.constants import QUERY_LIMITS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/search", tags=["search"])

@router.post("")
async def search(search_query: SearchQuery, token_data: dict = Depends(verify_token)):
    user_id = token_data['uid']
    query_text = search_query.query.lower()
    
    if not db:
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Search passwords in Firestore - optimized with limit
        password_docs = db.collection('passwords').where('userId', '==', user_id).limit(QUERY_LIMITS['PASSWORDS']).stream()
        passwords = []
        for doc in password_docs:
            data = doc.to_dict()
            if (query_text in data.get('displayName', '').lower() or
                query_text in data.get('username', '').lower() or
                query_text in data.get('website', '').lower() or
                query_text in data.get('category', '').lower()):
                passwords.append({'passwordId': doc.id, **data})
        
        # Search TOTP in Firestore - optimized with limit
        totp_docs = db.collection('totpSecrets').where('userId', '==', user_id).limit(QUERY_LIMITS['TOTP']).stream()
        totps = []
        for doc in totp_docs:
            data = doc.to_dict()
            if (query_text in data.get('serviceName', '').lower() or
                query_text in data.get('account', '').lower()):
                totps.append({'totpId': doc.id, **data})
        
        return {
            "passwords": passwords[:QUERY_LIMITS['SEARCH_RESULTS']],
            "totps": totps[:QUERY_LIMITS['SEARCH_RESULTS']]
        }
    except Exception as e:
        logger.error(f"Search error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

