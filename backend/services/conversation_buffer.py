"""
Conversational Buffer Service
Maintains conversation history per session
"""
import logging
from typing import List, Dict, Optional
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# In-memory session storage (in production, consider Redis or database)
_sessions: Dict[str, Dict] = {}


class ConversationBuffer:
    """Manages conversation history for AI sessions"""
    
    MAX_MESSAGES = 20  # Keep last 20 messages
    MAX_SESSION_AGE_HOURS = 24  # Sessions expire after 24 hours
    
    def __init__(self, session_id: Optional[str] = None):
        self.session_id = session_id or str(uuid.uuid4())
        if self.session_id not in _sessions:
            _sessions[self.session_id] = {
                "messages": [],
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
    
    def add_message(self, role: str, content: str, metadata: Optional[Dict] = None):
        """Add a message to the conversation buffer"""
        if self.session_id not in _sessions:
            _sessions[self.session_id] = {
                "messages": [],
                "created_at": datetime.utcnow().isoformat(),
                "last_activity": datetime.utcnow().isoformat()
            }
        
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat(),
            "metadata": metadata or {}
        }
        
        session = _sessions[self.session_id]
        session["messages"].append(message)
        session["last_activity"] = datetime.utcnow().isoformat()
        
        # Trim to max messages
        if len(session["messages"]) > self.MAX_MESSAGES:
            session["messages"] = session["messages"][-self.MAX_MESSAGES:]
        
        logger.debug(f"Added message to session {self.session_id}: {role} - {content[:50]}...")
    
    def get_messages(self, include_system: bool = True) -> List[Dict]:
        """Get conversation messages for LLM"""
        if self.session_id not in _sessions:
            return []
        
        messages = _sessions[self.session_id]["messages"].copy()
        
        if include_system:
            # Add system message at the beginning
            system_message = {
                "role": "system",
                "content": "You are a helpful AI assistant for AllOne Password Manager. Help users manage their passwords, authenticators, spaces, and settings securely. Never reveal actual password values or TOTP secrets. Always prioritize security."
            }
            messages.insert(0, system_message)
        
        return messages
    
    def get_recent_messages(self, count: int = 10) -> List[Dict]:
        """Get recent messages"""
        messages = self.get_messages(include_system=False)
        return messages[-count:] if len(messages) > count else messages
    
    def clear(self):
        """Clear conversation history"""
        if self.session_id in _sessions:
            _sessions[self.session_id]["messages"] = []
    
    def is_first_message(self) -> bool:
        """Check if this is the first user message in session"""
        if self.session_id not in _sessions:
            return True
        
        user_messages = [msg for msg in _sessions[self.session_id]["messages"] if msg["role"] == "user"]
        return len(user_messages) == 0
    
    def get_greeting(self) -> str:
        """Get greeting message for first interaction"""
        return "Hi! I'm your AllOne AI assistant. I can help you:\n\n" \
               "- Create and manage passwords\n" \
               "- Set up authenticators (TOTP)\n" \
               "- Create and manage spaces\n" \
               "- Update your settings\n" \
               "- Set up passkeys\n" \
               "- Search for passwords (I'll provide links)\n" \
               "- Answer questions about password security\n\n" \
               "How can I assist you today?"


def get_session(session_id: Optional[str] = None) -> ConversationBuffer:
    """Get or create a conversation session"""
    return ConversationBuffer(session_id)


def cleanup_old_sessions():
    """Clean up old sessions (call periodically)"""
    from datetime import datetime, timedelta
    cutoff = datetime.utcnow() - timedelta(hours=ConversationBuffer.MAX_SESSION_AGE_HOURS)
    
    sessions_to_remove = []
    for session_id, session_data in _sessions.items():
        last_activity = datetime.fromisoformat(session_data["last_activity"])
        if last_activity < cutoff:
            sessions_to_remove.append(session_id)
    
    for session_id in sessions_to_remove:
        del _sessions[session_id]
        logger.debug(f"Cleaned up old session: {session_id}")

