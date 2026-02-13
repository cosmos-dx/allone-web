"""
AI Service with OpenAI Function Calling
Handles tool definitions and execution
"""
import logging
import json
import uuid
from typing import Dict, List, Optional, Any
from urllib.parse import quote
from openai import OpenAI
from backend.config import OPENAI_API_KEY
from backend.services.ai_context import context_service
from backend.services.intent_guard import IntentGuard, IntentType
from backend.services.guard_rails import GuardRails
from datetime import datetime, timezone
import bcrypt

logger = logging.getLogger(__name__)

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

# Initialize services
intent_guard = IntentGuard()
guard_rails = GuardRails()


# OpenAI Function/Tool Definitions
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_password",
            "description": "Create a new password entry. Guide the user through the process step-by-step. Ask for: name, username (optional), password, website (optional), category, and space. Suggest strong password requirements (12+ chars, mixed case, numbers, symbols). The password value will be encrypted by the frontend.",
            "parameters": {
                "type": "object",
                "properties": {
                    "displayName": {
                        "type": "string",
                        "description": "Name/label for the password (e.g., 'Facebook', 'Gmail')"
                    },
                    "password": {
                        "type": "string",
                        "description": "The actual password value (will be encrypted)"
                    },
                    "username": {
                        "type": "string",
                        "description": "Username or email for the account"
                    },
                    "website": {
                        "type": "string",
                        "description": "Website URL"
                    },
                    "category": {
                        "type": "string",
                        "enum": ["Social", "Banking", "Work", "Shopping", "Email", "Entertainment", "Other"],
                        "description": "Password category"
                    },
                    "spaceId": {
                        "type": "string",
                        "description": "Space ID where password will be stored (default: 'personal')"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Additional notes"
                    }
                },
                "required": ["displayName", "password"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_totp",
            "description": "Create a new TOTP authenticator entry. Guide the user through the setup process step-by-step. Ask for: service name, account/issuer (optional), and secret key. Explain that TOTP provides two-factor authentication. The secret will be encrypted by the frontend.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name for the TOTP authenticator"
                    },
                    "issuer": {
                        "type": "string",
                        "description": "Service/issuer name (e.g., 'Google', 'GitHub')"
                    },
                    "secret": {
                        "type": "string",
                        "description": "TOTP secret key (will be encrypted)"
                    },
                    "spaceId": {
                        "type": "string",
                        "description": "Space ID where TOTP will be stored (default: 'personal')"
                    }
                },
                "required": ["name", "secret"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_space",
            "description": "Create a new space (personal, family, or work)",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Name of the space"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["personal", "family", "work"],
                        "description": "Type of space"
                    },
                    "members": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of user IDs to add as members"
                    }
                },
                "required": ["name", "type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_password_details",
            "description": "Get details about a password (metadata only, never the actual password value). Returns a link to view the password.",
            "parameters": {
                "type": "object",
                "properties": {
                    "passwordId": {
                        "type": "string",
                        "description": "Password ID"
                    },
                    "displayName": {
                        "type": "string",
                        "description": "Password name to search for"
                    }
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_passwords",
            "description": "Search for passwords by name, username, or website. Returns links to view passwords, never actual password values.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "toggle_setting",
            "description": "Enable or disable a user setting",
            "parameters": {
                "type": "object",
                "properties": {
                    "settingName": {
                        "type": "string",
                        "enum": ["autoLock", "loginNotifications", "clipboardAutoClear", "passwordEnabled"],
                        "description": "Name of the setting to toggle"
                    },
                    "value": {
                        "type": "boolean",
                        "description": "True to enable, False to disable"
                    }
                },
                "required": ["settingName", "value"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_passkey",
            "description": "Create or set a master password (passkey) for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "password": {
                        "type": "string",
                        "description": "Master password (minimum 8 characters)"
                    }
                },
                "required": ["password"]
            }
        }
    }
]


