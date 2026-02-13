import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import usePasswordStore from '../stores/passwordStore';
import useTOTPStore from '../stores/totpStore';
import useSpaceStore from '../stores/spaceStore';
import useBillStore from '../stores/billStore';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../components/ui/Card';
import { createSquircleStyle } from '../utils/squircle';
import {
  STAT_CONFIGS,
  QUICK_ACTIONS,
  QUICK_ACTIONS_TITLE,
  HEADER_TITLE,
  INSIGHTS_BANNER_TITLE,
  STAT_CARD_WIDTH,
  HORIZONTAL_PADDING,
  CARD_GAP,
  BANNER_SLIDE_HEIGHT,
  FADE_ANIM_DURATION,
  HEADER_ICON_SETTINGS,
  HEADER_ICON_NOTIFICATIONS,
  ACTIVE_SPACES_TITLE,
  RECENT_ACTIVITY_TITLE,
  ACTIVE_SPACES_EMPTY_TEXT,
  ACTIVE_SPACES_ADD_CTA,
  RECENT_ACTIVITY_EMPTY_TEXT,
  RECENT_ACTIVITY_LIMIT,
  ACTIVE_SPACES_MEMBER_LABEL,
  NOTIFICATION_TYPE_ICONS,
  NOTIFICATION_DEFAULT_ICON,
  RELATIVE_TIME_MS_MINUTE,
  RELATIVE_TIME_MS_HOUR,
  RELATIVE_TIME_MS_DAY,
} from '../common/constants/DashboardScreen';
import { buildInsightSlides } from '../config/insightBannerConfig';
import InsightBanner from '../components/InsightBanner';
import NotificationBar from '../components/NotificationBar';
import useScrollToShowNav from '../hooks/useScrollToShowNav';
import useNotificationStore from '../stores/notificationStore';
import { styles } from './styles/dashboardScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_SLIDE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;

