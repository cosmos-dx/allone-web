import { create } from 'zustand';
import { notificationService } from '../services/notificationService';
import { toast } from 'sonner';

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

  // Load notifications
  loadNotifications: async (headers = null) => {
    set({ loading: true, error: null });
    try {
      const notifications = await notificationService.getAll(headers);
      get().setNotifications(notifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },

  // Mark as read
  markAsRead: async (notificationId, headers = null) => {
    try {
      await notificationService.markAsRead(notificationId, headers);
      set((state) => ({
        notifications: state.notifications.map(n =>
          n.notificationId === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast.error('Failed to mark notification as read');
    }
  },

  // Delete notification
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
        };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  },

  // Clear all notifications
  clearAll: async (headers = null) => {
    try {
      await notificationService.clearAll(headers);
      set({ notifications: [], unreadCount: 0 });
      toast.success('All notifications cleared');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
      toast.error('Failed to clear notifications');
    }
  },
}));

export default useNotificationStore;

