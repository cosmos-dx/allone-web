import { create } from 'zustand';
import { billService } from '../services/billService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'bill_cache_';

const useBillStore = create((set, get) => ({
  // State
  bills: {},
  balances: {},
  history: {},
  loading: false,
  error: null,

  // Cache
  cache: {
    bills: {},
    balances: {},
    history: {},
  },

  // Load bills for a space
  loadBills: async (spaceId, forceRefresh = false, getAuthHeaders) => {
    const cacheKey = `bills_${spaceId}`;
    const { cache } = get();

    if (!forceRefresh && cache.bills[cacheKey]?.timestamp) {
      const age = Date.now() - cache.bills[cacheKey].timestamp;
      if (age < CACHE_TTL) {
        set((state) => ({
          bills: { ...state.bills, [spaceId]: cache.bills[cacheKey].data },
        }));
        return cache.bills[cacheKey].data;
      }
    }

    const storageKey = `${STORAGE_KEY_PREFIX}bills_${spaceId}`;
    if (!forceRefresh) {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const age = Date.now() - timestamp;
          if (age < STORAGE_TTL) {
            set((state) => ({
              bills: { ...state.bills, [spaceId]: data },
              cache: {
                ...state.cache,
                bills: { ...state.cache.bills, [cacheKey]: { data, timestamp: Date.now() } },
              },
            }));
            return data;
          } else {
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn('Failed to load bills from storage:', e);
      }
    }

    set({ loading: true, error: null });
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const bills = await billService.getBills(spaceId, headers);
      const now = Date.now();
      set((state) => ({
        bills: { ...state.bills, [spaceId]: bills },
        cache: {
          ...state.cache,
          bills: { ...state.cache.bills, [cacheKey]: { data: bills, timestamp: now } },
        },
        loading: false,
      }));
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ data: bills, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save bills to storage:', e);
      }
      return bills;
    } catch (error) {
      console.error('Failed to load bills:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Load balances for a space
  loadBalances: async (spaceId, forceRefresh = false, getAuthHeaders) => {
    const cacheKey = `balances_${spaceId}`;
    const { cache } = get();

    if (!forceRefresh && cache.balances[cacheKey]?.timestamp) {
      const age = Date.now() - cache.balances[cacheKey].timestamp;
      if (age < CACHE_TTL) {
        set((state) => ({
          balances: { ...state.balances, [spaceId]: cache.balances[cacheKey].data },
        }));
        return cache.balances[cacheKey].data;
      }
    }

    set({ loading: true, error: null });
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const balances = await billService.getBalances(spaceId, headers);
      const now = Date.now();
      set((state) => ({
        balances: { ...state.balances, [spaceId]: balances },
        cache: {
          ...state.cache,
          balances: { ...state.cache.balances, [cacheKey]: { data: balances, timestamp: now } },
        },
        loading: false,
      }));
      return balances;
    } catch (error) {
      console.error('Failed to load balances:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  // Create bill
  createBill: async (spaceId, billData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const created = await billService.createBill(spaceId, billData, headers);
      set((state) => ({
        bills: {
          ...state.bills,
          [spaceId]: [...(state.bills[spaceId] || []), created],
        },
        cache: {
          ...state.cache,
          bills: { ...state.cache.bills, [`bills_${spaceId}`]: null },
        },
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const billKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(billKeys);
      return created;
    } catch (error) {
      console.error('Failed to create bill:', error);
      throw error;
    }
  },

  // Update bill
  updateBill: async (spaceId, billId, billData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await billService.updateBill(spaceId, billId, billData, headers);
      set((state) => ({
        bills: {
          ...state.bills,
          [spaceId]: (state.bills[spaceId] || []).map(b => b.billId === billId ? updated : b),
        },
        cache: {
          ...state.cache,
          bills: { ...state.cache.bills, [`bills_${spaceId}`]: null },
        },
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const billKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(billKeys);
      return updated;
    } catch (error) {
      console.error('Failed to update bill:', error);
      throw error;
    }
  },

  // Delete bill
  deleteBill: async (spaceId, billId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await billService.deleteBill(spaceId, billId, headers);
      set((state) => ({
        bills: {
          ...state.bills,
          [spaceId]: (state.bills[spaceId] || []).filter(b => b.billId !== billId),
        },
        cache: {
          ...state.cache,
          bills: { ...state.cache.bills, [`bills_${spaceId}`]: null },
        },
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const billKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(billKeys);
    } catch (error) {
      console.error('Failed to delete bill:', error);
      throw error;
    }
  },

  // Settle bill
  settleBill: async (spaceId, billId, settlementData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await billService.settleBill(spaceId, billId, settlementData, headers);
      set((state) => ({
        bills: {
          ...state.bills,
          [spaceId]: (state.bills[spaceId] || []).map(b => b.billId === billId ? updated : b),
        },
        cache: {
          ...state.cache,
          bills: { ...state.cache.bills, [`bills_${spaceId}`]: null },
        },
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const billKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(billKeys);
      return updated;
    } catch (error) {
      console.error('Failed to settle bill:', error);
      throw error;
    }
  },
}));

export default useBillStore;

