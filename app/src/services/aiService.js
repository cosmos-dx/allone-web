/**
 * AI Service for handling SSE connections and streaming responses
 */
import { encryptData } from '../utils/encryption';
import { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

class AIService {
  constructor() {
    this.eventSource = null;
    this.sessionId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 3;
  }

  /**
   * Generate or retrieve session ID
   */
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    return this.sessionId;
  }

  /**
   * Send message via SSE and handle streaming response
   */
  async sendMessage(message, onChunk, onToolCall, onLink, onError, onDone, getAuthHeaders, encryptionKey) {
    // Close existing connection if any
    this.close();

    const sessionId = this.getSessionId();
    const headers = await getAuthHeaders();

    try {
      // Use fetch for SSE (EventSource doesn't support custom headers in RN)
      const response = await fetch(getApiUrl(API_ENDPOINTS.AI.CHAT_STREAM), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': headers.Authorization || headers.authorization || '',
        },
        body: JSON.stringify({
          message,
          session_id: sessionId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              await this.handleSSEData(data, onChunk, onToolCall, onLink, onError, getAuthHeaders, encryptionKey);
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }

      if (onDone) {
        onDone();
      }
    } catch (error) {
      console.error('SSE connection error:', error);
      if (onError) {
        onError(error.message || 'Connection failed');
      }
    }
  }

  /**
   * Handle SSE data events
   */
  async handleSSEData(data, onChunk, onToolCall, onLink, onError, getAuthHeaders, encryptionKey) {
    try {
      switch (data.type) {
        case 'text':
          if (onChunk && data.content) {
            onChunk(data.content);
          }
          break;

        case 'tool_call':
          if (onToolCall) {
            onToolCall(data.tool_name, data.tool_args);
          }
          break;

        case 'tool_result':
        case 'link':
          if (data.redirect_url && onLink) {
            onLink(data.redirect_url, data.message || '');
          } else if (onToolCall && data.tool_name) {
            onToolCall(data.tool_name, data.data, data.message);
          }
          break;

        case 'error':
          if (onError && data.content && !data.content.includes('I encountered an error')) {
            onError(data.content);
          }
          break;

        case 'done':
          // Stream complete
          break;

        default:
          console.warn('Unknown SSE data type:', data.type);
      }
    } catch (error) {
      console.error('Error handling SSE data:', error);
    }
  }

  /**
   * Execute tool action (for password/TOTP creation that needs encryption)
   */
  async executeToolAction(action, data, getAuthHeaders, encryptionKey) {
    const headers = await getAuthHeaders();

    try {
      if (action === 'create_password') {
        // Encrypt password
        const encryptedPassword = await encryptData(data.password, encryptionKey);
        const encryptedNotes = data.notes ? await encryptData(data.notes, encryptionKey) : '';

        // Create password via API
        const { default: apiClient } = await import('./api');
        const { getApiUrl } = await import('./api');
        const { API_ENDPOINTS } = await import('../constants');
        
        const response = await fetch(getApiUrl(API_ENDPOINTS.PASSWORDS), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': headers.Authorization || headers.authorization || '',
          },
          body: JSON.stringify({
            displayName: data.displayName,
            username: data.username || '',
            website: data.website || '',
            category: data.category || 'Other',
            encryptedPassword,
            notes: encryptedNotes,
            strength: data.strength || 0,
            spaceId: data.spaceId || 'personal',
            tags: [],
          }),
        });

        const result = await response.json();
        return { success: true, data: result, message: `Password '${data.displayName}' created successfully!` };
      } else if (action === 'create_totp') {
        // Encrypt TOTP secret
        const encryptedSecret = await encryptData(data.secret, encryptionKey);

        const { getApiUrl } = await import('./api');
        const { API_ENDPOINTS } = await import('../constants');
        
        const response = await fetch(getApiUrl(API_ENDPOINTS.TOTP), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': headers.Authorization || headers.authorization || '',
          },
          body: JSON.stringify({
            serviceName: data.serviceName,
            account: data.account || '',
            encryptedSecret,
            spaceId: data.spaceId || 'personal',
          }),
        });

        const result = await response.json();
        return { success: true, data: result, message: `TOTP '${data.serviceName}' created successfully!` };
      }

      return { success: false, error: 'Unknown action' };
    } catch (error) {
      console.error('Error executing tool action:', error);
      return {
        success: false,
        error: error.response?.data?.detail || error.message || 'Failed to execute action',
      };
    }
  }

  /**
   * Close SSE connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Reset session
   */
  resetSession() {
    this.sessionId = null;
    this.close();
  }
}

export default new AIService();

