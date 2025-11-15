import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const notificationService = {
  // Get all notifications
  async getAll(headers = null) {
    const config = headers ? { headers } : {};
    const response = await apiClient.get(getApiUrl('/api/notifications'), config);
    return response.data;
  },

  // Mark notification as read
  async markAsRead(notificationId, headers = null) {
    const config = headers ? { headers } : {};
    const response = await apiClient.put(
      getApiUrl(`/api/notifications/${notificationId}/read`),
      {},
      config
    );
    return response.data;
  },

  // Delete notification
  async delete(notificationId, headers = null) {
    const config = headers ? { headers } : {};
    await apiClient.delete(getApiUrl(`/api/notifications/${notificationId}`), config);
  },

  // Clear all notifications
  async clearAll(headers = null) {
    const config = headers ? { headers } : {};
    const response = await apiClient.delete(getApiUrl('/api/notifications'), config);
    return response.data;
  },
};

