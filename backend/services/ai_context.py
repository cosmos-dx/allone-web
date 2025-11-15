"""
AI Context Service
Gathers user context (spaces, passwords metadata, TOTPs, bills, user profile)
NEVER includes password values or TOTP secrets
"""
import logging
from typing import Dict, List, Optional
from backend.config import (
    space_repo, password_repo, totp_repo, bill_repo, user_repo
)

logger = logging.getLogger(__name__)


class AIContextService:
    """Service to gather user context for AI assistant"""
    
    def get_user_context(self, user_id: str) -> Dict:
        """
        Gather comprehensive user context
        NEVER includes password values or TOTP secrets
        """
        context = {
            "user_id": user_id,
            "spaces": [],
            "passwords": [],  # Metadata only
            "totps": [],  # Metadata only
            "bills_summary": {},
            "user_profile": {}
        }
        
        try:
            # Get user profile
            if user_repo:
                user = user_repo.get_by_id(user_id)
                if user:
                    context["user_profile"] = {
                        "userId": user.get("userId"),
                        "email": user.get("email"),
                        "displayName": user.get("displayName"),
                        "passwordEnabled": user.get("passwordEnabled", False),
                        "preferences": user.get("preferences", {})
                    }
            
            # Get spaces
            if space_repo:
                spaces = space_repo.get_all_for_user(user_id)
                context["spaces"] = [
                    {
                        "spaceId": space.get("spaceId"),
                        "name": space.get("name"),
                        "type": space.get("type", "personal"),
                        "ownerId": space.get("ownerId"),
                        "members": space.get("members", []),
                        "createdAt": space.get("createdAt")
                    }
                    for space in spaces
                ]
            
            # Get passwords (METADATA ONLY - NO PASSWORDS)
            if password_repo:
                passwords = password_repo.get_by_user_id(user_id, include_shared=True)
                context["passwords"] = [
                    {
                        "passwordId": pwd.get("passwordId"),
                        "displayName": pwd.get("displayName"),
                        "username": pwd.get("username", ""),
                        "website": pwd.get("website", ""),
                        "category": pwd.get("category", "Other"),
                        "strength": pwd.get("strength", 0),
                        "spaceId": pwd.get("spaceId", "personal"),
                        "createdAt": pwd.get("createdAt"),
                        "isShared": pwd.get("isShared", False)
                        # NOTE: encryptedPassword is intentionally excluded
                    }
                    for pwd in passwords
                ]
            
            # Get TOTPs (METADATA ONLY - NO SECRETS)
            if totp_repo:
                totps = totp_repo.get_by_user_id(user_id, include_shared=True)
                context["totps"] = [
                    {
                        "totpId": totp.get("totpId"),
                        "name": totp.get("serviceName") or totp.get("name", ""),
                        "issuer": totp.get("account") or totp.get("issuer", ""),
                        "spaceId": totp.get("spaceId", "personal"),
                        "createdAt": totp.get("createdAt"),
                        "isShared": totp.get("isShared", False)
                        # NOTE: encryptedSecret is intentionally excluded
                    }
                    for totp in totps
                ]
            
            # Get bills summary
            if bill_repo and space_repo:
                spaces = space_repo.get_all_for_user(user_id)
                total_bills = 0
                pending_bills = 0
                total_owed = 0.0
                total_owing = 0.0
                
                for space in spaces:
                    space_id = space.get("spaceId")
                    bills = bill_repo.get_by_space_id(space_id)
                    total_bills += len(bills)
                    pending_bills += sum(1 for bill in bills if not bill.get("isSettled", False))
                    
                    # Calculate balances
                    balances = bill_repo.calculate_balances(space_id)
                    for balance in balances.get("balances", []):
                        if balance.get("userId") == user_id:
                            net = balance.get("netBalance", 0)
                            if net > 0:
                                total_owed += net
                            else:
                                total_owing += abs(net)
                
                context["bills_summary"] = {
                    "total_bills": total_bills,
                    "pending_bills": pending_bills,
                    "total_owed": round(total_owed, 2),
                    "total_owing": round(total_owing, 2)
                }
            
            logger.debug(f"Gathered context for user {user_id}: {len(context['spaces'])} spaces, {len(context['passwords'])} passwords, {len(context['totps'])} TOTPs")
            
        except Exception as e:
            logger.error(f"Error gathering context for user {user_id}: {e}", exc_info=True)
            # Return partial context on error
        
        return context
    
    def format_context_for_llm(self, context: Dict) -> str:
        """
        Format context as a readable string for LLM
        """
        lines = []
        
        # User profile
        user = context.get("user_profile", {})
        if user:
            lines.append(f"User: {user.get('displayName', user.get('email', 'Unknown'))}")
            lines.append(f"Passkey enabled: {user.get('passwordEnabled', False)}")
        
        # Spaces
        spaces = context.get("spaces", [])
        if spaces:
            lines.append(f"\nSpaces ({len(spaces)}):")
            for space in spaces[:10]:  # Limit to 10
                members_count = len(space.get("members", [])) + 1
                lines.append(f"  - {space.get('name')} ({space.get('type')}) - {members_count} member(s) - ID: {space.get('spaceId')}")
        
        # Passwords (metadata only)
        passwords = context.get("passwords", [])
        if passwords:
            lines.append(f"\nPasswords ({len(passwords)}):")
            
            # Security analysis
            weak_passwords = [p for p in passwords if p.get("strength", 0) < 2]
            moderate_passwords = [p for p in passwords if 2 <= p.get("strength", 0) < 4]
            strong_passwords = [p for p in passwords if p.get("strength", 0) >= 4]
            
            avg_strength = sum(p.get("strength", 0) for p in passwords) / len(passwords) if passwords else 0
            security_score = (avg_strength / 5) * 100  # Convert to percentage
            
            lines.append(f"Security Analysis:")
            lines.append(f"  - Overall Security Score: {security_score:.0f}%")
            lines.append(f"  - Strong passwords: {len(strong_passwords)}")
            lines.append(f"  - Moderate passwords: {len(moderate_passwords)}")
            lines.append(f"  - Weak passwords: {len(weak_passwords)} (⚠️ Consider updating)")
            
            if weak_passwords:
                lines.append(f"  - Weak password names: {', '.join([p.get('displayName') for p in weak_passwords[:5]])}")
            
            lines.append(f"\nPassword List:")
            for pwd in passwords[:20]:  # Limit to 20
                category = pwd.get("category", "Other")
                strength = pwd.get("strength", 0)
                strength_label = ["Very Weak", "Weak", "Fair", "Good", "Strong", "Very Strong"][min(strength, 5)]
                lines.append(f"  - {pwd.get('displayName')} ({category}) - Strength: {strength_label} ({strength}/5) - ID: {pwd.get('passwordId')}")
        
        # TOTPs (metadata only)
        totps = context.get("totps", [])
        if totps:
            lines.append(f"\nTOTP Authenticators ({len(totps)}):")
            for totp in totps[:20]:  # Limit to 20
                issuer = totp.get("issuer", "")
                issuer_str = f" ({issuer})" if issuer else ""
                lines.append(f"  - {totp.get('name')}{issuer_str} - ID: {totp.get('totpId')}")
        
        # Bills summary
        bills = context.get("bills_summary", {})
        if bills and bills.get("total_bills", 0) > 0:
            lines.append(f"\nBills Summary:")
            lines.append(f"  - Total bills: {bills.get('total_bills', 0)}")
            lines.append(f"  - Pending: {bills.get('pending_bills', 0)}")
            if bills.get("total_owed", 0) > 0:
                lines.append(f"  - You are owed: ${bills.get('total_owed', 0)}")
            if bills.get("total_owing", 0) > 0:
                lines.append(f"  - You owe: ${bills.get('total_owing', 0)}")
        
        return "\n".join(lines)


# Global instance
context_service = AIContextService()

