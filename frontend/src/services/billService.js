import apiClient, { getApiUrl } from './api';

// Helper to get auth headers from Firebase
const getAuthHeaders = async () => {
  const { auth } = await import('../config/firebase');
  if (auth.currentUser) {
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }
  return {};
};

export const billService = {
  // Get all bills for a space
  async getBills(spaceId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills`),
      { headers: authHeaders }
    );
    return response.data;
  },

  // Get single bill
  async getBill(spaceId, billId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      { headers: authHeaders }
    );
    return response.data;
  },

  // Create bill
  async createBill(spaceId, billData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(`/api/spaces/${spaceId}/bills`),
      billData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Update bill
  async updateBill(spaceId, billId, billData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.put(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      billData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Delete bill
  async deleteBill(spaceId, billId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    await apiClient.delete(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      { headers: authHeaders }
    );
  },

  // Settle bill (mark participant payment)
  async settleBill(spaceId, billId, settlementData, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.post(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}/settle`),
      settlementData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Get balance summary
  async getBalances(spaceId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills/balances`),
      { headers: authHeaders }
    );
    // Interceptor handles 404s and returns {balances: []}
    return response.data || { balances: [] };
  },

  // Get settlement history
  async getHistory(spaceId, headers = null) {
    const authHeaders = headers || await getAuthHeaders();
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills/history`),
      { headers: authHeaders }
    );
    return response.data;
  },
};

