import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const authService = {
  // Create session
  async createSession(idToken) {
    const response = await apiClient.post(
      getApiUrl(API_ENDPOINTS.AUTH.SESSION),
      { idToken }
    );
    return response.data;
  },

  // Get current user
  async getCurrentUser() {
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.AUTH.USER));
    return response.data;
  },
};

