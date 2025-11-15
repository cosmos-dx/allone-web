"""
Bill management routes
"""
import logging
from typing import List
from fastapi import APIRouter, Depends
from backend.models import Bill, BillCreate, SettlementRequest
from backend.middleware.auth import verify_token
from backend.controllers.bill_controller import BillController

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/spaces", tags=["bills"])

@router.post("/{space_id}/bills", response_model=Bill)
async def create_bill(space_id: str, bill_data: BillCreate, token_data: dict = Depends(verify_token)):
    """Create a new bill in a space"""
    user_id = token_data['uid']
    return BillController.create_bill(space_id, bill_data, user_id)

@router.get("/{space_id}/bills", response_model=List[Bill])
async def get_bills(space_id: str, token_data: dict = Depends(verify_token)):
    """Get all bills for a space"""
    user_id = token_data['uid']
    return BillController.get_bills(space_id, user_id)

# IMPORTANT: These specific routes must come BEFORE the parameterized /{bill_id} route
# to ensure FastAPI matches them correctly
@router.get("/{space_id}/bills/balances")
async def get_balances(space_id: str, token_data: dict = Depends(verify_token)):
    """Get balance summary (who owes whom) for a space"""
    user_id = token_data['uid']
    return BillController.get_balances(space_id, user_id)

@router.get("/{space_id}/bills/history")
async def get_settlement_history(space_id: str, token_data: dict = Depends(verify_token)):
    """Get settlement history for a space"""
    user_id = token_data['uid']
    return BillController.get_settlement_history(space_id, user_id)

@router.get("/{space_id}/bills/{bill_id}", response_model=Bill)
async def get_bill(space_id: str, bill_id: str, token_data: dict = Depends(verify_token)):
    """Get a single bill"""
    user_id = token_data['uid']
    return BillController.get_bill(space_id, bill_id, user_id)

@router.put("/{space_id}/bills/{bill_id}", response_model=Bill)
async def update_bill(space_id: str, bill_id: str, bill_data: BillCreate, token_data: dict = Depends(verify_token)):
    """Update a bill"""
    user_id = token_data['uid']
    return BillController.update_bill(space_id, bill_id, bill_data, user_id)

@router.delete("/{space_id}/bills/{bill_id}")
async def delete_bill(space_id: str, bill_id: str, token_data: dict = Depends(verify_token)):
    """Delete a bill"""
    user_id = token_data['uid']
    return BillController.delete_bill(space_id, bill_id, user_id)

@router.post("/{space_id}/bills/{bill_id}/settle")
async def settle_bill(space_id: str, bill_id: str, settlement: SettlementRequest, token_data: dict = Depends(verify_token)):
    """Mark a participant as paid"""
    user_id = token_data['uid']
    return BillController.settle_bill(space_id, bill_id, settlement, user_id)

