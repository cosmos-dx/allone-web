import { create } from 'zustand';
import { billService } from '../services/billService';

// Cache TTL: 30 seconds
const CACHE_TTL = 30 * 1000;

const useBillStore = create((set, get) => ({
  bills: [],
  balances: [],
  history: [],
  loading: false,
  error: null,
  cache: {
    bills: {},
    balances: {},
    history: {}
  },

  // Load bills for a space with caching
  loadBills: async (spaceId, headers = null, forceRefresh = false) => {
    const { cache } = get();
    const cacheKey = `bills_${spaceId}`;
    const cached = cache.bills[cacheKey];
    
    // Check cache
    if (!forceRefresh && cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        set({ bills: cached.data, loading: false });
        return cached.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const bills = await billService.getBills(spaceId, headers);
      // Update cache
      set({
        bills,
        loading: false,
        cache: {
          ...cache,
          bills: {
            ...cache.bills,
            [cacheKey]: { data: bills, timestamp: Date.now() }
          }
        }
      });
      return bills;
    } catch (error) {
      console.error('Failed to load bills:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Create bill
  createBill: async (spaceId, billData, headers = null) => {
    set({ loading: true, error: null });
    try {
      const newBill = await billService.createBill(spaceId, billData, headers);
      set(state => ({
        bills: [...state.bills, newBill],
        loading: false
      }));
      return newBill;
    } catch (error) {
      console.error('Failed to create bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Update bill
  updateBill: async (spaceId, billId, billData, headers = null) => {
    set({ loading: true, error: null });
    try {
      const updatedBill = await billService.updateBill(spaceId, billId, billData, headers);
      set(state => ({
        bills: state.bills.map(bill =>
          bill.billId === billId ? updatedBill : bill
        ),
        loading: false
      }));
      return updatedBill;
    } catch (error) {
      console.error('Failed to update bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Delete bill
  deleteBill: async (spaceId, billId, headers = null) => {
    set({ loading: true, error: null });
    try {
      await billService.deleteBill(spaceId, billId, headers);
      set(state => ({
        bills: state.bills.filter(bill => bill.billId !== billId),
        loading: false
      }));
    } catch (error) {
      console.error('Failed to delete bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Settle bill (mark payment)
  settleBill: async (spaceId, billId, settlementData, headers = null) => {
    set({ loading: true, error: null });
    try {
      await billService.settleBill(spaceId, billId, settlementData, headers);
      // Reload bills to get updated settlement status
      const bills = await billService.getBills(spaceId, headers);
      set({ bills, loading: false });
    } catch (error) {
      console.error('Failed to settle bill:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Load balances with caching
  loadBalances: async (spaceId, headers = null, forceRefresh = false) => {
    const { cache } = get();
    const cacheKey = `balances_${spaceId}`;
    const cached = cache.balances[cacheKey];
    
    // Check cache
    if (!forceRefresh && cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        set({ balances: cached.data, loading: false });
        return cached.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const data = await billService.getBalances(spaceId, headers);
      const balances = data.balances || [];
      // Update cache
      set({
        balances,
        loading: false,
        cache: {
          ...cache,
          balances: {
            ...cache.balances,
            [cacheKey]: { data: balances, timestamp: Date.now() }
          }
        }
      });
      return balances;
    } catch (error) {
      console.error('Failed to load balances:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Load settlement history with caching
  loadHistory: async (spaceId, headers = null, forceRefresh = false) => {
    const { cache } = get();
    const cacheKey = `history_${spaceId}`;
    const cached = cache.history[cacheKey];
    
    // Check cache
    if (!forceRefresh && cached && cached.timestamp) {
      const age = Date.now() - cached.timestamp;
      if (age < CACHE_TTL) {
        set({ history: cached.data, loading: false });
        return cached.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const data = await billService.getHistory(spaceId, headers);
      const history = data.history || [];
      // Update cache
      set({
        history,
        loading: false,
        cache: {
          ...cache,
          history: {
            ...cache.history,
            [cacheKey]: { data: history, timestamp: Date.now() }
          }
        }
      });
      return history;
    } catch (error) {
      console.error('Failed to load history:', error);
      set({ error: error.message, loading: false });
      return [];
    }
  },

  // Clear store
  clear: () => {
    set({
      bills: [],
      balances: [],
      history: [],
      loading: false,
      error: null
    });
  },
}));

export default useBillStore;

