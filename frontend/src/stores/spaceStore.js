import { create } from 'zustand';
import { spaceService } from '../services/spaceService';
import { spaceAdapter } from '../adapters/spaceAdapter';
import { toast } from 'sonner';

const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'space_cache_';

const useSpaceStore = create((set, get) => ({
  // State
  spaces: [],
  selectedSpace: null,
  spaceMembers: [],
  loading: false,
  error: null,

  // Actions
  setSpaces: (spaces) => {
    const uiSpaces = spaceAdapter.toUIArray(spaces);
    set({ spaces: uiSpaces });
  },

  setSelectedSpace: (space) => set({ selectedSpace: space }),

  setSpaceMembers: (members) => set({ spaceMembers: members }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Cache
  cache: {
    data: null,
    timestamp: null
  },

  loadSpaces: async (forceRefresh = false) => {
    const { cache } = get();
    
    if (!forceRefresh && cache.data && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        get().setSpaces(cache.data);
        return cache.data;
      }
    }

    const storageKey = `${STORAGE_KEY_PREFIX}all`;
    if (!forceRefresh) {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const age = Date.now() - timestamp;
          if (age < STORAGE_TTL) {
            get().setSpaces(data);
            set({
              cache: {
                data,
                timestamp: Date.now()
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
      const spaces = await spaceService.getAll();
      get().setSpaces(spaces);
      const now = Date.now();
      set({
        cache: {
          data: spaces,
          timestamp: now
        }
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify({ data: spaces, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      return spaces;
    } catch (error) {
      console.error('Failed to load spaces:', error);
      set({ error: error.message });
      toast.error('Failed to load spaces');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createSpace: async (spaceData) => {
    try {
      const apiData = spaceAdapter.toAPI(spaceData);
      const created = await spaceService.create(apiData);
      const uiSpace = spaceAdapter.toUI(created);
      set((state) => ({
        spaces: [...state.spaces, uiSpace],
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Space created successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to create space:', error);
      toast.error('Failed to create space');
      throw error;
    }
  },

  updateSpace: async (spaceId, spaceData) => {
    try {
      const apiData = spaceAdapter.toAPI(spaceData);
      const updated = await spaceService.update(spaceId, apiData);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Space updated successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to update space:', error);
      toast.error('Failed to update space');
      throw error;
    }
  },

  deleteSpace: async (spaceId) => {
    try {
      await spaceService.delete(spaceId);
      set((state) => ({
        spaces: state.spaces.filter(s => s.id !== spaceId),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Space deleted');
    } catch (error) {
      console.error('Failed to delete space:', error);
      toast.error('Failed to delete space');
      throw error;
    }
  },

  addMember: async (spaceId, userId) => {
    try {
      const updated = await spaceService.addMember(spaceId, userId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Member added to space');
      return uiSpace;
    } catch (error) {
      console.error('Failed to add member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add member';
      toast.error(errorMessage);
      throw error;
    }
  },

  removeMember: async (spaceId, memberId) => {
    try {
      const updated = await spaceService.removeMember(spaceId, memberId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Member removed from space');
      return uiSpace;
    } catch (error) {
      console.error('Failed to remove member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove member';
      toast.error(errorMessage);
      throw error;
    }
  },

  transferOwnership: async (spaceId, newOwnerId) => {
    try {
      const updated = await spaceService.transferOwnership(spaceId, newOwnerId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Ownership transferred successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to transfer ownership:', error);
      toast.error('Failed to transfer ownership');
      throw error;
    }
  },

  addAdmin: async (spaceId, userId) => {
    try {
      const updated = await spaceService.addAdmin(spaceId, userId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('Admin added successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to add admin:', error);
      toast.error('Failed to add admin');
      throw error;
    }
  },

  removeAdmin: async (spaceId, adminId) => {
    try {
      await spaceService.removeAdmin(spaceId, adminId);
      set({ cache: { data: null, timestamp: null } });
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      await get().loadSpaces();
      toast.success('Admin removed successfully');
    } catch (error) {
      console.error('Failed to remove admin:', error);
      toast.error('Failed to remove admin');
      throw error;
    }
  },
}));

export default useSpaceStore;

