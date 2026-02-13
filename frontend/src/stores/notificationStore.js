import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { toast } from 'sonner';

const CACHE_TTL = 2 * 60 * 1000;
const STORAGE_TTL = 10 * 60 * 1000;
const STORAGE_KEY_PREFIX = 'notification_cache_';

const useNotificationStore = create((set, get) => ({
  // State
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Actions
  setNotifications: (notifications) => {
    const unread = notifications.filter(n => !n.read).length;
    set({ notifications, unreadCount: unread });
  },

  setLoading: (loading) => set({ loading }),

  setError: (error) => set({ error }),

  cache: {
    data: null,
    timestamp: null
  },

  loadNotifications: async (headers = null, forceRefresh = false) => {
    const { cache } = get();
    
    if (!forceRefresh && cache.data && cache.timestamp) {
      const age = Date.now() - cache.timestamp;
      if (age < CACHE_TTL) {
        get().setNotifications(cache.data);
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
            get().setNotifications(data);
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
      const notifications = await notificationService.getAll(headers);
      get().setNotifications(notifications);
      const now = Date.now();
      set({
        cache: {
          data: notifications,
          timestamp: now
        }
      });
      try {
        localStorage.setItem(storageKey, JSON.stringify({ data: notifications, timestamp: now }));
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
      return notifications;
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  markAsRead: async (notificationId, headers = null) => {
    try {
      await notificationService.markAsRead(notificationId, headers);
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.notificationId === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
        cache: { data: null, timestamp: null }
      }));
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  },

  deleteNotification: async (notificationId, headers = null) => {
    try {
      await notificationService.delete(notificationId, headers);
      set((state) => {
        const notification = state.notifications.find(n => n.notificationId === notificationId);
        return {
          notifications: state.notifications.filter(n => n.notificationId !== notificationId),
          unreadCount: notification && !notification.read
            ? Math.max(0, state.unreadCount - 1)
            : state.unreadCount,
          cache: { data: null, timestamp: null }
        };
      });
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  },

  clearAll: async (headers = null) => {
    try {
      await notificationService.clearAll(headers);
      set({ notifications: [], unreadCount: 0, cache: { data: null, timestamp: null } });
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}all`);
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  },
}));

export default useNotificationStore;

