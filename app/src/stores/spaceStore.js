import { create } from 'zustand';
import { spaceService } from '../services/spaceService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  setSpaces: (spaces) => set({ spaces }),

  setSelectedSpace: (space) => set({ selectedSpace: space }),

  setSpaceMembers: (members) => set({ spaceMembers: members }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  // Cache
  cache: {
    data: null,
    timestamp: null
  },

  loadSpaces: async (forceRefresh = false, getAuthHeaders) => {
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
        const stored = await AsyncStorage.getItem(storageKey);
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
      const spaces = await spaceService.getAll(headers);
      get().setSpaces(spaces);
      const now = Date.now();
      set({
        cache: {
          data: spaces,
          timestamp: now
        }
      });
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ data: spaces, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to AsyncStorage:', e);
      }
      return spaces;
    } catch (error) {
      console.error('Failed to load spaces:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createSpace: async (spaceData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const created = await spaceService.create(spaceData, headers);
      set((state) => ({
        spaces: [...state.spaces, created],
        cache: { data: null, timestamp: null }
      }));
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      return created;
    } catch (error) {
      console.error('Failed to create space:', error);
      throw error;
    }
  },

  updateSpace: async (spaceId, spaceData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await spaceService.update(spaceId, spaceData, headers);
      set((state) => ({
        spaces: state.spaces.map(s => s.spaceId === spaceId ? updated : s),
        cache: { data: null, timestamp: null }
      }));
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      return updated;
    } catch (error) {
      console.error('Failed to update space:', error);
      throw error;
    }
  },

  deleteSpace: async (spaceId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await spaceService.delete(spaceId, headers);
      set((state) => ({
        spaces: state.spaces.filter(s => s.spaceId !== spaceId),
        cache: { data: null, timestamp: null }
      }));
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
    } catch (error) {
      console.error('Failed to delete space:', error);
      throw error;
    }
  },

  addMember: async (spaceId, userId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await spaceService.addMember(spaceId, userId, headers);
      set((state) => ({
        spaces: state.spaces.map(s => s.spaceId === spaceId ? updated : s),
        cache: { data: null, timestamp: null }
      }));
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      return updated;
    } catch (error) {
      console.error('Failed to add member:', error);
      throw error;
    }
  },

  removeMember: async (spaceId, memberId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await spaceService.removeMember(spaceId, memberId, headers);
      set((state) => ({
        spaces: state.spaces.map(s => s.spaceId === spaceId ? updated : s),
        cache: { data: null, timestamp: null }
      }));
      await AsyncStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      return updated;
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  },
}));

export default useSpaceStore;

