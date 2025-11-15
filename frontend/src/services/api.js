import axios from 'axios';
import { API_CONFIG, getApiUrl } from '../config/api';
import { toast } from 'sonner';

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
    // Don't add token here - it should be added by the calling code via getAuthHeaders()
    // This allows each service to use Firebase tokens directly
    // If a token is already in headers, keep it
    if (!config.headers.Authorization) {
      // Fallback: try to get from localStorage if available (for backward compatibility)
      const token = localStorage.getItem('sessionToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
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

    // Handle 401 Unauthorized - but don't redirect automatically
    // Let the calling code handle it appropriately
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Don't redirect automatically - let the component handle it
      // Only clear localStorage if it's a real session expiry
      // (not just a missing token on first load)
      const hasToken = localStorage.getItem('sessionToken') || 
                       originalRequest.headers?.Authorization;
      
      if (hasToken) {
        // Token exists but is invalid - clear it
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('encryptionKey');
        toast.error('Session expired. Please refresh the page.');
      }
      
      // Don't redirect - let the error propagate to the calling code
      return Promise.reject(error);
    }

    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.');
      return Promise.reject(error);
    }

    // Handle other errors
    // Suppress 404 errors for balances and history endpoints (might not be available for all spaces)
    const requestUrl = originalRequest.url || error.config?.url || '';
    if (error.response?.status === 404 && 
        (requestUrl.includes('/bills/balances') || requestUrl.includes('bills%2Fbalances'))) {
      // Return a resolved promise with empty data instead of rejecting
      // This prevents the error from being logged in console
      return Promise.resolve({ data: { balances: [] } });
    }
    if (error.response?.status === 404 && 
        (requestUrl.includes('/bills/history') || requestUrl.includes('bills%2Fhistory'))) {
      // Return a resolved promise with empty data instead of rejecting
      return Promise.resolve({ data: { history: [] } });
    }

    const errorMessage = error.response?.data?.detail || error.message || 'An error occurred';
    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

export default apiClient;
export { getApiUrl };

