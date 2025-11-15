import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

// Helper to get auth headers from Firebase
const getAuthHeaders = async () => {
  const { auth } = await import('../config/firebase');
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const passwordService = {
  // Get all passwords
  async getAll(spaceId = null, includeShared = true, headers = null) {
    const params = {};
    if (spaceId) params.spaceId = spaceId;
    if (includeShared !== undefined) params.includeShared = includeShared;
    
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.PASSWORDS), { 
      params,
      headers: authHeaders 
    });
    return response.data;
  },

  // Get single password
  async getById(passwordId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`), {
      headers: authHeaders
    });
    return response.data;
  },

  // Create password
  async create(passwordData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.PASSWORDS),
      passwordData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Update password
  async update(passwordId, passwordData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`),
      passwordData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Delete password
  async delete(passwordId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`), {
      headers: authHeaders
    });
  },

  // Export passwords (requires passkey)
  async exportPasswords(headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/export`), {
      headers: authHeaders
    });
    return response.data;
  },
};

