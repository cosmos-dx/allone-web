import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Bot, User, ExternalLink } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import { handleAILink } from '../utils/navigation';
import { toast } from 'sonner';

export default function AIAssistant({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const [hasReceivedGreeting, setHasReceivedGreeting] = useState(false);
  const { getAuthHeaders, encryptionKey } = useAuth();
  const messagesEndRef = useRef(null);
  const currentMessageRef = useRef('');
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    // Scroll to bottom when messages change or when streaming
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        scrollToBottom();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, currentMessage]);

  useEffect(() => {
    // Only reset greeting flag when sidebar closes, but keep messages
    if (!isOpen) {
      setHasReceivedGreeting(false);
      // Don't clear messages - they should persist when reopening
    }
    // Cleanup on unmount
    return () => {
      if (!isOpen) {
        aiService.close();
      }
    };
  }, [isOpen]);
  
  // Ensure messages persist - never clear them unintentionally
  // Messages should only be cleared if user explicitly starts a new session

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { 
      role: 'user', 
      content: input.trim(),
      timestamp: Date.now(),
      type: 'text'
    };
    const userInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setCurrentMessage('');
    currentMessageRef.current = ''; // Reset ref as well

    // Handle streaming chunks
    const onChunk = (chunk) => {
      if (chunk) {
        setCurrentMessage(prev => {
          const newMessage = (prev || '') + chunk;
          currentMessageRef.current = newMessage; // Update ref
          return newMessage;
        });
      }
    };

    // Handle tool calls
    const onToolCall = async (toolName, toolArgs, toolResult) => {
      if (toolResult && toolResult.action) {
        // Execute action that requires encryption
        if (toolResult.action === 'create_password' || toolResult.action === 'create_totp') {
          try {
            const result = await aiService.executeToolAction(
              toolResult.action,
              toolResult.data,
              getAuthHeaders,
              encryptionKey
            );

            if (result.success) {
              toast.success(result.message || 'Action completed successfully');
              // Add success message to chat
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: result.message || 'Action completed successfully',
                type: 'tool_result',
                timestamp: Date.now()
              }]);
            } else {
              toast.error(result.error || 'Action failed');
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `Error: ${result.error || 'Action failed'}`,
                type: 'error',
                timestamp: Date.now()
              }]);
            }
          } catch (error) {
            console.error('Error executing tool action:', error);
            toast.error('Failed to execute action');
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'Failed to execute action. Please try again.',
              type: 'error',
              timestamp: Date.now()
            }]);
          }
        }
      }
    };

    // Handle redirect links
    const onLink = (url, message) => {
      const linkMessage = {
        role: 'assistant',
        content: message || 'Click the link to view',
        type: 'link',
        url: url,
        timestamp: Date.now()
      };
      setMessages(prev => {
        // Check if this message already exists to avoid duplicates
        const exists = prev.some(msg => 
          msg.type === 'link' && msg.url === url && msg.content === linkMessage.content
        );
        if (exists) return prev;
        return [...prev, linkMessage];
      });
    };

    // Handle errors
    const onError = (errorMessage) => {
      // Don't show generic error messages that might be false positives
      if (errorMessage && !errorMessage.includes('I encountered an error')) {
        setMessages(prev => {
          // Check if this error already exists to avoid duplicates
          const exists = prev.some(msg => 
            msg.type === 'error' && msg.content === errorMessage
          );
          if (exists) return prev;
          return [...prev, {
            role: 'assistant',
            content: errorMessage,
            type: 'error',
            timestamp: Date.now()
          }];
        });
        toast.error(errorMessage);
      }
    };

    // Handle completion
    const onDone = () => {
      // Always save current message before clearing - use ref to get latest value
      const messageToSave = currentMessageRef.current || currentMessage;
      if (messageToSave && messageToSave.trim()) {
        setMessages(prev => {
          const finalMessage = {
            role: 'assistant',
            content: messageToSave.trim(),
            type: 'text',
            timestamp: Date.now() // Add timestamp for uniqueness
          };
          // Check if this message already exists to avoid duplicates
          const exists = prev.some(msg => 
            msg.role === 'assistant' && 
            msg.content === finalMessage.content &&
            msg.type === 'text' &&
            Math.abs((msg.timestamp || 0) - finalMessage.timestamp) < 1000 // Within 1 second
          );
          if (!exists) {
            return [...prev, finalMessage];
          }
          return prev;
        });
      }
      // Clear current message and ref after saving
      currentMessageRef.current = '';
      setCurrentMessage('');
      setLoading(false);
    };

    try {
      await aiService.sendMessage(
        userInput,
        onChunk,
        onToolCall,
        onLink,
        onError,
        onDone,
        getAuthHeaders,
        encryptionKey
      );
    } catch (error) {
      console.error('AI chat failed:', error);
      // Only show error if it's not a connection issue that was already handled
      if (!error.message || !error.message.includes('Connection failed')) {
        const errorMessage = {
          role: 'assistant',
          content: error.message || 'Sorry, I encountered an error. Please try again.',
          type: 'error',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
      setLoading(false);
      setCurrentMessage('');
      currentMessageRef.current = ''; // Reset ref on error too
    }
  };

  const handleKeyPress = (e) => {
    // Allow Shift+Enter for new line, Enter alone sends message
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
    // Shift+Enter will naturally create a new line in textarea
  };

  const handleLinkClick = (url) => {
    if (url) {
      handleAILink(url);
      // Close AI assistant after navigation
      setTimeout(() => onClose(), 500);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* AI Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed right-0 top-0 h-full w-full sm:w-96 z-50"
            data-testid="ai-assistant-sidebar"
          >
            <div className="glass-dark h-full flex flex-col shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="p-4 border-b border-white/10 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">AllOne assistant</h2>
                    <p className="text-xs text-white/60">Powered by OpenAI</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-white/80 hover:text-white hover:bg-white/10"
                  data-testid="ai-close-btn"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages */}
              <div 
                className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 flex-shrink" 
                style={{ 
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                {messages.length === 0 && !loading && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/10 rounded-2xl px-4 py-3">
                      <p className="text-sm text-white/60">Start a conversation with the AI assistant...</p>
                    </div>
                  </div>
                )}
                {messages.map((message, index) => {
                  // Create a stable key using timestamp and index
                  const messageKey = `msg-${index}-${message.role}-${message.timestamp || index}-${message.type || 'text'}`;
                  return (
                  <motion.div
                    key={messageKey}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-r from-purple-600 to-orange-500 text-white'
                          : message.type === 'error'
                          ? 'bg-red-500/20 text-red-200 border border-red-500/30'
                          : message.type === 'link'
                          ? 'bg-blue-500/20 text-blue-200 border border-blue-500/30'
                          : 'bg-white/10 text-white'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.type === 'link' && message.url && (
                        <Button
                          onClick={() => handleLinkClick(message.url)}
                          className="mt-2 w-full bg-blue-500/30 hover:bg-blue-500/50 text-white text-xs"
                          size="sm"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View Details
                        </Button>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </motion.div>
                  );
                })}
                
                {/* Streaming message */}
                {loading && currentMessage && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/10 rounded-2xl px-4 py-3 max-w-[80%]">
                      <p className="text-sm text-white whitespace-pre-wrap">{currentMessage}</p>
                    </div>
                  </div>
                )}
                
                {/* Loading indicator */}
                {loading && !currentMessage && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-orange-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white/10 rounded-2xl px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 border-t border-white/10 flex-shrink-0">
                <div className="flex gap-2 items-end">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Ask me anything... (Shift+Enter for new line)"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:border-purple-400 resize-none min-h-[44px] max-h-32"
                    disabled={loading}
                    data-testid="ai-input"
                    rows={1}
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="bg-gradient-to-r from-purple-600 to-orange-500 text-white hover:scale-105 smooth-transition"
                    data-testid="ai-send-btn"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
