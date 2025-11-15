import { useEffect } from 'react';
import useNotificationStore from '../stores/notificationStore';
import { useAuth } from '../context/AuthContext';

export const useNotifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications,
    markAsRead,
    deleteNotification,
  } = useNotificationStore();
  const { getAuthHeaders, currentUser, authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !currentUser) return;
    
    const loadWithAuth = async () => {
      try {
        const headers = await getAuthHeaders();
        await loadNotifications(headers);
      } catch (error) {
        console.error('Failed to load notifications:', error);
      }
    };
    
    loadWithAuth();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(async () => {
      try {
        const headers = await getAuthHeaders();
        await loadNotifications(headers);
      } catch (error) {
        console.error('Failed to poll notifications:', error);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [currentUser, authLoading]);

  const markAsReadWithAuth = async (notificationId) => {
    try {
      const headers = await getAuthHeaders();
      await markAsRead(notificationId, headers);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const deleteNotificationWithAuth = async (notificationId) => {
    try {
      const headers = await getAuthHeaders();
      await deleteNotification(notificationId, headers);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const clearAllWithAuth = async () => {
    try {
      const headers = await getAuthHeaders();
      const { clearAll } = useNotificationStore.getState();
      await clearAll(headers);
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    loadNotifications: async () => {
      const headers = await getAuthHeaders();
      return loadNotifications(headers);
    },
    markAsRead: markAsReadWithAuth,
    deleteNotification: deleteNotificationWithAuth,
    clearAll: clearAllWithAuth,
  };
};

