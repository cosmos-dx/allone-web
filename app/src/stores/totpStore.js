import { create } from 'zustand';
import { totpService } from '../services/totpService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'totp_cache_';

const useTOTPStore = create((set, get) => ({
  // State
  totps: [],
  loading: false,
  error: null,

  // Actions
  setTotps: (totps) => set({ totps }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Cache
  cache: {
    data: null,
    timestamp: null,
    key: null
  },

  loadTOTPs: async (spaceId = null, includeShared = true, forceRefresh = false, getAuthHeaders) => {
    const cacheKey = `totps_${spaceId || 'all'}_${includeShared}`;
    const { cache } = get();
    
    if (!forceRefresh && cache.data && cache.key === cacheKey && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        get().setTotps(cache.data);
        return cache.data;
      }
    }

    const storageKey = `${STORAGE_KEY_PREFIX}${cacheKey}`;
    if (!forceRefresh) {
      try {
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const age = Date.now() - timestamp;
          if (age < STORAGE_TTL) {
            get().setTotps(data);
            set({
              cache: {
                data,
                timestamp: Date.now(),
                key: cacheKey
              }
            });
            return data;
          } else {
            await AsyncStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn('Failed to load from AsyncStorage:', e);
      }
    }

    set({ loading: true, error: null });
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const totps = await totpService.getAll(spaceId, includeShared, headers);
      get().setTotps(totps);
      const now = Date.now();
      set({
        cache: {
          data: totps,
          timestamp: now,
          key: cacheKey
        }
      });
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ data: totps, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to AsyncStorage:', e);
      }
      return totps;
    } catch (error) {
      console.error('Failed to load TOTPs:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createTOTP: async (totpData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const created = await totpService.create(totpData, headers);
      set((state) => ({
        totps: [...state.totps, created],
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const totpKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(totpKeys);
      return created;
    } catch (error) {
      console.error('Failed to create TOTP:', error);
      throw error;
    }
  },

  updateTOTP: async (totpId, totpData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await totpService.update(totpId, totpData, headers);
      set((state) => ({
        totps: state.totps.map(t => t.totpId === totpId ? updated : t),
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const totpKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(totpKeys);
      return updated;
    } catch (error) {
      console.error('Failed to update TOTP:', error);
      throw error;
    }
  },

  deleteTOTP: async (totpId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await totpService.delete(totpId, headers);
      set((state) => ({
        totps: state.totps.filter(t => t.totpId !== totpId),
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const totpKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(totpKeys);
    } catch (error) {
      console.error('Failed to delete TOTP:', error);
      throw error;
    }
  },
}));

export default useTOTPStore;

