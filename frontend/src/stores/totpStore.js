import { create } from 'zustand';
import { totpService } from '../services/totpService';
import { totpAdapter } from '../adapters/totpAdapter';
import { toast } from 'sonner';

const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'totp_cache_';

const useTOTPStore = create((set, get) => ({
  // State
  totps: [],
  loading: false,
  error: null,

  // Actions
  setTotps: (totps) => {
    const uiTotps = totpAdapter.toUIArray(totps);
    set({ totps: uiTotps });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Cache
  cache: {
    data: null,
    timestamp: null,
    key: null
  },

  loadTOTPs: async (spaceId = null, includeShared = true, forceRefresh = false) => {
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
        const stored = localStorage.getItem(storageKey);
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
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e);
      }
    }

    set({ loading: true, error: null });
    try {
      const totps = await totpService.getAll(spaceId, includeShared);
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
        localStorage.setItem(storageKey, JSON.stringify({ data: totps, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      return totps;
    } catch (error) {
      console.error('Failed to load TOTPs:', error);
      set({ error: error.message });
      toast.error('Failed to load authenticators');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createTOTP: async (totpData) => {
    try {
      const apiData = totpAdapter.toAPI(totpData);
      const created = await totpService.create(apiData);
      const uiTotp = totpAdapter.toUI(created);
      set((state) => ({
        totps: [...state.totps, uiTotp],
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Authenticator added successfully');
      return uiTotp;
    } catch (error) {
      console.error('Failed to create TOTP:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add authenticator';
      toast.error(errorMessage);
      throw error;
    }
  },

  updateTOTP: async (totpId, totpData) => {
    try {
      const apiData = totpAdapter.toAPI(totpData);
      const updated = await totpService.update(totpId, apiData);
      const uiTotp = totpAdapter.toUI(updated);
      set((state) => ({
        totps: state.totps.map(t => t.id === totpId ? uiTotp : t),
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Authenticator updated successfully');
      return uiTotp;
    } catch (error) {
      console.error('Failed to update TOTP:', error);
      toast.error('Failed to update authenticator');
      throw error;
    }
  },

  deleteTOTP: async (totpId) => {
    try {
      await totpService.delete(totpId);
      set((state) => ({
        totps: state.totps.filter(t => t.id !== totpId),
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Authenticator deleted');
    } catch (error) {
      console.error('Failed to delete TOTP:', error);
      toast.error('Failed to delete authenticator');
      throw error;
    }
  },
}));

export default useTOTPStore;

