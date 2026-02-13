import { create } from 'zustand';
import { passwordService } from '../services/passwordService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 5 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'password_cache_';

const usePasswordStore = create((set, get) => ({
  // State
  passwords: [],
  filteredPasswords: [],
  loading: false,
  error: null,
  cache: {
    data: null,
    timestamp: null,
    key: null
  },

  // Actions
  setPasswords: (passwords) => {
    set({ passwords, filteredPasswords: passwords });
  },

  setFilteredPasswords: (filtered) => set({ filteredPasswords: filtered }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  loadPasswords: async (spaceId = null, includeShared = true, forceRefresh = false, getAuthHeaders) => {
    const cacheKey = `passwords_${spaceId || 'all'}_${includeShared}`;
    const { cache } = get();
    
    if (!forceRefresh && cache.data && cache.key === cacheKey && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        get().setPasswords(cache.data);
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
            get().setPasswords(data);
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
      const passwords = await passwordService.getAll(spaceId, includeShared, headers);
      get().setPasswords(passwords);
      const now = Date.now();
      set({
        cache: {
          data: passwords,
          timestamp: now,
          key: cacheKey
        }
      });
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ data: passwords, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to AsyncStorage:', e);
      }
      return passwords;
    } catch (error) {
      console.error('Failed to load passwords:', error);
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createPassword: async (passwordData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const created = await passwordService.create(passwordData, headers);
      set((state) => ({
        passwords: [...state.passwords, created],
        filteredPasswords: [...state.filteredPasswords, created],
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const passwordKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(passwordKeys);
      return created;
    } catch (error) {
      console.error('Failed to create password:', error);
      throw error;
    }
  },

  updatePassword: async (passwordId, passwordData, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await passwordService.update(passwordId, passwordData, headers);
      set((state) => ({
        passwords: state.passwords.map(p => p.passwordId === passwordId ? updated : p),
        filteredPasswords: state.filteredPasswords.map(p => p.passwordId === passwordId ? updated : p),
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const passwordKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(passwordKeys);
      return updated;
    } catch (error) {
      console.error('Failed to update password:', error);
      throw error;
    }
  },

  deletePassword: async (passwordId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await passwordService.delete(passwordId, headers);
      set((state) => ({
        passwords: state.passwords.filter(p => p.passwordId !== passwordId),
        filteredPasswords: state.filteredPasswords.filter(p => p.passwordId !== passwordId),
        cache: { data: null, timestamp: null, key: null }
      }));
      // Clear cache
      const keys = await AsyncStorage.getAllKeys();
      const passwordKeys = keys.filter(key => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(passwordKeys);
    } catch (error) {
      console.error('Failed to delete password:', error);
      throw error;
    }
  },

  // Filter passwords
  filterPasswords: (category, searchQuery) => {
    const { passwords } = get();
    let filtered = passwords;
    
    if (category && category !== 'All') {
      filtered = filtered.filter(p => p.category === category);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        p.displayName?.toLowerCase().includes(query) ||
        p.username?.toLowerCase().includes(query) ||
        p.website?.toLowerCase().includes(query)
      );
    }
    
    set({ filteredPasswords: filtered });
  },
}));

export default usePasswordStore;

