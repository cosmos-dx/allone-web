import apiClient, { getApiUrl } from './api';
import { API_ENDPOINTS } from '../constants';

export const notificationService = {
  async getAll(headers = null) {
    const config = headers ? { headers: await (typeof headers === 'function' ? headers() : headers) } : {};
    const response = await apiClient.get(getApiUrl(API_ENDPOINTS.NOTIFICATIONS), config);
    return response.data;
  },

  async markAsRead(notificationId, headers = null) {
    const config = headers ? { headers: await (typeof headers === 'function' ? headers() : headers) } : {};
    await apiClient.put(
      getApiUrl(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`),
      {},
      config
    );
  },

  async delete(notificationId, headers = null) {
    const config = headers ? { headers: await (typeof headers === 'function' ? headers() : headers) } : {};
    await apiClient.delete(getApiUrl(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}`), config);
  },

  async clearAll(headers = null) {
    const config = headers ? { headers: await (typeof headers === 'function' ? headers() : headers) } : {};
    const response = await apiClient.delete(getApiUrl(API_ENDPOINTS.NOTIFICATIONS), config);
    return response.data;
  },
};
