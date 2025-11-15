import { create } from 'zustand';
import { totpService } from '../services/totpService';
import { totpAdapter } from '../adapters/totpAdapter';
import { toast } from 'sonner';

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

  // Load TOTPs with caching
  loadTOTPs: async (spaceId = null, includeShared = true, forceRefresh = false) => {
    const cacheKey = `totps_${spaceId || 'all'}_${includeShared}`;
    const { cache } = get();
    const CACHE_TTL = 30 * 1000; // 30 seconds
    
    // Check cache
    if (!forceRefresh && cache.data && cache.key === cacheKey && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        // Use cached data
        get().setTotps(cache.data);
        return cache.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const totps = await totpService.getAll(spaceId, includeShared);
      get().setTotps(totps);
      // Update cache
      set({
        cache: {
          data: totps,
          timestamp: Date.now(),
          key: cacheKey
        }
      });
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

  // Create TOTP
  createTOTP: async (totpData) => {
    try {
      const apiData = totpAdapter.toAPI(totpData);
      const created = await totpService.create(apiData);
      const uiTotp = totpAdapter.toUI(created);
      set((state) => ({
        totps: [...state.totps, uiTotp],
      }));
      toast.success('Authenticator added successfully');
      return uiTotp;
    } catch (error) {
      console.error('Failed to create TOTP:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add authenticator';
      toast.error(errorMessage);
      throw error;
    }
  },

  // Update TOTP
  updateTOTP: async (totpId, totpData) => {
    try {
      const apiData = totpAdapter.toAPI(totpData);
      const updated = await totpService.update(totpId, apiData);
      const uiTotp = totpAdapter.toUI(updated);
      set((state) => ({
        totps: state.totps.map(t => t.id === totpId ? uiTotp : t),
      }));
      toast.success('Authenticator updated successfully');
      return uiTotp;
    } catch (error) {
      console.error('Failed to update TOTP:', error);
      toast.error('Failed to update authenticator');
      throw error;
    }
  },

  // Delete TOTP
  deleteTOTP: async (totpId) => {
    try {
      await totpService.delete(totpId);
      set((state) => ({
        totps: state.totps.filter(t => t.id !== totpId),
      }));
      toast.success('Authenticator deleted');
    } catch (error) {
      console.error('Failed to delete TOTP:', error);
      toast.error('Failed to delete authenticator');
      throw error;
    }
  },
}));

export default useTOTPStore;

