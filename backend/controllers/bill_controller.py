"""
Bill Controller - Business logic for bill management
"""
import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional
from fastapi import HTTPException
from backend.models import Bill, BillCreate, SettlementRequest
from backend.config import bill_repo, space_repo
from backend.constants import ERROR_MESSAGES

logger = logging.getLogger(__name__)


class BillController:
    @staticmethod
    def validate_split_amounts(bill_data: BillCreate) -> None:
        """Validate that split amounts match bill total"""
        total = bill_data.amount
        participant_total = sum(p.amount for p in bill_data.participants)
        
        if bill_data.splitType.value == "partial":
            # Partial splits allow unassigned amount
            if participant_total > total:
                raise HTTPException(status_code=400, detail="Participant amounts cannot exceed bill total")
        else:
            # Other split types must match exactly
            if abs(participant_total - total) > 0.01:  # Allow small floating point differences
                raise HTTPException(
                    status_code=400, 
                    detail=f"Participant amounts ({participant_total}) must equal bill total ({total})"
                )

    @staticmethod
    def create_bill(space_id: str, bill_data: BillCreate, user_id: str) -> Bill:
        """Create a new bill in a space"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists and user is a member
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        # Validate split amounts
        try:
            BillController.validate_split_amounts(bill_data)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Split validation error: {e}", exc_info=True)
            raise HTTPException(status_code=400, detail=f"Invalid split configuration: {str(e)}")
        
        # Ensure spaceId matches
        if bill_data.spaceId != space_id:
            raise HTTPException(status_code=400, detail="Space ID mismatch")
        
        bill_id = f"bill_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        
        try:
            # Convert Pydantic model to dict
            bill_dict = bill_data.model_dump()
            
            # Convert participants from Pydantic models to dicts
            if 'participants' in bill_dict and bill_dict['participants']:
                bill_dict['participants'] = [
                    p.model_dump() if hasattr(p, 'model_dump') else p
                    for p in bill_dict['participants']
                ]
            
            # Convert splitType enum to string
            if 'splitType' in bill_dict:
                split_type = bill_dict['splitType']
                if hasattr(split_type, 'value'):
                    bill_dict['splitType'] = split_type.value
                elif not isinstance(split_type, str):
                    bill_dict['splitType'] = str(split_type)
            
            doc = {
                "billId": bill_id,
                "spaceId": space_id,
                "createdBy": user_id,
                **bill_dict,
                "createdAt": now,
                "updatedAt": now,
                "isSettled": False
            }
            
            logger.info(f"Creating bill with data: {doc}")
            created = bill_repo.create(doc)
            logger.info(f"Bill created successfully: {bill_id}")
            return Bill(**created)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating bill: {e}", exc_info=True)
            logger.error(f"Bill data received: {bill_data}")
            raise HTTPException(status_code=500, detail=f"Failed to create bill: {str(e)}")

    @staticmethod
    def get_bills(space_id: str, user_id: str) -> List[Bill]:
        """Get all bills for a space"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists and user is a member
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        try:
            bills = bill_repo.get_by_space_id(space_id)
            return [Bill(**bill) for bill in bills]
        except Exception as e:
            logger.error(f"Error fetching bills: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to fetch bills: {str(e)}")

    @staticmethod
    def get_bill(space_id: str, bill_id: str, user_id: str) -> Bill:
        """Get a single bill"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists and user is a member
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        try:
            bill = bill_repo.get_by_id(bill_id)
            if not bill:
                raise HTTPException(status_code=404, detail=ERROR_MESSAGES['BILL_NOT_FOUND'])
            
            if bill.get('spaceId') != space_id:
                raise HTTPException(status_code=400, detail="Bill does not belong to this space")
            
            return Bill(**bill)
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error fetching bill: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to fetch bill: {str(e)}")

    @staticmethod
    def update_bill(space_id: str, bill_id: str, bill_data: BillCreate, user_id: str) -> Bill:
        """Update a bill"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        # Verify bill exists and belongs to space
        existing = bill_repo.get_by_id(bill_id)
        if not existing:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['BILL_NOT_FOUND'])
        
        if existing.get('spaceId') != space_id:
            raise HTTPException(status_code=400, detail="Bill does not belong to this space")
        
        # Only creator can update
        if existing.get('createdBy') != user_id:
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        # Validate split amounts
        BillController.validate_split_amounts(bill_data)
        
        update_doc = {
            **bill_data.model_dump(),
            "updatedAt": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            bill_repo.update(bill_id, update_doc)
            updated = bill_repo.get_by_id(bill_id)
            return Bill(**updated)
        except Exception as e:
            logger.error(f"Error updating bill: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to update bill: {str(e)}")

    @staticmethod
    def delete_bill(space_id: str, bill_id: str, user_id: str) -> Dict:
        """Delete a bill"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        # Verify bill exists
        existing = bill_repo.get_by_id(bill_id)
        if not existing:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['BILL_NOT_FOUND'])
        
        if existing.get('spaceId') != space_id:
            raise HTTPException(status_code=400, detail="Bill does not belong to this space")
        
        # Only creator can delete
        if existing.get('createdBy') != user_id:
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        try:
            bill_repo.delete(bill_id)
            return {"message": "Bill deleted successfully"}
        except Exception as e:
            logger.error(f"Error deleting bill: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to delete bill: {str(e)}")

    @staticmethod
    def settle_bill(space_id: str, bill_id: str, settlement: SettlementRequest, user_id: str) -> Dict:
        """Mark a participant as paid"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        # Verify bill exists
        bill = bill_repo.get_by_id(bill_id)
        if not bill:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['BILL_NOT_FOUND'])
        
        if bill.get('spaceId') != space_id:
            raise HTTPException(status_code=400, detail="Bill does not belong to this space")
        
        # Verify user is a member of the space
        if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        # Verify participant exists in bill
        participants = bill.get('participants', [])
        participant = next((p for p in participants if p.get('userId') == settlement.userId), None)
        if not participant:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['PARTICIPANT_NOT_FOUND'])
        
        try:
            paid_at = datetime.now(timezone.utc).isoformat()
            settlement_data = bill_repo.mark_participant_paid(
                bill_id, 
                settlement.userId, 
                settlement.amount, 
                paid_at,
                settlement.notes
            )
            return {"message": "Payment recorded successfully", "settlement": settlement_data}
        except Exception as e:
            logger.error(f"Error settling bill: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to record payment: {str(e)}")

    @staticmethod
    def get_balances(space_id: str, user_id: str) -> Dict:
        """Get balance summary (who owes whom) for a space"""
        logger.info(f"GET /api/spaces/{space_id}/bills/balances - Request received")
        if not bill_repo or not space_repo:
            logger.error("Repositories not available")
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        logger.info(f"User {user_id} requesting balances for space {space_id}")
        
        # Verify space exists and user is a member
        try:
            space = space_repo.get_by_id(space_id)
            if not space:
                logger.warning(f"Space {space_id} not found")
                raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
            
            if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
                logger.warning(f"User {user_id} not authorized for space {space_id}")
                raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
            
            logger.info(f"Calculating balances for space {space_id}")
            balances_result = bill_repo.calculate_balances(space_id)
            logger.info(f"Successfully calculated balances: {len(balances_result.get('balances', []))} entries")
            return balances_result
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error calculating balances: {e}", exc_info=True)
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(status_code=500, detail=f"Failed to calculate balances: {str(e)}")

    @staticmethod
    def get_settlement_history(space_id: str, user_id: str) -> Dict:
        """Get settlement history for a space"""
        if not bill_repo or not space_repo:
            raise HTTPException(status_code=503, detail=ERROR_MESSAGES['DATABASE_UNAVAILABLE'])
        
        # Verify space exists and user is a member
        space = space_repo.get_by_id(space_id)
        if not space:
            raise HTTPException(status_code=404, detail=ERROR_MESSAGES['SPACE_NOT_FOUND'])
        
        if user_id not in space.get('members', []) and user_id != space.get('ownerId'):
            raise HTTPException(status_code=403, detail=ERROR_MESSAGES['NOT_AUTHORIZED'])
        
        try:
            history = bill_repo.get_settlement_history(space_id)
            return {"history": history}
        except Exception as e:
            logger.error(f"Error fetching settlement history: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Failed to fetch settlement history: {str(e)}")