export default function DashboardScreen() {
  const { currentUser, getAuthHeaders } = useAuth();
  const navigation = useNavigation();
  const { passwords, loadPasswords } = usePasswordStore();
  const { totps, loadTOTPs } = useTOTPStore();
  const { spaces, loadSpaces } = useSpaceStore();
  const { bills, loadBills } = useBillStore();
  const { notifications, unreadCount, loadNotifications } = useNotificationStore();

  const [notificationBarVisible, setNotificationBarVisible] = useState(false);
  const scaleAnims = useRef(QUICK_ACTIONS.map(() => new Animated.Value(1))).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { onScroll, scrollEventThrottle } = useScrollToShowNav();

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          loadPasswords(null, true, false, getAuthHeaders),
          loadTOTPs(null, true, false, getAuthHeaders),
          loadSpaces(false, getAuthHeaders),
          loadNotifications(getAuthHeaders, false),
        ]);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (spaces?.length > 0) {
      loadBills(spaces[0].spaceId, false, getAuthHeaders).catch(() => {});
    }
  }, [spaces?.length]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: FADE_ANIM_DURATION,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const totalBills = Object.values(bills || {}).flat().length;
  const stats = [
    { ...STAT_CONFIGS[0], count: passwords?.length ?? 0 },
    { ...STAT_CONFIGS[1], count: totps?.length ?? 0 },
    { ...STAT_CONFIGS[2], count: spaces?.length ?? 0 },
    { ...STAT_CONFIGS[3], count: totalBills },
  ];

  const recentBills = Object.values(bills || {}).flat().slice(0, 3);
  const totalBillsCount = totalBills;
  const billsPaid = Math.min(2, totalBillsCount);
  const billsOverdue = Math.max(0, totalBillsCount - 4);
  const totpCount = totps?.length ?? 0;
  const totpAddedRecently = Math.min(2, totpCount);
  const insightSlides = buildInsightSlides({
    weakCount: 2,
    mostActiveSpace: spaces?.[0]?.name,
    passwordsAddedThisMonth: 3,
    totalBillsCount,
    billsPaid,
    billsOverdue,
    totpCount,
    totpAddedRecently,
  });

  const handleActionPressIn = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };
  const handleActionPressOut = (index) => {
    Animated.spring(scaleAnims[index], {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const formatRelativeTime = (createdAt) => {
    const ms = Date.now() - new Date(createdAt).getTime();
    if (ms < RELATIVE_TIME_MS_MINUTE) return 'Just now';
    if (ms < RELATIVE_TIME_MS_HOUR) return `${Math.floor(ms / RELATIVE_TIME_MS_MINUTE)}m ago`;
    if (ms < RELATIVE_TIME_MS_DAY) return `${Math.floor(ms / RELATIVE_TIME_MS_HOUR)}h ago`;
    return `${Math.floor(ms / RELATIVE_TIME_MS_DAY)}d ago`;
  };

  const getNotificationIcon = (type) => NOTIFICATION_TYPE_ICONS[type] || NOTIFICATION_DEFAULT_ICON;

  const handleNotificationPress = (notification) => {
    if (
      notification.type === 'SPACE_ADDED' ||
      notification.type === 'SPACE_REMOVED' ||
      notification.type === 'SPACE_MEMBER_LOGIN' ||
      notification.type === 'OWNERSHIP_TRANSFERRED'
    ) {
      navigation.navigate('Spaces');
    }
  };

  return (
    <LinearGradient
      colors={['#faf5ff', '#f5f0ff', '#fff7ed', '#fefce8']}
      style={styles.container}
    >
      <View style={styles.patternOverlay} pointerEvents="none">
        {[...Array(20)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.patternDot,
              {
                left: (i % 5) * (SCREEN_WIDTH / 4.2),
                top: (Math.floor(i / 5) * 80) + 40,
              },
            ]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={scrollEventThrottle}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={[styles.header, styles.headerRow]}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{HEADER_TITLE}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {currentUser?.displayName || currentUser?.email}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons name={HEADER_ICON_SETTINGS} size={24} color="#1f2937" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconButton}
                onPress={() => setNotificationBarVisible(true)}
                activeOpacity={0.7}
              >
                <MaterialCommunityIcons
                  name={HEADER_ICON_NOTIFICATIONS}
                  size={24}
                  color="#1f2937"
                />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[
              styles.statsScrollContent,
              {
                paddingHorizontal: HORIZONTAL_PADDING,
                gap: CARD_GAP,
              },
            ]}
            style={styles.statsScrollView}
          >
            {stats.map((stat, index) => (
              <TouchableOpacity
                key={stat.screen}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(stat.screen)}
              >
                <Card
                  glass
                  style={[
                    styles.statCard,
                    createSquircleStyle('xl'),
                    { width: STAT_CARD_WIDTH },
                  ]}
                  radius="xl"
                >
                  <View
                    style={[
                      styles.iconContainer,
                      createSquircleStyle('lg'),
                      { backgroundColor: `${stat.color}18` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={stat.iconName}
                      size={28}
                      color={stat.color}
                    />
                  </View>
                  <Text style={styles.statCount}>{stat.count}</Text>
                  <Text style={styles.statLabel} numberOfLines={1}>
                    {stat.label}
                  </Text>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{INSIGHTS_BANNER_TITLE}</Text>
            <InsightBanner
              slides={insightSlides}
              slideWidth={BANNER_SLIDE_WIDTH}
              slideHeight={BANNER_SLIDE_HEIGHT}
              onPress={navigation.navigate}
            />
          </View>

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>{QUICK_ACTIONS_TITLE}</Text>
            <View style={styles.quickActionsGrid}>
              {QUICK_ACTIONS.map((action, index) => (
                <View key={action.screen} style={styles.quickActionGridItem}>
                  <Animated.View style={{ transform: [{ scale: scaleAnims[index] }] }}>
                    <TouchableOpacity
                      activeOpacity={1}
                      onPressIn={() => handleActionPressIn(index)}
                      onPressOut={() => handleActionPressOut(index)}
                      onPress={() => navigation.navigate(action.screen)}
                      style={[styles.actionButton, createSquircleStyle('xl')]}
                    >
                      <LinearGradient
                        colors={[action.color, action.colorEnd]}
                        style={styles.actionGradient}
                      >
                        <MaterialCommunityIcons name={action.iconName} size={22} color="#ffffff" />
                        <Text style={styles.actionText}>{action.label}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.activeSpacesSection}>
            <Text style={styles.sectionTitle}>{ACTIVE_SPACES_TITLE}</Text>
            {!spaces?.length ? (
              <View style={styles.activeSpacesEmpty}>
                <Text style={styles.activeSpacesEmptyText}>{ACTIVE_SPACES_EMPTY_TEXT}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Spaces')}>
                  <Text style={styles.emptyRecentLink}>{ACTIVE_SPACES_ADD_CTA}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              spaces?.map((space) => {
                const memberCount = (space.members?.length || 0) + 1;
                return (
                  <TouchableOpacity
                    key={space.spaceId}
                    style={styles.spaceRow}
                    onPress={() => navigation.navigate('SpaceDetail', { spaceId: space.spaceId })}
                    activeOpacity={0.7}
                  >
                    <View style={styles.spaceRowIcon}>
                      <MaterialCommunityIcons name="account-group" size={22} color="#6366f1" />
                    </View>
                    <View style={styles.spaceRowContent}>
                      <Text style={styles.spaceRowTitle} numberOfLines={1}>
                        {space.name}
                      </Text>
                      <Text style={styles.spaceRowMeta}>{ACTIVE_SPACES_MEMBER_LABEL(memberCount)}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={styles.recentActivitySection}>
            <Text style={styles.sectionTitle}>{RECENT_ACTIVITY_TITLE}</Text>
            {!notifications?.length ? (
              <View style={styles.activeSpacesEmpty}>
                <Text style={styles.emptyRecentText}>{RECENT_ACTIVITY_EMPTY_TEXT}</Text>
              </View>
            ) : (
              notifications.slice(0, RECENT_ACTIVITY_LIMIT).map((notification) => (
                <TouchableOpacity
                  key={notification.notificationId}
                  style={[
                    styles.recentActivityItem,
                    !notification.read && styles.recentActivityItemUnread,
                  ]}
                  onPress={() => setNotificationBarVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={styles.recentActivityIcon}>
                    <MaterialCommunityIcons
                      name={getNotificationIcon(notification.type)}
                      size={20}
                      color="#9333ea"
                    />
                  </View>
                  <View style={styles.recentActivityContent}>
                    <Text style={styles.recentActivityTitle} numberOfLines={1}>
                      {notification.title}
                    </Text>
                    <Text style={styles.recentActivityMessage} numberOfLines={2}>
                      {notification.message}
                    </Text>
                    <Text style={styles.recentActivityTime}>
                      {formatRelativeTime(notification.createdAt)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>
      </ScrollView>
      <NotificationBar
        visible={notificationBarVisible}
        onClose={() => setNotificationBarVisible(false)}
        getAuthHeaders={getAuthHeaders}
        onNotificationPress={handleNotificationPress}
      />
    </LinearGradient>
  );
}
