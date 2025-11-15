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

export const spaceService = {
  // Get all spaces
  async getAll(headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.SPACES), {
      headers: authHeaders
    });
    return response.data;
  },

  // Get single space
  async getById(spaceId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`), {
      headers: authHeaders
    });
    return response.data;
  },

  // Create space
  async create(spaceData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.SPACES),
      spaceData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Update space
  async update(spaceId, spaceData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`),
      spaceData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Delete space
  async delete(spaceId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`), {
      headers: authHeaders
    });
  },

  // Add member to space
  async addMember(spaceId, userId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/members`),
      { userId },
      { headers: authHeaders }
    );
    return response.data;
  },

  // Remove member from space
  async removeMember(spaceId, memberId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.delete(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/members/${memberId}`),
      { headers: authHeaders }
    );
    return response.data;
  },

  // Transfer ownership
  async transferOwnership(spaceId, newOwnerId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/transfer-ownership`),
      { newOwnerId },
      { headers: authHeaders }
    );
    return response.data;
  },

  // Add admin
  async addAdmin(spaceId, userId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/admins`),
      { userId },
      { headers: authHeaders }
    );
    return response.data;
  },

  // Remove admin
  async removeAdmin(spaceId, adminId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    await apiClient.delete(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/admins/${adminId}`),
      { headers: authHeaders }
    );
  },
};

