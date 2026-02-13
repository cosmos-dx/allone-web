import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import aiService from '../services/aiService';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export default function AIAssistant({ isOpen, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState('');
  const { getAuthHeaders, encryptionKey } = useAuth();
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add greeting message
      setMessages([{
        role: 'assistant',
        content: 'Hello! I\'m your AllOne AI assistant. How can I help you today?',
        timestamp: Date.now(),
      }]);
    }
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollToEnd({ animated: true });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentMessage]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = { 
      role: 'user', 
      content: input.trim(),
      timestamp: Date.now(),
    };
    const userInput = input.trim();
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setCurrentMessage('');

    // Handle streaming chunks
    const onChunk = (chunk) => {
      if (chunk) {
        setCurrentMessage(prev => (prev || '') + chunk);
      }
    };

    // Handle tool calls
    const onToolCall = async (toolName, toolArgs, toolResult) => {
      if (toolResult && toolResult.action) {
        try {
          const result = await aiService.executeToolAction(
            toolResult.action,
            toolResult.data,
            getAuthHeaders,
            encryptionKey
          );

          if (result.success) {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: result.message || 'Action completed successfully',
              type: 'tool_result',
              timestamp: Date.now()
            }]);
          } else {
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: `Error: ${result.error || 'Action failed'}`,
              type: 'error',
              timestamp: Date.now()
            }]);
          }
        } catch (error) {
          console.error('Error executing tool action:', error);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: 'Failed to execute action. Please try again.',
            type: 'error',
            timestamp: Date.now()
          }]);
        }
      }
    };

    // Handle redirect links
    const onLink = (url, message) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: message || 'Click the link to view',
        type: 'link',
        url: url,
        timestamp: Date.now()
      }]);
    };

    // Handle errors
    const onError = (errorMessage) => {
      if (errorMessage && !errorMessage.includes('I encountered an error')) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: errorMessage,
          type: 'error',
          timestamp: Date.now()
        }]);
      }
    };

    // Handle completion
    const onDone = () => {
      if (currentMessage && currentMessage.trim()) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: currentMessage.trim(),
          type: 'text',
          timestamp: Date.now()
        }]);
      }
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
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: error.message || 'Sorry, I encountered an error. Please try again.',
        type: 'error',
        timestamp: Date.now()
      }]);
      setLoading(false);
      setCurrentMessage('');
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    
    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessage : styles.assistantMessage]}>
        {!isUser && (
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="robot" size={20} color="#9333ea" />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
          <Text style={[styles.messageText, isUser && styles.userMessageText]}>
            {item.content}
          </Text>
        </View>
        {isUser && (
          <View style={styles.avatar}>
            <MaterialCommunityIcons name="account" size={20} color="#6b7280" />
          </View>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <LinearGradient colors={['#faf5ff', '#fff7ed']} style={styles.gradient}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <MaterialCommunityIcons name="robot" size={24} color="#9333ea" />
              </View>
              <View>
                <Text style={styles.headerTitle}>AllOne Assistant</Text>
                <Text style={styles.headerSubtitle}>Powered by AI</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={messagesEndRef}
            data={[...messages, ...(currentMessage ? [{
              role: 'assistant',
              content: currentMessage,
              timestamp: Date.now(),
              isStreaming: true,
            }] : [])]}
            renderItem={renderMessage}
            keyExtractor={(item, index) => `msg-${index}-${item.timestamp}`}
            contentContainerStyle={styles.messagesList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Start a conversation...</Text>
              </View>
            }
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask me anything..."
              placeholderTextColor="#9ca3af"
              multiline
              editable={!loading}
            />
            <TouchableOpacity
              onPress={sendMessage}
              disabled={!input.trim() || loading}
              style={[styles.sendButton, (!input.trim() || loading) && styles.sendButtonDisabled]}
            >
              <MaterialCommunityIcons name="send" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  closeButton: {
    padding: 5,
  },
  messagesList: {
    padding: 20,
    flexGrow: 1,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  assistantMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#9333ea',
  },
  assistantBubble: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    color: '#1f2937',
  },
  userMessageText: {
    color: '#ffffff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 16,
    color: '#1f2937',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#9333ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
  },
});

