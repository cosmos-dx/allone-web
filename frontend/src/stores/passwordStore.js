import { create } from 'zustand';
import { passwordService } from '../services/passwordService';
import { passwordAdapter } from '../adapters/passwordAdapter';
import { toast } from 'sonner';

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
    const uiPasswords = passwordAdapter.toUIArray(passwords);
    set({ passwords: uiPasswords, filteredPasswords: uiPasswords });
  },

  setFilteredPasswords: (filtered) => set({ filteredPasswords: filtered }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  loadPasswords: async (spaceId = null, includeShared = true, forceRefresh = false) => {
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
        const stored = localStorage.getItem(storageKey);
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
            localStorage.removeItem(storageKey);
          }
        }
      } catch (e) {
        console.warn('Failed to load from localStorage:', e);
      }
    }

    set({ loading: true, error: null });
    try {
      const passwords = await passwordService.getAll(spaceId, includeShared);
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
        localStorage.setItem(storageKey, JSON.stringify({ data: passwords, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      return passwords;
    } catch (error) {
      console.error('Failed to load passwords:', error);
      set({ error: error.message });
      toast.error('Failed to load passwords');
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  createPassword: async (passwordData) => {
    try {
      const apiData = passwordAdapter.toAPI(passwordData);
      const created = await passwordService.create(apiData);
      const uiPassword = passwordAdapter.toUI(created);
      set((state) => ({
        passwords: [...state.passwords, uiPassword],
        filteredPasswords: [...state.filteredPasswords, uiPassword],
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Password added successfully');
      return uiPassword;
    } catch (error) {
      console.error('Failed to create password:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add password';
      toast.error(`Password creation failed: ${errorMessage}`);
      throw error;
    }
  },

  updatePassword: async (passwordId, passwordData) => {
    try {
      const apiData = passwordAdapter.toAPI(passwordData);
      const updated = await passwordService.update(passwordId, apiData);
      const uiPassword = passwordAdapter.toUI(updated);
      set((state) => ({
        passwords: state.passwords.map(p => p.id === passwordId ? uiPassword : p),
        filteredPasswords: state.filteredPasswords.map(p => p.id === passwordId ? uiPassword : p),
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Password updated successfully');
      return uiPassword;
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error('Failed to update password');
      throw error;
    }
  },

  deletePassword: async (passwordId) => {
    try {
      await passwordService.delete(passwordId);
      set((state) => ({
        passwords: state.passwords.filter(p => p.id !== passwordId),
        filteredPasswords: state.filteredPasswords.filter(p => p.id !== passwordId),
        cache: { data: null, timestamp: null, key: null }
      }));
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(STORAGE_KEY_PREFIX)) {
          localStorage.removeItem(key);
        }
      });
      toast.success('Password deleted');
    } catch (error) {
      console.error('Failed to delete password:', error);
      toast.error('Failed to delete password');
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
        p.displayName.toLowerCase().includes(query) ||
        (p.username && p.username.toLowerCase().includes(query)) ||
        (p.website && p.website.toLowerCase().includes(query))
      );
    }
    
    set({ filteredPasswords: filtered });
  },
}));

export default usePasswordStore;

