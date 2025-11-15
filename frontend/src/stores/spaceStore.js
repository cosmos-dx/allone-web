import { create } from 'zustand';
import { spaceService } from '../services/spaceService';
import { spaceAdapter } from '../adapters/spaceAdapter';
import { toast } from 'sonner';

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

  // Load spaces with caching
  loadSpaces: async (forceRefresh = false) => {
    const { cache } = get();
    const CACHE_TTL = 30 * 1000; // 30 seconds
    
    // Check cache
    if (!forceRefresh && cache.data && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        // Use cached data
        get().setSpaces(cache.data);
        return cache.data;
      }
    }

    set({ loading: true, error: null });
    try {
      const spaces = await spaceService.getAll();
      get().setSpaces(spaces);
      // Update cache
      set({
        cache: {
          data: spaces,
          timestamp: Date.now()
        }
      });
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

  // Create space
  createSpace: async (spaceData) => {
    try {
      const apiData = spaceAdapter.toAPI(spaceData);
      const created = await spaceService.create(apiData);
      const uiSpace = spaceAdapter.toUI(created);
      set((state) => ({
        spaces: [...state.spaces, uiSpace],
      }));
      toast.success('Space created successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to create space:', error);
      toast.error('Failed to create space');
      throw error;
    }
  },

  // Update space
  updateSpace: async (spaceId, spaceData) => {
    try {
      const apiData = spaceAdapter.toAPI(spaceData);
      const updated = await spaceService.update(spaceId, apiData);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
      }));
      toast.success('Space updated successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to update space:', error);
      toast.error('Failed to update space');
      throw error;
    }
  },

  // Delete space
  deleteSpace: async (spaceId) => {
    try {
      await spaceService.delete(spaceId);
      set((state) => ({
        spaces: state.spaces.filter(s => s.id !== spaceId),
      }));
      toast.success('Space deleted');
    } catch (error) {
      console.error('Failed to delete space:', error);
      toast.error('Failed to delete space');
      throw error;
    }
  },

  // Add member
  addMember: async (spaceId, userId) => {
    try {
      const updated = await spaceService.addMember(spaceId, userId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
      }));
      toast.success('Member added to space');
      return uiSpace;
    } catch (error) {
      console.error('Failed to add member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to add member';
      toast.error(errorMessage);
      throw error;
    }
  },

  // Remove member
  removeMember: async (spaceId, memberId) => {
    try {
      const updated = await spaceService.removeMember(spaceId, memberId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
      }));
      toast.success('Member removed from space');
      return uiSpace;
    } catch (error) {
      console.error('Failed to remove member:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Failed to remove member';
      toast.error(errorMessage);
      throw error;
    }
  },

  // Transfer ownership
  transferOwnership: async (spaceId, newOwnerId) => {
    try {
      const updated = await spaceService.transferOwnership(spaceId, newOwnerId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
      }));
      toast.success('Ownership transferred successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to transfer ownership:', error);
      toast.error('Failed to transfer ownership');
      throw error;
    }
  },

  // Add admin
  addAdmin: async (spaceId, userId) => {
    try {
      const updated = await spaceService.addAdmin(spaceId, userId);
      const uiSpace = spaceAdapter.toUI(updated);
      set((state) => ({
        spaces: state.spaces.map(s => s.id === spaceId ? uiSpace : s),
      }));
      toast.success('Admin added successfully');
      return uiSpace;
    } catch (error) {
      console.error('Failed to add admin:', error);
      toast.error('Failed to add admin');
      throw error;
    }
  },

  // Remove admin
  removeAdmin: async (spaceId, adminId) => {
    try {
      await spaceService.removeAdmin(spaceId, adminId);
      await get().loadSpaces(); // Reload to get updated space
      toast.success('Admin removed successfully');
    } catch (error) {
      console.error('Failed to remove admin:', error);
      toast.error('Failed to remove admin');
      throw error;
    }
  },
}));

export default useSpaceStore;

