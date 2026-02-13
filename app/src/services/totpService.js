import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const totpService = {
  // Get all TOTPs
  async getAll(spaceId = null, includeShared = true, headers = null) {
    const params = {};
    if (spaceId) params.spaceId = spaceId;
    if (includeShared !== undefined) params.includeShared = includeShared;
    
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.TOTP), { 
      params,
      headers: headers || {}
    });
    return response.data;
  },

  // Get single TOTP
  async getById(totpId, headers = null) {
    const response = await apiClient.get(getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`), {
      headers: headers || {}
    });
    return response.data;
  },

  // Create TOTP
  async create(totpData, headers = null) {
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.TOTP),
      totpData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Update TOTP
  async update(totpId, totpData, headers = null) {
    const response = await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`),
      totpData,
      { headers: headers || {} }
    );
    return response.data;
  },

  // Delete TOTP
  async delete(totpId, headers = null) {
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.TOTP}/${totpId}`), {
      headers: headers || {}
    });
  },
};

