import { create } from 'zustand';
import { passwordService } from '../services/passwordService';
import { passwordAdapter } from '../adapters/passwordAdapter';
import { toast } from 'sonner';

// Cache TTL: 30 seconds
const CACHE_TTL = 30 * 1000;

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

  // Load passwords with caching
  loadPasswords: async (spaceId = null, includeShared = true, forceRefresh = false) => {
    const cacheKey = `passwords_${spaceId || 'all'}_${includeShared}`;
    const { cache } = get();
    
    // Check cache
    if (!forceRefresh && cache.data && cache.key === cacheKey && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        // Use cached data
        get().setPasswords(cache.data);
        return cache.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const passwords = await passwordService.getAll(spaceId, includeShared);
      get().setPasswords(passwords);
      // Update cache
      set({
        cache: {
          data: passwords,
          timestamp: Date.now(),
          key: cacheKey
        }
      });
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

  // Create password
  createPassword: async (passwordData) => {
    try {
      const apiData = passwordAdapter.toAPI(passwordData);
      const created = await passwordService.create(apiData);
      const uiPassword = passwordAdapter.toUI(created);
      set((state) => ({
        passwords: [...state.passwords, uiPassword],
        filteredPasswords: [...state.filteredPasswords, uiPassword],
      }));
      toast.success('Password added successfully');
      return uiPassword;
    } catch (error) {
      console.error('Failed to create password:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add password';
      toast.error(`Password creation failed: ${errorMessage}`);
      throw error;
    }
  },

  // Update password
  updatePassword: async (passwordId, passwordData) => {
    try {
      const apiData = passwordAdapter.toAPI(passwordData);
      const updated = await passwordService.update(passwordId, apiData);
      const uiPassword = passwordAdapter.toUI(updated);
      set((state) => ({
        passwords: state.passwords.map(p => p.id === passwordId ? uiPassword : p),
        filteredPasswords: state.filteredPasswords.map(p => p.id === passwordId ? uiPassword : p),
      }));
      toast.success('Password updated successfully');
      return uiPassword;
    } catch (error) {
      console.error('Failed to update password:', error);
      toast.error('Failed to update password');
      throw error;
    }
  },

  // Delete password
  deletePassword: async (passwordId) => {
    try {
      await passwordService.delete(passwordId);
      set((state) => ({
        passwords: state.passwords.filter(p => p.id !== passwordId),
        filteredPasswords: state.filteredPasswords.filter(p => p.id !== passwordId),
      }));
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

