import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const userService = {
  // Search users by name or email
  async search(query) {
    if (!query || query.length < 2) {
      return [];
    }
    const response = await apiClient.get(
      getApiUrl(API_ENDPOINTS.USERS.SEARCH),
      { params: { query } }
    );
    return response.data;
  },

  // Get current user
  async getCurrent() {
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.AUTH.USER));
    return response.data;
  },

  // Update user
  async update(userData) {
    const response = await apiClient.put(
      getApiUrl(API_ENDPOINTS.AUTH.USER),
      userData
    );
    return response.data;
  },
};

