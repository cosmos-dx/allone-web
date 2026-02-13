import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const passwordService = {
  // Get all passwords
  async getAll(spaceId = null, includeShared = true, headers = null) {
    const params = {};
    if (spaceId) params.spaceId = spaceId;
    if (includeShared !== undefined) params.includeShared = includeShared;
    
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.PASSWORDS), { 
      params,
      headers: headers || {}
    });
    return response.data;
  },

  // Get single password
  async getById(passwordId, headers = null) {
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`), {
      headers: headers || {}
    });
    return response.data;
  },

  // Create password
  async create(passwordData, headers = null) {
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.PASSWORDS),
      passwordData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Update password
  async update(passwordId, passwordData, headers = null) {
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`),
      passwordData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Delete password
  async delete(passwordId, headers = null) {
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/${passwordId}`), {
      headers: headers || {}
    });
  },

  // Export passwords (requires passkey)
  async exportPasswords(headers = null) {
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.PASSWORDS}/export`), {
      headers: headers || {}
    });
    return response.data;
  },
};

