"""
Intent Guard Service
Classifies user intents and validates required parameters before executing actions
"""
import re
import logging
from typing import Dict, List, Optional, Tuple
from enum import Enum

logger = logging.getLogger(__name__)


class IntentType(str, Enum):
    """Intent classification types"""
    CREATE_PASSWORD = "create_password"
    CREATE_TOTP = "create_totp"
    CREATE_SPACE = "create_space"
    GET_DETAILS = "get_details"
    TOGGLE_SETTING = "toggle_setting"
    CREATE_PASSKEY = "create_passkey"
    SEARCH = "search"
    GENERAL_QUERY = "general_query"


class IntentGuard:
    """Intent classification and validation service"""
    
    # Intent patterns
    INTENT_PATTERNS = {
        IntentType.CREATE_PASSWORD: [
            r"create.*password", r"add.*password", r"new.*password",
            r"save.*password", r"store.*password", r"insert.*password"
        ],
        IntentType.CREATE_TOTP: [
            r"create.*totp", r"add.*totp", r"new.*totp", r"add.*authenticator",
            r"create.*authenticator", r"new.*authenticator", r"add.*2fa"
        ],
        IntentType.CREATE_SPACE: [
            r"create.*space", r"add.*space", r"new.*space", r"make.*space"
        ],
        IntentType.GET_DETAILS: [
            r"show.*password", r"details.*password", r"info.*password",
            r"tell.*about.*password", r"what.*password", r"password.*details"
        ],
        IntentType.TOGGLE_SETTING: [
            r"enable", r"disable", r"turn.*on", r"turn.*off", r"toggle",
            r"change.*setting", r"update.*setting", r"set.*setting"
        ],
        IntentType.CREATE_PASSKEY: [
            r"create.*passkey", r"set.*passkey", r"add.*passkey", r"enable.*passkey"
        ],
        IntentType.SEARCH: [
            r"search", r"find", r"look.*for", r"where.*password", r"list.*password"
        ]
    }
    
    # Required parameters for each intent
    REQUIRED_PARAMS = {
        IntentType.CREATE_PASSWORD: ["displayName", "password"],
        IntentType.CREATE_TOTP: ["name", "secret"],
        IntentType.CREATE_SPACE: ["name", "type"],
        IntentType.GET_DETAILS: ["identifier"],  # password name or ID
        IntentType.TOGGLE_SETTING: ["setting_name", "value"],
        IntentType.CREATE_PASSKEY: ["password"],  # master password
        IntentType.SEARCH: ["query"]
    }
    
    # Optional parameters
    OPTIONAL_PARAMS = {
        IntentType.CREATE_PASSWORD: ["username", "website", "category", "spaceId", "notes"],
        IntentType.CREATE_TOTP: ["issuer", "spaceId"],
        IntentType.CREATE_SPACE: ["members"],
        IntentType.GET_DETAILS: [],
        IntentType.TOGGLE_SETTING: [],
        IntentType.CREATE_PASSKEY: [],
        IntentType.SEARCH: []
    }
    
    def classify_intent(self, query: str) -> Tuple[IntentType, float]:
        """
        Classify user intent from query
        Returns: (intent_type, confidence_score)
        """
        query_lower = query.lower()
        scores = {}
        
        for intent_type, patterns in self.INTENT_PATTERNS.items():
            score = 0.0
            for pattern in patterns:
                matches = len(re.findall(pattern, query_lower, re.IGNORECASE))
                score += matches * 0.3
            
            # Boost score for specific keywords
            if intent_type == IntentType.CREATE_PASSWORD and any(word in query_lower for word in ["password", "credential", "login"]):
                score += 0.5
            elif intent_type == IntentType.CREATE_TOTP and any(word in query_lower for word in ["totp", "authenticator", "2fa", "mfa"]):
                score += 0.5
            elif intent_type == IntentType.CREATE_SPACE and any(word in query_lower for word in ["space", "group", "team"]):
                score += 0.5
            elif intent_type == IntentType.SEARCH and any(word in query_lower for word in ["search", "find", "list"]):
                score += 0.5
            
            scores[intent_type] = score
        
        # Get highest scoring intent
        if not scores or max(scores.values()) == 0:
            return IntentType.GENERAL_QUERY, 0.0
        
        best_intent = max(scores.items(), key=lambda x: x[1])
        confidence = min(1.0, best_intent[1])
        
        return best_intent[0], confidence
    
    def extract_parameters(self, query: str, intent_type: IntentType) -> Dict[str, Optional[str]]:
        """
        Extract parameters from user query
        Returns: dict of parameter_name -> value
        """
        params = {}
        query_lower = query.lower()
        
        if intent_type == IntentType.CREATE_PASSWORD:
            # Extract name
            name_match = re.search(r"(?:name|for|called|titled)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if name_match:
                params["displayName"] = name_match.group(1).strip()
            
            # Extract username
            username_match = re.search(r"(?:username|user|email|login)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if username_match:
                params["username"] = username_match.group(1).strip()
            
            # Extract website
            website_match = re.search(r"(?:website|url|site)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if website_match:
                params["website"] = website_match.group(1).strip()
            
            # Extract category
            category_match = re.search(r"(?:category|type)\s+(?:is|:)?\s*(social|banking|work|shopping|email|entertainment|other)", query, re.IGNORECASE)
            if category_match:
                params["category"] = category_match.group(1).capitalize()
        
        elif intent_type == IntentType.CREATE_TOTP:
            # Extract name
            name_match = re.search(r"(?:name|for|called)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if name_match:
                params["name"] = name_match.group(1).strip()
            
            # Extract issuer
            issuer_match = re.search(r"(?:issuer|service|provider)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if issuer_match:
                params["issuer"] = issuer_match.group(1).strip()
        
        elif intent_type == IntentType.CREATE_SPACE:
            # Extract name
            name_match = re.search(r"(?:name|called)\s+(?:is|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if name_match:
                params["name"] = name_match.group(1).strip()
            
            # Extract type
            type_match = re.search(r"(?:type|kind)\s+(?:is|:)?\s*(personal|family|work)", query, re.IGNORECASE)
            if type_match:
                params["type"] = type_match.group(1).lower()
        
        elif intent_type == IntentType.GET_DETAILS:
            # Extract identifier (password name)
            identifier_match = re.search(r"(?:password|for|about)\s+(?:named|called|is)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if identifier_match:
                params["identifier"] = identifier_match.group(1).strip()
        
        elif intent_type == IntentType.TOGGLE_SETTING:
            # Extract setting name
            setting_match = re.search(r"(?:setting|feature)\s+(?:called|named)?\s*(autolock|login.*notification|clipboard|passkey)", query, re.IGNORECASE)
            if setting_match:
                params["setting_name"] = setting_match.group(1).lower()
            
            # Extract value
            if re.search(r"(?:enable|turn.*on|activate)", query, re.IGNORECASE):
                params["value"] = "true"
            elif re.search(r"(?:disable|turn.*off|deactivate)", query, re.IGNORECASE):
                params["value"] = "false"
        
        elif intent_type == IntentType.SEARCH:
            # Extract search query
            search_match = re.search(r"(?:search|find|for)\s+(?:for|:)?\s*['\"]?([^'\"]+)['\"]?", query, re.IGNORECASE)
            if search_match:
                params["query"] = search_match.group(1).strip()
        
        return params
    
    def validate_intent(self, query: str, conversation_history: Optional[List[Dict]] = None) -> Dict:
        """
        Classify intent and validate parameters
        Uses conversation history to better handle follow-up questions
        Returns: validation result with intent, parameters, and missing fields
        """
        # Check if this is a follow-up to a previous question
        is_followup = False
        previous_intent = None
        
        if conversation_history and len(conversation_history) > 1:
            # Look for the last assistant message that asked for information
            for msg in reversed(conversation_history[:-1]):  # Exclude current user message
                if msg.get("role") == "assistant":
                    content = msg.get("content", "").lower()
                    if any(phrase in content for phrase in [
                        "need", "provide", "missing", "information", "tell me", "what is",
                        "please provide", "i need", "can you provide"
                    ]):
                        is_followup = True
                        # Try to infer the intent from the assistant's question
                        if "password" in content and ("create" in content or "add" in content):
                            previous_intent = IntentType.CREATE_PASSWORD
                        elif "totp" in content or "authenticator" in content:
                            previous_intent = IntentType.CREATE_TOTP
                        elif "space" in content:
                            previous_intent = IntentType.CREATE_SPACE
                        break
        
        # If it's a follow-up, use the previous intent if we detected one
        if is_followup and previous_intent:
            intent_type = previous_intent
            confidence = 0.9  # High confidence for follow-ups
        else:
            intent_type, confidence = self.classify_intent(query)
        
        params = self.extract_parameters(query, intent_type)
        
        # For follow-ups, be more lenient - the AI will handle parameter extraction
        if is_followup:
            # Mark as complete so AI can handle it naturally
            return {
                "intent": intent_type.value,
                "confidence": confidence,
                "parameters": params,
                "missing_parameters": [],
                "is_complete": True,  # Let AI handle follow-ups
                "optional_parameters": self.OPTIONAL_PARAMS.get(intent_type, [])
            }
        
        # Check required parameters
        required = self.REQUIRED_PARAMS.get(intent_type, [])
        missing = [param for param in required if param not in params or not params[param]]
        
        return {
            "intent": intent_type.value,
            "confidence": confidence,
            "parameters": params,
            "missing_parameters": missing,
            "is_complete": len(missing) == 0,
            "optional_parameters": self.OPTIONAL_PARAMS.get(intent_type, [])
        }

