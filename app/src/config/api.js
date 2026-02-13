// API Configuration
export const API_CONFIG = {
  BASE_URL: 'https://allone.co.in', // Production API
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
};

export const getApiUrl = (endpoint) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

