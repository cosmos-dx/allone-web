"""
Guard Rails Service
Prevents harmful or out-of-scope requests, validates permissions, and sanitizes inputs
"""
import re
import logging
from typing import Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)


class GuardRails:
    """Security guard rails for AI assistant"""
    
    # Blocked patterns - requests that should be rejected
    BLOCKED_PATTERNS = [
        r"show.*password.*value", r"reveal.*password", r"display.*password",
        r"give.*me.*password", r"what.*is.*my.*password", r"password.*is",
        r"decrypt.*password", r"unencrypt.*password", r"plain.*text.*password",
        r"delete.*all", r"remove.*all.*passwords", r"clear.*everything",
        r"export.*all.*passwords", r"download.*all.*data",
        r"change.*master.*password", r"reset.*master.*password",
        r"show.*totp.*secret", r"reveal.*totp.*secret", r"totp.*secret.*is"
    ]
    
    # Dangerous actions that require explicit confirmation
    DANGEROUS_ACTIONS = [
        "delete", "remove", "clear", "export", "download"
    ]
    
    # Allowed settings that can be toggled
    ALLOWED_SETTINGS = [
        "autolock", "auto_lock", "loginnotifications", "login_notifications",
        "clipboardautoclear", "clipboard_auto_clear", "passkey", "passwordenabled"
    ]
    
    def check_blocked_patterns(self, query: str) -> Tuple[bool, Optional[str]]:
        """
        Check if query matches blocked patterns
        Returns: (is_blocked, reason)
        """
        query_lower = query.lower()
        
        for pattern in self.BLOCKED_PATTERNS:
            if re.search(pattern, query_lower, re.IGNORECASE):
                reason = "This request is blocked for security reasons. I cannot reveal password values or perform destructive actions."
                logger.warning(f"Blocked query pattern detected: {pattern}")
                return True, reason
        
        return False, None
    
    def sanitize_input(self, text: str) -> str:
        """
        Sanitize user input to prevent injection attacks
        """
        if not text:
            return ""
        
        # Remove potential script tags
        text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.IGNORECASE | re.DOTALL)
        
        # Remove potential SQL injection patterns (basic)
        text = re.sub(r'[;\'"\\]', '', text)
        
        # Limit length
        if len(text) > 1000:
            text = text[:1000]
        
        return text.strip()
    
    def validate_setting_name(self, setting_name: str) -> Tuple[bool, Optional[str]]:
        """
        Validate that setting name is allowed
        Returns: (is_valid, normalized_name)
        """
        if not setting_name:
            return False, None
        
        setting_lower = setting_name.lower().replace(" ", "_").replace("-", "_")
        
        # Map variations to standard names
        setting_map = {
            "autolock": "autoLock",
            "auto_lock": "autoLock",
            "loginnotifications": "loginNotifications",
            "login_notifications": "loginNotifications",
            "clipboardautoclear": "clipboardAutoClear",
            "clipboard_auto_clear": "clipboardAutoClear",
            "passkey": "passwordEnabled",
            "passwordenabled": "passwordEnabled",
            "password_enabled": "passwordEnabled"
        }
        
        if setting_lower in setting_map:
            return True, setting_map[setting_lower]
        
        # Check if it's in allowed settings
        if setting_lower in [s.lower() for s in self.ALLOWED_SETTINGS]:
            return True, setting_lower
        
        return False, None
    
    def validate_permission(self, action: str, user_id: str, resource_owner_id: Optional[str] = None) -> bool:
        """
        Validate user has permission to perform action
        """
        # User can always perform actions on their own resources
        if resource_owner_id is None or resource_owner_id == user_id:
            return True
        
        # For now, only owner can perform actions
        # In future, can add shared resource permissions
        return False
    
    def check_dangerous_action(self, query: str) -> Tuple[bool, str]:
        """
        Check if query contains dangerous action
        Returns: (is_dangerous, action_type)
        """
        query_lower = query.lower()
        
        for action in self.DANGEROUS_ACTIONS:
            if action in query_lower:
                return True, action
        
        return False, ""
    
    def validate(self, query: str, intent: str, user_id: str, resource_owner_id: Optional[str] = None) -> Dict:
        """
        Comprehensive validation
        Returns: validation result
        """
        # Check blocked patterns
        is_blocked, block_reason = self.check_blocked_patterns(query)
        if is_blocked:
            return {
                "is_valid": False,
                "reason": block_reason,
                "error_type": "blocked_pattern"
            }
        
        # Sanitize input
        sanitized_query = self.sanitize_input(query)
        
        # Check dangerous actions
        is_dangerous, action_type = self.check_dangerous_action(query)
        
        # Validate permissions if resource owner is provided
        has_permission = True
        if resource_owner_id:
            has_permission = self.validate_permission(intent, user_id, resource_owner_id)
        
        return {
            "is_valid": True,
            "sanitized_query": sanitized_query,
            "is_dangerous": is_dangerous,
            "action_type": action_type if is_dangerous else None,
            "has_permission": has_permission,
            "warnings": []
        }

