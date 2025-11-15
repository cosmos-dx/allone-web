"""
Bill Repository - Data access layer for bills
"""
from typing import Dict, Optional, List
from firebase_admin import firestore
from backend.constants import COLLECTIONS, ERROR_MESSAGES
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class BillRepository:
    def __init__(self, db: firestore.Client):
        self.db = db
        self.collection = COLLECTIONS['BILLS']
        self.settlements_collection = COLLECTIONS['BILL_SETTLEMENTS']

    def get_by_id(self, bill_id: str) -> Optional[Dict]:
        """Get bill by ID"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc = self.db.collection(self.collection).document(bill_id).get()
            if doc.exists:
                data = doc.to_dict()
                data['billId'] = doc.id
                return data
            return None
        except Exception as e:
            logger.error(f"Error fetching bill {bill_id}: {e}", exc_info=True)
            raise

    def get_by_space_id(self, space_id: str) -> List[Dict]:
        """Get all bills for a space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            # Try with order_by first, fallback to without if index is missing
            try:
                docs = self.db.collection(self.collection).where('spaceId', '==', space_id).order_by('date', direction=firestore.Query.DESCENDING).stream()
                bills = [{'billId': doc.id, **doc.to_dict()} for doc in docs]
            except Exception as order_error:
                # If order_by fails (missing index), fetch without ordering and sort in Python
                logger.warning(f"Order by failed (may need Firestore index): {order_error}. Fetching without order_by.")
                docs = self.db.collection(self.collection).where('spaceId', '==', space_id).stream()
                bills = [{'billId': doc.id, **doc.to_dict()} for doc in docs]
                # Sort by date descending in Python
                bills.sort(key=lambda x: x.get('date', ''), reverse=True)
            return bills
        except Exception as e:
            logger.error(f"Error fetching bills for space {space_id}: {e}", exc_info=True)
            raise

    def create(self, bill_data: Dict) -> Dict:
        """Create new bill"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            bill_id = bill_data.get('billId')
            if not bill_id:
                raise ValueError("billId is required")
            
            # Remove billId from data before storing (it's the document ID)
            bill_doc = {k: v for k, v in bill_data.items() if k != 'billId'}
            
            # Ensure all required fields are present
            required_fields = ['spaceId', 'createdBy', 'title', 'amount', 'date', 'splitType', 'participants']
            for field in required_fields:
                if field not in bill_doc:
                    logger.warning(f"Missing required field '{field}' in bill data")
            
            # Convert Pydantic models to dicts if needed
            if 'participants' in bill_doc and bill_doc['participants']:
                bill_doc['participants'] = [
                    p if isinstance(p, dict) else p.model_dump() if hasattr(p, 'model_dump') else p
                    for p in bill_doc['participants']
                ]
            
            # Convert splitType enum to string if needed
            if 'splitType' in bill_doc and not isinstance(bill_doc['splitType'], str):
                bill_doc['splitType'] = str(bill_doc['splitType'])
            
            doc_ref = self.db.collection(self.collection).document(bill_id)
            doc_ref.set(bill_doc)
            bill_doc['billId'] = bill_id
            return bill_doc
        except Exception as e:
            logger.error(f"Error creating bill: {e}", exc_info=True)
            logger.error(f"Bill data: {bill_data}")
            raise

    def update(self, bill_id: str, updates: Dict) -> None:
        """Update bill"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(bill_id)
            doc_ref.update(updates)
        except Exception as e:
            logger.error(f"Error updating bill {bill_id}: {e}", exc_info=True)
            raise

    def delete(self, bill_id: str) -> None:
        """Delete bill"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            doc_ref = self.db.collection(self.collection).document(bill_id)
            doc_ref.delete()
        except Exception as e:
            logger.error(f"Error deleting bill {bill_id}: {e}", exc_info=True)
            raise

    def mark_participant_paid(self, bill_id: str, user_id: str, amount: float, paid_at: str, notes: Optional[str] = None) -> Dict:
        """Mark participant as paid and create settlement record"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            # Get bill
            bill = self.get_by_id(bill_id)
            if not bill:
                raise ValueError(ERROR_MESSAGES['BILL_NOT_FOUND'])
            
            # Update participant
            participants = bill.get('participants', [])
            participant_found = False
            for participant in participants:
                if participant.get('userId') == user_id:
                    participant['paid'] = True
                    participant['paidAt'] = paid_at
                    participant_found = True
                    break
            
            if not participant_found:
                raise ValueError(ERROR_MESSAGES['PARTICIPANT_NOT_FOUND'])
            
            # Check if all participants are paid
            all_paid = all(p.get('paid', False) for p in participants)
            
            # Update bill
            self.update(bill_id, {
                'participants': participants,
                'isSettled': all_paid,
                'updatedAt': datetime.now(timezone.utc).isoformat()
            })
            
            # Create settlement record
            settlement_id = f"settlement_{bill_id}_{user_id}_{int(datetime.now(timezone.utc).timestamp())}"
            settlement_data = {
                'billId': bill_id,
                'userId': user_id,
                'amount': amount,
                'paidAt': paid_at,
                'notes': notes,
                'createdAt': datetime.now(timezone.utc).isoformat()
            }
            self.db.collection(self.settlements_collection).document(settlement_id).set(settlement_data)
            
            return settlement_data
        except Exception as e:
            logger.error(f"Error marking participant paid: {e}", exc_info=True)
            raise

    def calculate_balances(self, space_id: str) -> Dict:
        """Calculate net balances (who owes whom) for a space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            bills = self.get_by_space_id(space_id)
            
            # Track debts and credits for each user
            user_balances = {}  # {userId: {'debts': 0, 'credits': 0}}
            
            for bill in bills:
                if bill.get('isSettled'):
                    continue  # Skip settled bills
                
                participants = bill.get('participants', [])
                created_by = bill.get('createdBy')
                total_amount = bill.get('amount', 0)
                
                # The creator paid the bill, so they are owed money
                if created_by not in user_balances:
                    user_balances[created_by] = {'debts': 0, 'credits': 0}
                user_balances[created_by]['credits'] += total_amount
                
                # Participants owe their share
                for participant in participants:
                    user_id = participant.get('userId')
                    if user_id == created_by:
                        # Creator's share is already accounted for
                        user_balances[user_id]['credits'] -= participant.get('amount', 0)
                    else:
                        if user_id not in user_balances:
                            user_balances[user_id] = {'debts': 0, 'credits': 0}
                        user_balances[user_id]['debts'] += participant.get('amount', 0)
            
            # Calculate net balances
            balances = []
            for user_id, balance in user_balances.items():
                net = balance['credits'] - balance['debts']
                if abs(net) > 0.01:  # Only include significant balances
                    balances.append({
                        'userId': user_id,
                        'netBalance': round(net, 2),
                        'debts': round(balance['debts'], 2),
                        'credits': round(balance['credits'], 2)
                    })
            
            return {'balances': balances}
        except Exception as e:
            logger.error(f"Error calculating balances: {e}", exc_info=True)
            raise

    def get_settlement_history(self, space_id: str) -> List[Dict]:
        """Get settlement history for a space"""
        if not self.db:
            raise ValueError(ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        try:
            # Get all bills for the space
            bills = self.get_by_space_id(space_id)
            bill_ids = [bill['billId'] for bill in bills]
            
            if not bill_ids:
                return []
            
            # Get all settlements for these bills
            # Use individual queries (no order_by to avoid index requirements)
            # We'll sort in Python instead
            settlements = []
            for bill_id in bill_ids:
                try:
                    docs = self.db.collection(self.settlements_collection).where('billId', '==', bill_id).stream()
                    for doc in docs:
                        data = doc.to_dict()
                        if data:  # Ensure data exists
                            data['settlementId'] = doc.id
                            settlements.append(data)
                except Exception as e:
                    logger.warning(f"Failed to get settlements for bill {bill_id}: {e}")
                    continue
            
            # Sort by paidAt descending (handle missing paidAt by putting them last)
            settlements.sort(key=lambda x: x.get('paidAt', ''), reverse=True)
            return settlements
        except Exception as e:
            logger.error(f"Error fetching settlement history: {e}", exc_info=True)
            raise

