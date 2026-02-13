import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Try to get token from AsyncStorage or from auth context
    const token = await AsyncStorage.getItem('sessionToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const hasToken = await AsyncStorage.getItem('sessionToken');
      if (hasToken) {
        // Token exists but is invalid - clear it
        await AsyncStorage.removeItem('sessionToken');
        await AsyncStorage.removeItem('encryptionKey');
      }
      
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      return Promise.reject(new Error('Network error. Please check your connection.'));
    }

    // Handle other errors
    const requestUrl = originalRequest.url || error.config?.url || '';
    if (error.response?.status === 404 && 
        (requestUrl.includes('/bills/balances') || requestUrl.includes('bills%2Fbalances'))) {
      return Promise.resolve({ data: { balances: [] } });
    }
    if (error.response?.status === 404 && 
        (requestUrl.includes('/bills/history') || requestUrl.includes('bills%2Fhistory'))) {
      return Promise.resolve({ data: { history: [] } });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { getApiUrl };

