import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const spaceService = {
  // Get all spaces
  async getAll(headers = null) {
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.SPACES), {
      headers: headers || {}
    });
    return response.data;
  },

  // Get single space
  async getById(spaceId, headers = null) {
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`), {
      headers: headers || {}
    });
    return response.data;
  },

  // Create space
  async create(spaceData, headers = null) {
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.SPACES),
      spaceData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Update space
  async update(spaceId, spaceData, headers = null) {
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`),
      spaceData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Delete space
  async delete(spaceId, headers = null) {
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}`), {
      headers: headers || {}
    });
  },

  // Add member to space
  async addMember(spaceId, userId, headers = null) {
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/members`),
      { userId },
      { headers: headers || {} }
    );
    return response.data;
  },

  // Remove member from space
  async removeMember(spaceId, memberId, headers = null) {
    const response = await apiClient.delete(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/members/${memberId}`),
      { headers: headers || {} }
    );
    return response.data;
  },

  // Transfer ownership
  async transferOwnership(spaceId, newOwnerId, headers = null) {
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/transfer-ownership`),
      { newOwnerId },
      { headers: headers || {} }
    );
    return response.data;
  },

  // Add admin
  async addAdmin(spaceId, userId, headers = null) {
    const response = await apiClient.post(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/admins`),
      { userId },
      { headers: headers || {} }
    );
    return response.data;
  },

  // Remove admin
  async removeAdmin(spaceId, adminId, headers = null) {
    await apiClient.delete(
      getApiUrl(`${API_ENDPOINTS.SPACES}/${spaceId}/admins/${adminId}`),
      { headers: headers || {} }
    );
  },
};

