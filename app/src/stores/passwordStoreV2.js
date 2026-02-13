import { create } from 'zustand';
import { passwordService } from '../services/passwordService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const STORAGE_TTL = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY_PREFIX = 'password_cache_';

/**
 * Enhanced Password Store with:
 * - Better caching strategy with TTL
 * - Optimistic updates
 * - Error recovery
 * - Offline queue support
 */
const usePasswordStore = create((set, get) => ({
  // State
  passwords: [],
  filteredPasswords: [],
  loading: false,
  error: null,
  cache: {
    data: null,
    timestamp: null,
    key: null,
  },
  offlineQueue: [],

  // Actions
  setPasswords: (passwords) => {
    set({ passwords, filteredPasswords: passwords });
  },

  setFilteredPasswords: (filtered) => set({ filteredPasswords: filtered }),

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  /**
   * Load passwords with caching
   */
  loadPasswords: async (spaceId = null, includeShared = true, forceRefresh = false, getAuthHeaders) => {
    const cacheKey = `passwords_${spaceId || 'all'}_${includeShared}`;
    const { cache } = get();
    
    // Check memory cache first
    if (!forceRefresh && cache.data && cache.key === cacheKey && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        get().setPasswords(cache.data);
        return cache.data;
      }
    }

    // Check persistent storage cache
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
                key: cacheKey,
              },
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

    // Fetch from API
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
          key: cacheKey,
        },
      });
      
      // Save to persistent storage
      try {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({ data: passwords, timestamp: now })
        );
      } catch (e) {
        console.warn('Failed to save to AsyncStorage:', e);
      }
      
      return passwords;
    } catch (error) {
      console.error('Failed to load passwords:', error);
      set({ error: error.message });
      
      // Return cached data if available
      if (cache.data && cache.key === cacheKey) {
        get().setPasswords(cache.data);
        return cache.data;
      }
      
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  /**
   * Create password with optimistic update
   */
  createPassword: async (passwordData, getAuthHeaders) => {
    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}`;
    const optimisticPassword = {
      ...passwordData,
      passwordId: tempId,
      createdAt: new Date().toISOString(),
    };

    // Optimistic update
    set((state) => ({
      passwords: [...state.passwords, optimisticPassword],
      filteredPasswords: [...state.filteredPasswords, optimisticPassword],
    }));

    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const created = await passwordService.create(passwordData, headers);
      
      // Replace optimistic password with real one
      set((state) => ({
        passwords: state.passwords.map((p) =>
          p.passwordId === tempId ? created : p
        ),
        filteredPasswords: state.filteredPasswords.map((p) =>
          p.passwordId === tempId ? created : p
        ),
        cache: { data: null, timestamp: null, key: null },
      }));
      
      // Clear cache
      await get().invalidateCache();
      
      return created;
    } catch (error) {
      console.error('Failed to create password:', error);
      
      // Rollback optimistic update
      set((state) => ({
        passwords: state.passwords.filter((p) => p.passwordId !== tempId),
        filteredPasswords: state.filteredPasswords.filter((p) => p.passwordId !== tempId),
      }));
      
      // Add to offline queue
      get().addToOfflineQueue({
        type: 'create',
        data: passwordData,
      });
      
      throw error;
    }
  },

  /**
   * Update password with optimistic update
   */
  updatePassword: async (passwordId, passwordData, getAuthHeaders) => {
    // Store original for rollback
    const original = get().passwords.find((p) => p.passwordId === passwordId);
    
    // Optimistic update
    const optimisticPassword = {
      ...original,
      ...passwordData,
      updatedAt: new Date().toISOString(),
    };
    
    set((state) => ({
      passwords: state.passwords.map((p) =>
        p.passwordId === passwordId ? optimisticPassword : p
      ),
      filteredPasswords: state.filteredPasswords.map((p) =>
        p.passwordId === passwordId ? optimisticPassword : p
      ),
    }));

    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const updated = await passwordService.update(passwordId, passwordData, headers);
      
      set((state) => ({
        passwords: state.passwords.map((p) =>
          p.passwordId === passwordId ? updated : p
        ),
        filteredPasswords: state.filteredPasswords.map((p) =>
          p.passwordId === passwordId ? updated : p
        ),
        cache: { data: null, timestamp: null, key: null },
      }));
      
      // Clear cache
      await get().invalidateCache();
      
      return updated;
    } catch (error) {
      console.error('Failed to update password:', error);
      
      // Rollback optimistic update
      if (original) {
        set((state) => ({
          passwords: state.passwords.map((p) =>
            p.passwordId === passwordId ? original : p
          ),
          filteredPasswords: state.filteredPasswords.map((p) =>
            p.passwordId === passwordId ? original : p
          ),
        }));
      }
      
      // Add to offline queue
      get().addToOfflineQueue({
        type: 'update',
        passwordId,
        data: passwordData,
      });
      
      throw error;
    }
  },

  /**
   * Delete password with optimistic update
   */
  deletePassword: async (passwordId, getAuthHeaders) => {
    // Store original for rollback
    const original = get().passwords.find((p) => p.passwordId === passwordId);
    
    // Optimistic update
    set((state) => ({
      passwords: state.passwords.filter((p) => p.passwordId !== passwordId),
      filteredPasswords: state.filteredPasswords.filter((p) => p.passwordId !== passwordId),
    }));

    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await passwordService.delete(passwordId, headers);
      
      set({ cache: { data: null, timestamp: null, key: null } });
      
      // Clear cache
      await get().invalidateCache();
    } catch (error) {
      console.error('Failed to delete password:', error);
      
      // Rollback optimistic update
      if (original) {
        set((state) => ({
          passwords: [...state.passwords, original],
          filteredPasswords: [...state.filteredPasswords, original],
        }));
      }
      
      // Add to offline queue
      get().addToOfflineQueue({
        type: 'delete',
        passwordId,
      });
      
      throw error;
    }
  },

  /**
   * Filter passwords
   */
  filterPasswords: (category, searchQuery) => {
    const { passwords } = get();
    let filtered = passwords;
    
    if (category && category !== 'All') {
      filtered = filtered.filter((p) => p.category === category);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.displayName?.toLowerCase().includes(query) ||
          p.username?.toLowerCase().includes(query) ||
          p.website?.toLowerCase().includes(query)
      );
    }
    
    set({ filteredPasswords: filtered });
  },

  /**
   * Invalidate cache
   */
  invalidateCache: async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const passwordKeys = keys.filter((key) => key.startsWith(STORAGE_KEY_PREFIX));
      await AsyncStorage.multiRemove(passwordKeys);
      set({ cache: { data: null, timestamp: null, key: null } });
    } catch (e) {
      console.warn('Failed to invalidate cache:', e);
    }
  },

  /**
   * Add operation to offline queue
   */
  addToOfflineQueue: (operation) => {
    set((state) => ({
      offlineQueue: [...state.offlineQueue, { ...operation, timestamp: Date.now() }],
    }));
  },

  /**
   * Process offline queue
   */
  processOfflineQueue: async (getAuthHeaders) => {
    const { offlineQueue } = get();
    
    if (offlineQueue.length === 0) return;
    
    const results = [];
    
    for (const operation of offlineQueue) {
      try {
        switch (operation.type) {
          case 'create':
            await get().createPassword(operation.data, getAuthHeaders);
            break;
          case 'update':
            await get().updatePassword(operation.passwordId, operation.data, getAuthHeaders);
            break;
          case 'delete':
            await get().deletePassword(operation.passwordId, getAuthHeaders);
            break;
        }
        results.push({ operation, success: true });
      } catch (error) {
        results.push({ operation, success: false, error });
      }
    }
    
    // Remove successful operations from queue
    const failedOperations = results
      .filter((r) => !r.success)
      .map((r) => r.operation);
    
    set({ offlineQueue: failedOperations });
    
    return results;
  },

  /**
   * Clear offline queue
   */
  clearOfflineQueue: () => {
    set({ offlineQueue: [] });
  },
}));

export default usePasswordStore;
