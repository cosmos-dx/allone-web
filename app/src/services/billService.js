import apiClient, { getApiUrl } from './api';

export const billService = {
  // Get all bills for a space
  async getBills(spaceId, headers = null) {
    const authHeaders = headers || {};
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills`),
      { headers: authHeaders }
    );
    return response.data;
  },

  // Get single bill
  async getBill(spaceId, billId, headers = null) {
    const authHeaders = headers || {};
    const response = await apiClient.get(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      { headers: authHeaders }
    );
    return response.data;
  },

  // Create bill
  async createBill(spaceId, billData, headers = null) {
    const authHeaders = headers || {};
    const response = await apiClient.post(
      getApiUrl(`/api/spaces/${spaceId}/bills`),
      billData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Update bill
  async updateBill(spaceId, billId, billData, headers = null) {
    const authHeaders = headers || {};
    const response = await apiClient.put(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      billData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Delete bill
  async deleteBill(spaceId, billId, headers = null) {
    const authHeaders = headers || {};
    await apiClient.delete(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}`),
      { headers: authHeaders }
    );
  },

  // Settle bill (mark participant payment)
  async settleBill(spaceId, billId, settlementData, headers = null) {
    const authHeaders = headers || {};
    const response = await apiClient.post(
      getApiUrl(`/api/spaces/${spaceId}/bills/${billId}/settle`),
      settlementData,
      { headers: authHeaders }
    );
    return response.data;
  },

  // Get balance summary
  async getBalances(spaceId, headers = null) {
    const authHeaders = headers || {};
    try {
      const response = await apiClient.get(
        getApiUrl(`/api/spaces/${spaceId}/bills/balances`),
        { headers: authHeaders }
      );
      return response.data || { balances: [] };
    } catch (error) {
      if (error.response?.status === 404) {
        return { balances: [] };
      }
      throw error;
    }
  },

  // Get settlement history
  async getHistory(spaceId, headers = null) {
    const authHeaders = headers || {};
    try {
      const response = await apiClient.get(
        getApiUrl(`/api/spaces/${spaceId}/bills/history`),
        { headers: authHeaders }
      );
      return response.data || { history: [] };
    } catch (error) {
      if (error.response?.status === 404) {
        return { history: [] };
      }
      throw error;
    }
  },
};

