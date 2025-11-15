"""
AI Assistant routes with SSE streaming
"""
import json
import logging
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from backend.models import AIChatRequest, AIQuery
from backend.middleware.auth import verify_token
from backend.middleware.rate_limit import check_rate_limit
from backend.services.intent_guard import IntentGuard, IntentType
from backend.services.guard_rails import GuardRails
from backend.services.conversation_buffer import get_session
from backend.services.ai_context import context_service
from backend.services.ai_service import ai_service
import asyncio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# Initialize services
intent_guard = IntentGuard()
guard_rails = GuardRails()


async def stream_ai_response(user_id: str, message: str, session_id: str = None):
    """
    Stream AI response using SSE
    """
    try:
        # Get or create session
        buffer = get_session(session_id)
        
        # Check if first message (greeting)
        is_first = buffer.is_first_message()
        
        # If first message, send greeting first
        if is_first:
            greeting = buffer.get_greeting()
            buffer.add_message("assistant", greeting)
            yield f"data: {json.dumps({'type': 'text', 'content': greeting})}\n\n"
            # Minimal delay to ensure greeting is sent
            await asyncio.sleep(0.05)
        
        # Add user message to buffer
        buffer.add_message("user", message)
        
        # Get user context
        try:
            context = context_service.get_user_context(user_id)
        except Exception as e:
            logger.error(f"Error getting user context: {e}", exc_info=True)
            context = {}
        
        # Validate with guard rails
        validation = guard_rails.validate(message, "general", user_id)
        if not validation.get("is_valid"):
            error_msg = validation.get("reason", "Request blocked for security reasons")
            buffer.add_message("assistant", error_msg)
            yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
            return
        
        # Classify intent (with conversation context for follow-up questions)
        conversation_history = buffer.get_messages(include_system=False)
        intent_result = intent_guard.validate_intent(message, conversation_history)
        intent_type = IntentType(intent_result["intent"])
        
        # If intent requires parameters and they're missing, ask for them
        # But only if it's not a follow-up to a previous question
        if not intent_result["is_complete"] and intent_type != IntentType.GENERAL_QUERY:
            missing = intent_result["missing_parameters"]
            optional = intent_result["optional_parameters"]
            
            # Check if this is a follow-up (assistant asked for info in last message)
            is_followup = False
            if conversation_history and len(conversation_history) > 1:
                last_assistant_msg = None
                for msg in reversed(conversation_history[:-1]):  # Exclude current user message
                    if msg.get("role") == "assistant":
                        last_assistant_msg = msg.get("content", "")
                        break
                
                if last_assistant_msg and any(phrase in last_assistant_msg.lower() for phrase in [
                    "need", "provide", "missing", "information", "tell me", "what is"
                ]):
                    is_followup = True
            
            # If it's a follow-up, let AI handle it naturally instead of blocking
            if not is_followup:
                response_text = f"I'd be happy to help you {intent_type.value.replace('_', ' ')}! "
                if missing:
                    response_text += f"I need a bit more information: {', '.join(missing)}. "
                if optional:
                    response_text += f"Optional: {', '.join(optional)}. "
                response_text += "Please provide the missing information."
                
                buffer.add_message("assistant", response_text)
                yield f"data: {json.dumps({'type': 'text', 'content': response_text})}\n\n"
                return
        
        # Get conversation messages for AI (includes current user message)
        # Exclude system message as it will be added by AI service
        messages = buffer.get_messages(include_system=False)
        
        # Ensure we have messages to process
        if not messages:
            logger.warning("No messages in buffer")
            # Don't show error, just return silently
            return
        
        # Ensure we have at least one user message
        user_messages = [msg for msg in messages if msg.get("role") == "user"]
        if not user_messages:
            logger.warning("No user messages in buffer")
            return
        
        # Call AI service with all messages (including current user message)
        try:
            ai_response = ai_service.chat(messages, context, user_id)
        except Exception as e:
            logger.error(f"Error in AI service chat: {e}", exc_info=True)
            # Only show error if it's not the first message (to avoid showing error right after greeting)
            if not is_first:
                error_msg = "I'm having trouble processing your request. Please try again."
                buffer.add_message("assistant", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
            return
        
        # Handle errors from AI service
        if ai_response.get("error"):
            error_msg = ai_response.get("text", "I encountered an issue. Please try rephrasing your question.")
            # Only show error if it's a real error, not just a warning
            if error_msg and "not available" not in error_msg.lower():
                buffer.add_message("assistant", error_msg)
                yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
            return
        
        # Stream text response
        if ai_response.get("text"):
            # Stream text in chunks for visible effect
            text = ai_response["text"]
            
            # Send in smaller chunks for visible streaming effect
            chunk_size = 5
            full_text = ""
            for i in range(0, len(text), chunk_size):
                chunk = text[i:i+chunk_size]
                full_text += chunk
                yield f"data: {json.dumps({'type': 'text', 'content': chunk})}\n\n"
                # Small delay to make streaming visible
                if i + chunk_size < len(text):  # Don't delay on last chunk
                    await asyncio.sleep(0.015)  # Visible but not too slow
            
            # Add complete message to buffer only if we have text
            if full_text.strip():
                buffer.add_message("assistant", full_text)
        
        # Handle tool calls
        if ai_response.get("tool_calls"):
            for tool_call in ai_response["tool_calls"]:
                tool_name = tool_call["name"]
                tool_result = tool_call["result"]
                
                # Send tool call notification
                yield f"data: {json.dumps({'type': 'tool_call', 'tool_name': tool_name, 'tool_args': tool_call['arguments']})}\n\n"
                
                # Send tool result
                if tool_result.get("success"):
                    result_data = {
                        "type": "tool_result",
                        "tool_name": tool_name,
                        "success": True,
                        "message": tool_result.get("message", ""),
                        "data": tool_result.get("data", {}),
                        "action": tool_result.get("action")
                    }
                    
                    # Add redirect URL if available
                    if tool_result.get("redirect_url"):
                        result_data["redirect_url"] = tool_result["redirect_url"]
                        result_data["type"] = "link"
                    
                    # Add to conversation
                    tool_message = f"Executed {tool_name}: {tool_result.get('message', '')}"
                    buffer.add_message("assistant", tool_message)
                    
                    yield f"data: {json.dumps(result_data)}\n\n"
                else:
                    error_msg = tool_result.get("error", "Tool execution failed")
                    buffer.add_message("assistant", f"Error: {error_msg}")
                    yield f"data: {json.dumps({'type': 'error', 'content': error_msg})}\n\n"
        
        # Send completion
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        
    except Exception as e:
        logger.error(f"Error in stream_ai_response: {e}", exc_info=True)
        yield f"data: {json.dumps({'type': 'error', 'content': 'An error occurred. Please try again.'})}\n\n"


@router.post("/chat/stream")
async def ai_chat_stream(request: AIChatRequest, token_data: dict = Depends(verify_token)):
    """
    SSE endpoint for AI chat with streaming responses
    """
    user_id = token_data['uid']
    
    # Check rate limit
    is_allowed, rate_info = check_rate_limit(user_id)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=rate_info
        )
    
    # Validate message
    if not request.message or not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    
    # Get session ID
    session_id = request.session_id
    
    return StreamingResponse(
        stream_ai_response(user_id, request.message.strip(), session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/chat")
async def ai_chat(query: AIQuery, token_data: dict = Depends(verify_token)):
    """
    Legacy endpoint for backward compatibility (non-streaming)
    """
    user_id = token_data['uid']
    
    # Check rate limit
    is_allowed, rate_info = check_rate_limit(user_id)
    if not is_allowed:
        raise HTTPException(
            status_code=429,
            detail=rate_info
        )
    
    try:
        # Get session
        buffer = get_session()
        
        # Get context
        context = context_service.get_user_context(user_id)
        
        # Validate
        validation = guard_rails.validate(query.query, "general", user_id)
        if not validation.get("is_valid"):
            raise HTTPException(status_code=400, detail=validation.get("reason"))
        
        # Add message
        buffer.add_message("user", query.query)
        
        # Get messages
        messages = buffer.get_messages(include_system=False)
        
        # Call AI service
        ai_response = ai_service.chat(messages, context, user_id)
        
        if ai_response.get("error"):
            raise HTTPException(status_code=500, detail=ai_response.get("error"))
        
        response_text = ai_response.get("text", "")
        buffer.add_message("assistant", response_text)
        
        return {
            "response": response_text,
            "tool_calls": ai_response.get("tool_calls", [])
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI chat failed: {str(e)}")


@router.post("/analyze-passwords")
async def analyze_passwords(token_data: dict = Depends(verify_token)):
    """
    Analyze passwords for security issues (metadata only)
    """
    try:
        user_id = token_data['uid']
        context = context_service.get_user_context(user_id)
        
        passwords = context.get("passwords", [])
        weak_count = sum(1 for p in passwords if p.get("strength", 0) < 3)
        total_count = len(passwords)
        
        analysis = {
            "totalPasswords": total_count,
            "weakPasswords": weak_count,
            "securityScore": max(0, 100 - (weak_count * 10)) if total_count > 0 else 0,
            "recommendations": []
        }
        
        if weak_count > 0:
            analysis["recommendations"].append(f"You have {weak_count} weak password(s). Consider updating them.")
        
        if total_count > 50:
            analysis["recommendations"].append("Consider organizing your passwords into categories.")
        
        return analysis
    except Exception as e:
        logger.error(f"Password analysis error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Password analysis failed: {str(e)}")
