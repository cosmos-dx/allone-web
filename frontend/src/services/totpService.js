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

export const totpService = {
  // Get all TOTPs
  async getAll(spaceId = null, includeShared = true, headers = null) {
    const params = {};
    if (spaceId) params.spaceId = spaceId;
    if (includeShared !== undefined) params.includeShared = includeShared;
    
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.TOTP), { 
      params,
      headers: authHeaders 
    });
    return response.data;
  },

  // Get single TOTP
  async getById(totpId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`), {
      headers: authHeaders
    });
    return response.data;
  },

  // Create TOTP
  async create(totpData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.TOTP),
      totpData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Update TOTP
  async update(totpId, totpData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`),
      totpData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Delete TOTP
  async delete(totpId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`), {
      headers: authHeaders
    });
  },
};

