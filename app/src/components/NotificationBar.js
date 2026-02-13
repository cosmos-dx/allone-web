import React, { useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import useNotificationStore from '../stores/notificationStore';
import {
  NOTIFICATION_BAR_TITLE,
  NOTIFICATION_BAR_CLOSE,
  NOTIFICATION_BAR_CLEAR_ALL,
  NOTIFICATION_BAR_EMPTY,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_DEFAULT_ICON,
  RELATIVE_TIME_MS_MINUTE,
  RELATIVE_TIME_MS_HOUR,
  RELATIVE_TIME_MS_DAY,
} from '../common/constants/DashboardScreen';
import styles from './styles/notificationBar';

function formatRelativeTime(createdAt) {
  const ms = Date.now() - new Date(createdAt).getTime();
  if (ms < RELATIVE_TIME_MS_MINUTE) return 'Just now';
  if (ms < RELATIVE_TIME_MS_HOUR) return `${Math.floor(ms / RELATIVE_TIME_MS_MINUTE)}m ago`;
  if (ms < RELATIVE_TIME_MS_DAY) return `${Math.floor(ms / RELATIVE_TIME_MS_HOUR)}h ago`;
  return `${Math.floor(ms / RELATIVE_TIME_MS_DAY)}d ago`;
}

function getNotificationIcon(type) {
  return NOTIFICATION_TYPE_ICONS[type] || NOTIFICATION_DEFAULT_ICON;
}

export default function NotificationBar({ visible, onClose, getAuthHeaders, onNotificationPress }) {
  const {
    notifications,
    loading,
    loadNotifications,
    markAsRead,
    clearAll,
  } = useNotificationStore();

  useEffect(() => {
    if (visible && getAuthHeaders) {
      loadNotifications(getAuthHeaders, true).catch(() => {});
    }
  }, [visible, getAuthHeaders]);

  const handleItemPress = async (notification) => {
    if (!notification.read) {
      await markAsRead(notification.notificationId, getAuthHeaders).catch(() => {});
    }
    onClose();
    if (onNotificationPress) {
      onNotificationPress(notification);
    }
  };

  const handleClearAll = async () => {
    await clearAll(getAuthHeaders).catch(() => {});
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.overlayBackdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{NOTIFICATION_BAR_TITLE}</Text>
                <View style={styles.sheetHeaderActions}>
                  {notifications.length > 0 && (
                    <TouchableOpacity style={styles.sheetHeaderButton} onPress={handleClearAll}>
                      <Text style={styles.sheetHeaderButtonText}>{NOTIFICATION_BAR_CLEAR_ALL}</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.sheetHeaderButton} onPress={onClose}>
                    <Text style={styles.sheetHeaderButtonText}>{NOTIFICATION_BAR_CLOSE}</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {loading ? (
                <View style={styles.emptyWrap}>
                  <ActivityIndicator size="small" color="#9333ea" />
                </View>
              ) : notifications.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>{NOTIFICATION_BAR_EMPTY}</Text>
                </View>
              ) : (
                <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                  {notifications.map((notification) => (
                    <TouchableOpacity
                      key={notification.notificationId}
                      style={[
                        styles.listItem,
                        !notification.read && styles.listItemUnread,
                      ]}
                      onPress={() => handleItemPress(notification)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.listItemIcon,
                          { backgroundColor: 'rgba(147, 51, 234, 0.12)' },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getNotificationIcon(notification.type)}
                          size={22}
                          color="#9333ea"
                        />
                      </View>
                      <View style={styles.listItemContent}>
                        <Text style={styles.listItemTitle} numberOfLines={1}>
                          {notification.title}
                        </Text>
                        <Text style={styles.listItemMessage} numberOfLines={2}>
                          {notification.message}
                        </Text>
                        <Text style={styles.listItemTime}>
                          {formatRelativeTime(notification.createdAt)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
      </View>
    </Modal>
  );
}
