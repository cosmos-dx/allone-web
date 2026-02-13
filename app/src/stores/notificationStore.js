import { create } from 'zustand';
import { notificationService } from '../services/notificationService';

const CACHE_TTL = 2 * 60 * 1000;

const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  setNotifications: (notifications) => {
    const unread = notifications.filter((n) => !n.read).length;
    set({ notifications, unreadCount: unread });
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  cache: { data: null, timestamp: null },

  loadNotifications: async (getAuthHeaders, forceRefresh = false) => {
    const { cache } = get();
    if (!forceRefresh && cache.data && cache.timestamp && Date.now() - cache.timestamp < CACHE_TTL) {
      get().setNotifications(cache.data);
      return cache.data;
    }
    set({ loading: true, error: null });
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      const notifications = await notificationService.getAll(headers);
      get().setNotifications(notifications);
      set({ cache: { data: notifications, timestamp: Date.now() } });
      return notifications;
    } catch (error) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await notificationService.markAsRead(notificationId, headers);
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.notificationId === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        cache: { data: null, timestamp: null },
      }));
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteNotification: async (notificationId, getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await notificationService.delete(notificationId, headers);
      set((state) => {
        const notification = state.notifications.find((n) => n.notificationId === notificationId);
        return {
          notifications: state.notifications.filter((n) => n.notificationId !== notificationId),
          unreadCount:
            notification && !notification.read
              ? Math.max(0, state.unreadCount - 1)
              : state.unreadCount,
          cache: { data: null, timestamp: null },
        };
      });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  clearAll: async (getAuthHeaders) => {
    try {
      const headers = getAuthHeaders ? await getAuthHeaders() : {};
      await notificationService.clearAll(headers);
      set({ notifications: [], unreadCount: 0, cache: { data: null, timestamp: null } });
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },
}));

export default useNotificationStore;