class AIService:
    """AI Service with tool execution"""
    
    def __init__(self):
        self.tools = TOOLS
    
    def get_system_message(self, context: Dict) -> str:
        """Generate system message with context"""
        context_str = context_service.format_context_for_llm(context)
        
        return f"""You are a helpful AI assistant for AllOne Password Manager. Help users manage their passwords, authenticators, spaces, and settings securely.

CRITICAL SECURITY RULES:
- NEVER reveal actual password values or TOTP secrets - this is a security violation
- When asked about passwords or details, provide step-by-step instructions to find them, NOT the actual values
- Always provide clear instructions: "To view this password: 1) Click the link below, 2) The password page will open, 3) Click the eye icon to reveal the password"
- For password details or search, provide UI links that redirect to the password page with search/highlight parameters
- Always prioritize user security and privacy above all else

SECURITY ANALYSIS & INSIGHTS:
- Provide security scores (1-5 scale) for passwords based on strength
- Analyze password strength and provide recommendations (e.g., "This password has a strength of 2/5. Consider using a stronger password with mixed case, numbers, and symbols")
- Identify weak passwords and suggest improvements
- Alert users about potential security issues (weak passwords, old passwords, etc.)
- Suggest password best practices when creating new passwords

User Context:
{context_str}

Available Actions:
- Create passwords (ask iteratively for name, username, password, website, category, space) - provide clear guidance and confirm before creating
- Create TOTP authenticators (ask iteratively for name, issuer, secret) - guide users through setup process
- Create spaces (ask for name, type, members)
- Get password details (return metadata + step-by-step instructions + link, NEVER password value)
- Search passwords (return metadata + step-by-step instructions + link, NEVER actual passwords)
- Toggle settings (autoLock, loginNotifications, clipboardAutoClear, passwordEnabled)
- Create passkeys (guide user through setup)
- Provide security insights and recommendations

RESPONSE GUIDELINES:
- When providing password details: Include metadata (name, category, website, strength, username), security score, recommendations, and step-by-step instructions to view the password
- When searching passwords: Provide metadata for matches, security insights (e.g., "You have X weak passwords"), and clear instructions on how to find them
- When creating passwords: Guide users through the process, suggest strong password requirements, and confirm before creating
- Always be helpful, friendly, and security-conscious."""
    
    def execute_tool(self, tool_name: str, tool_args: Dict, user_id: str) -> Dict:
        """
        Execute a tool/function call
        Returns: result dict with success status and data
        """
        try:
            if tool_name == "create_password":
                return self._create_password(tool_args, user_id)
            elif tool_name == "create_totp":
                return self._create_totp(tool_args, user_id)
            elif tool_name == "create_space":
                return self._create_space(tool_args, user_id)
            elif tool_name == "get_password_details":
                return self._get_password_details(tool_args, user_id)
            elif tool_name == "search_passwords":
                return self._search_passwords(tool_args, user_id)
            elif tool_name == "toggle_setting":
                return self._toggle_setting(tool_args, user_id)
            elif tool_name == "create_passkey":
                return self._create_passkey(tool_args, user_id)
            else:
                return {"success": False, "error": f"Unknown tool: {tool_name}"}
        except Exception as e:
            logger.error(f"Error executing tool {tool_name}: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _create_password(self, args: Dict, user_id: str) -> Dict:
        """Create password - returns data for frontend to encrypt and create"""
        # Validate required fields
        if not args.get("displayName") or not args.get("password"):
            return {"success": False, "error": "displayName and password are required"}
        
        # Calculate password strength (0-5)
        password = args["password"]
        strength = 0
        if len(password) >= 8:
            strength += 1
        if len(password) >= 12:
            strength += 1
        if any(c.islower() for c in password) and any(c.isupper() for c in password):
            strength += 1
        if any(c.isdigit() for c in password):
            strength += 1
        if any(not c.isalnum() for c in password):
            strength += 1
        
        return {
            "success": True,
            "action": "create_password",
            "data": {
                "displayName": args["displayName"],
                "password": args["password"],  # Frontend will encrypt
                "username": args.get("username", ""),
                "website": args.get("website", ""),
                "category": args.get("category", "Other"),
                "spaceId": args.get("spaceId", "personal"),
                "notes": args.get("notes", ""),
                "strength": strength
            },
            "message": f"Password '{args['displayName']}' ready to be created. The frontend will encrypt and save it."
        }
    
    def _create_totp(self, args: Dict, user_id: str) -> Dict:
        """Create TOTP - returns data for frontend to encrypt and create"""
        if not args.get("name") or not args.get("secret"):
            return {"success": False, "error": "name and secret are required"}
        
        return {
            "success": True,
            "action": "create_totp",
            "data": {
                "serviceName": args["name"],
                "account": args.get("issuer", ""),
                "secret": args["secret"],  # Frontend will encrypt
                "spaceId": args.get("spaceId", "personal")
            },
            "message": f"TOTP authenticator '{args['name']}' ready to be created. The frontend will encrypt and save it."
        }
    
    def _create_space(self, args: Dict, user_id: str) -> Dict:
        """Create space directly (no encryption needed)"""
        # Lazy import to avoid circular dependency
        from backend.config import space_repo
        
        if not args.get("name") or not args.get("type"):
            return {"success": False, "error": "name and type are required"}
        
        if not space_repo:
            return {"success": False, "error": "Database unavailable"}
        
        space_id = f"space_{uuid.uuid4()}"
        now = datetime.now(timezone.utc).isoformat()
        
        doc = {
            "spaceId": space_id,
            "ownerId": user_id,
            "name": args["name"],
            "type": args["type"],
            "members": args.get("members", []),
            "admins": args.get("members", []),  # Members are also admins initially
            "createdAt": now
        }
        
        try:
            created = space_repo.create(doc)
            return {
                "success": True,
                "action": "create_space",
                "data": created,
                "redirect_url": f"/spaces/{space_id}",
                "message": f"Space '{args['name']}' created successfully!"
            }
        except Exception as e:
            logger.error(f"Error creating space: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _get_password_details(self, args: Dict, user_id: str) -> Dict:
        """Get password details (metadata only) - NEVER returns password value"""
        # Lazy import to avoid circular dependency
        from backend.config import password_repo
        
        if not password_repo:
            return {"success": False, "error": "Database unavailable"}
        
        password_id = args.get("passwordId")
        display_name = args.get("displayName")
        
        try:
            passwords = password_repo.get_by_user_id(user_id, include_shared=True)
            
            # Find password by ID or name
            password = None
            if password_id:
                password = next((p for p in passwords if p.get("passwordId") == password_id), None)
            elif display_name:
                password = next((p for p in passwords if p.get("displayName", "").lower() == display_name.lower()), None)
            
            if not password:
                return {"success": False, "error": "Password not found"}
            
            # Calculate security score and recommendations
            strength = password.get("strength", 0)
            security_score = strength  # 0-5 scale
            security_status = "Strong" if strength >= 4 else "Moderate" if strength >= 2 else "Weak"
            
            recommendations = []
            if strength < 3:
                recommendations.append("Consider using a stronger password with:")
                if strength < 2:
                    recommendations.append("- At least 12 characters")
                if strength < 3:
                    recommendations.append("- Mix of uppercase and lowercase letters")
                    recommendations.append("- Numbers and special characters")
            
            # Build step-by-step instructions
            instructions = (
                f"To view the password for '{password.get('displayName')}':\n"
                "1. Click the link below\n"
                "2. The passwords page will open with this password highlighted\n"
                "3. Click the eye icon (👁️) on the password card to reveal the password\n"
                "4. The password will be displayed securely on your screen"
            )
            
            # Build detailed message with security insights
            message = (
                f"I found the password '{password.get('displayName')}'.\n\n"
                f"**Details:**\n"
                f"- Name: {password.get('displayName')}\n"
                f"- Username: {password.get('username', 'Not set')}\n"
                f"- Website: {password.get('website', 'Not set')}\n"
                f"- Category: {password.get('category', 'Other')}\n"
                f"- Security Score: {security_score}/5 ({security_status})\n\n"
            )
            
            if recommendations:
                message += f"**Security Recommendations:**\n" + "\n".join(recommendations) + "\n\n"
            
            message += f"**{instructions}**"
            
            # Return metadata only (NO PASSWORD VALUE)
            return {
                "success": True,
                "action": "get_password_details",
                "data": {
                    "passwordId": password.get("passwordId"),
                    "displayName": password.get("displayName"),
                    "username": password.get("username", ""),
                    "website": password.get("website", ""),
                    "category": password.get("category", "Other"),
                    "strength": strength,
                    "securityScore": security_score,
                    "securityStatus": security_status,
                    "recommendations": recommendations,
                    "spaceId": password.get("spaceId", "personal"),
                    "createdAt": password.get("createdAt")
                },
                "redirect_url": f"/passwords?search={quote(password.get('displayName', ''))}&highlight={password.get('passwordId')}",
                "message": message
            }
        except Exception as e:
            logger.error(f"Error getting password details: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _search_passwords(self, args: Dict, user_id: str) -> Dict:
        """Search passwords - returns metadata and instructions, NEVER actual passwords"""
        # Lazy import to avoid circular dependency
        from backend.config import password_repo
        
        if not password_repo:
            return {"success": False, "error": "Database unavailable"}
        
        query = args.get("query", "").lower()
        if not query:
            return {"success": False, "error": "Search query is required"}
        
        try:
            passwords = password_repo.get_by_user_id(user_id, include_shared=True)
            
            # Filter passwords and collect metadata
            matches = []
            weak_count = 0
            for pwd in passwords:
                name = pwd.get("displayName", "").lower()
                username = pwd.get("username", "").lower()
                website = pwd.get("website", "").lower()
                
                if query in name or query in username or query in website:
                    strength = pwd.get("strength", 0)
                    if strength < 2:
                        weak_count += 1
                    
                    matches.append({
                        "passwordId": pwd.get("passwordId"),
                        "displayName": pwd.get("displayName"),
                        "username": pwd.get("username", ""),
                        "website": pwd.get("website", ""),
                        "category": pwd.get("category", "Other"),
                        "strength": strength,
                        "securityScore": strength,
                        "securityStatus": "Strong" if strength >= 4 else "Moderate" if strength >= 2 else "Weak"
                    })
            
            if not matches:
                return {
                    "success": False,
                    "error": f"No passwords found matching '{query}'"
                }
            
            # Build step-by-step instructions
            instructions = (
                "To find and view these passwords:\n"
                "1. Click the link below\n"
                "2. The passwords page will open with search results filtered\n"
                "3. Click on any password card to view its details\n"
                "4. Click the eye icon (👁️) on the password card to reveal the password\n"
                "5. The password will be displayed securely on your screen"
            )
            
            # Build message with security insights
            search_param = quote(query)
            if len(matches) == 1:
                match = matches[0]
                message = (
                    f"I found 1 password matching '{query}':\n\n"
                    f"**Details:**\n"
                    f"- Name: {match['displayName']}\n"
                    f"- Username: {match['username'] or 'Not set'}\n"
                    f"- Website: {match['website'] or 'Not set'}\n"
                    f"- Category: {match['category']}\n"
                    f"- Security Score: {match['securityScore']}/5 ({match['securityStatus']})\n\n"
                )
                
                if match['securityScore'] < 3:
                    message += (
                        f"**Security Alert:** This password has a low security score. "
                        f"Consider updating it with a stronger password.\n\n"
                    )
                
                message += f"**{instructions}**"
                
                return {
                    "success": True,
                    "action": "search_passwords",
                    "data": {
                        "matches": matches,
                        "count": 1,
                        "weakCount": weak_count,
                        "securityInsights": {
                            "weakPasswords": weak_count,
                            "totalFound": 1
                        }
                    },
                    "redirect_url": f"/passwords?search={search_param}&highlight={match['passwordId']}",
                    "message": message
                }
            else:
                # Multiple matches
                message = (
                    f"I found {len(matches)} password(s) matching '{query}':\n\n"
                    f"**Results:**\n"
                )
                
                # List all matches with metadata
                for i, match in enumerate(matches[:10], 1):  # Limit to first 10
                    message += (
                        f"{i}. {match['displayName']} "
                        f"(Username: {match['username'] or 'N/A'}, "
                        f"Category: {match['category']}, "
                        f"Security: {match['securityScore']}/5)\n"
                    )
                
                if len(matches) > 10:
                    message += f"... and {len(matches) - 10} more\n"
                
                message += "\n"
                
                # Security insights
                if weak_count > 0:
                    message += (
                        f"**Security Insights:**\n"
                        f"- {weak_count} out of {len(matches)} password(s) have weak security scores\n"
                        f"- Consider updating weak passwords for better security\n\n"
                    )
                
                message += f"**{instructions}**"
                
                return {
                    "success": True,
                    "action": "search_passwords",
                    "data": {
                        "matches": matches,
                        "count": len(matches),
                        "weakCount": weak_count,
                        "securityInsights": {
                            "weakPasswords": weak_count,
                            "totalFound": len(matches),
                            "averageSecurityScore": sum(m.get("securityScore", 0) for m in matches) / len(matches) if matches else 0
                        }
                    },
                    "redirect_url": f"/passwords?search={search_param}",
                    "message": message
                }
        except Exception as e:
            logger.error(f"Error searching passwords: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _toggle_setting(self, args: Dict, user_id: str) -> Dict:
        """Toggle user setting"""
        # Lazy import to avoid circular dependency
        from backend.config import user_repo
        
        if not user_repo:
            return {"success": False, "error": "Database unavailable"}
        
        setting_name = args.get("settingName")
        value = args.get("value")
        
        if setting_name is None or value is None:
            return {"success": False, "error": "settingName and value are required"}
        
        # Validate setting name
        is_valid, normalized_name = guard_rails.validate_setting_name(setting_name)
        if not is_valid:
            return {"success": False, "error": f"Invalid setting name: {setting_name}"}
        
        try:
            user = user_repo.get_by_id(user_id)
            if not user:
                return {"success": False, "error": "User not found"}
            
            preferences = user.get("preferences", {})
            
            # Handle passwordEnabled separately (it's not in preferences)
            if normalized_name == "passwordEnabled":
                if value:
                    # Setting passkey requires password, handled separately
                    return {
                        "success": False,
                        "error": "To enable passkey, use the create_passkey function with a password"
                    }
                else:
                    # Disable passkey
                    user_repo.update(user_id, {
                        "passwordEnabled": False,
                        "masterPasswordHash": None
                    })
                    return {
                        "success": True,
                        "action": "toggle_setting",
                        "data": {"setting": "passwordEnabled", "value": False},
                        "message": "Passkey disabled successfully"
                    }
            else:
                # Update preference
                preferences[normalized_name] = value
                user_repo.update(user_id, {"preferences": preferences})
                
                return {
                    "success": True,
                    "action": "toggle_setting",
                    "data": {"setting": normalized_name, "value": value},
                    "message": f"Setting '{normalized_name}' {'enabled' if value else 'disabled'} successfully"
                }
        except Exception as e:
            logger.error(f"Error toggling setting: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def _create_passkey(self, args: Dict, user_id: str) -> Dict:
        """Create or update master password (passkey)"""
        # Lazy import to avoid circular dependency
        from backend.config import user_repo
        
        if not user_repo:
            return {"success": False, "error": "Database unavailable"}
        
        password = args.get("password")
        if not password:
            return {"success": False, "error": "Password is required"}
        
        if len(password) < 8:
            return {"success": False, "error": "Password must be at least 8 characters long"}
        
        try:
            # Hash the password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            user_repo.update(user_id, {
                'passwordEnabled': True,
                'masterPasswordHash': password_hash
            })
            
            return {
                "success": True,
                "action": "create_passkey",
                "data": {"passwordEnabled": True},
                "message": "Passkey created successfully! Your vault is now protected."
            }
        except Exception as e:
            logger.error(f"Error creating passkey: {e}", exc_info=True)
            return {"success": False, "error": str(e)}
    
    def chat(self, messages: List[Dict], context: Dict, user_id: str) -> Dict:
        """
        Chat with OpenAI using function calling
        Returns: response dict with text and/or tool calls
        """
        if not openai_client:
            return {
                "error": "OpenAI API key not configured",
                "text": "I'm sorry, but the AI service is not available. Please check the configuration."
            }
        
        try:
            # Add system message with context
            system_message = {
                "role": "system",
                "content": self.get_system_message(context)
            }
            
            # Prepare messages for OpenAI (filter out empty messages)
            filtered_messages = [msg for msg in messages if msg.get("content") and msg.get("content").strip()]
            openai_messages = [system_message] + filtered_messages
            
            # Ensure we have at least one user message
            if not any(msg.get("role") == "user" for msg in filtered_messages):
                logger.warning("No user messages in conversation")
                return {
                    "text": "I'm ready to help! What would you like to do?",
                    "tool_calls": []
                }
            
            # Call OpenAI with function calling
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=openai_messages,
                tools=self.tools,
                tool_choice="auto",
                max_tokens=1000,
                temperature=0.7
            )
            
            message = response.choices[0].message
            
            result = {
                "text": message.content or "",
                "tool_calls": []
            }
            
            # Handle tool calls
            if message.tool_calls:
                for tool_call in message.tool_calls:
                    tool_name = tool_call.function.name
                    try:
                        tool_args = json.loads(tool_call.function.arguments)
                    except json.JSONDecodeError:
                        logger.error(f"Invalid JSON in tool arguments: {tool_call.function.arguments}")
                        continue
                    
                    # Execute tool
                    tool_result = self.execute_tool(tool_name, tool_args, user_id)
                    
                    result["tool_calls"].append({
                        "id": tool_call.id,
                        "name": tool_name,
                        "arguments": tool_args,
                        "result": tool_result
                    })
            
            return result
            
        except NameError as e:
            if "leading underscores" in str(e):
                logger.error(f"OpenAI/Pydantic compatibility error: {e}")
                logger.error("This is a version compatibility issue. OpenAI has been updated, but server restart is required.")
                return {
                    "error": "library_compatibility",
                    "text": "There's a compatibility issue with the AI library. The OpenAI package has been updated to version 1.109.1, but the backend server needs to be restarted to load the new version. Please restart the backend server."
                }
            raise
        except Exception as e:
            logger.error(f"Error in AI chat: {e}", exc_info=True)
            # Return a more helpful error message
            error_msg = str(e)
            if "rate limit" in error_msg.lower():
                return {
                    "error": "rate_limit",
                    "text": "I'm receiving too many requests. Please wait a moment and try again."
                }
            elif "api key" in error_msg.lower() or "authentication" in error_msg.lower():
                return {
                    "error": "auth_error",
                    "text": "There's an issue with the AI service configuration. Please contact support."
                }
            elif "leading underscores" in error_msg.lower() or "pydantic" in error_msg.lower():
                return {
                    "error": "library_compatibility",
                    "text": "There's a compatibility issue with the AI library. The OpenAI package has been updated, but the server needs to be restarted. Please restart the backend server."
                }
            else:
                return {
                    "error": "unknown_error",
                    "text": "I'm having trouble processing your request right now. Please try again in a moment."
                }


# Global instance
ai_service = AIService()

