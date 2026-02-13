import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
// Try to import BlurView, fallback to View if not available
let BlurView;
try {
  BlurView = require('expo-blur').BlurView;
} catch (e) {
  BlurView = ({ children, style, ...props }) => {
    const React = require('react');
    const { View } = require('react-native');
    return <View style={style} {...props}>{children}</View>;
  };
}
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createSquircleStyle } from '../../utils/squircle';
import useUIStore from '../../stores/uiStore';

const NAV_HORIZONTAL_MARGIN = 24;
const HIDDEN_OFFSET = 120;

const navItems = [
  { name: 'Dashboard', icon: 'view-dashboard', gradient: ['#9333ea', '#9333ea'], route: 'Dashboard' },
  { name: 'Passwords', icon: 'key', gradient: ['#3b82f6', '#3b82f6'], route: 'Passwords' },
  { name: 'Authenticator', icon: 'cellphone', gradient: ['#ea580c', '#ea580c'], route: 'Authenticator' },
  { name: 'Spaces', icon: 'account-group', gradient: ['#6366f1', '#6366f1'], route: 'Spaces' },
  { name: 'Bills', icon: 'receipt', gradient: ['#10b981', '#10b981'], route: 'Bills' },
  { name: 'Settings', icon: 'cog', gradient: ['#6b7280', '#6b7280'], route: 'Settings' },
];

export default function CustomTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();
  const showBottomNavOnScroll = useUIStore((s) => s.showBottomNavOnScroll);
  const bottomNavVisible = useUIStore((s) => s.bottomNavVisible);
  const setBottomNavVisible = useUIStore((s) => s.setBottomNavVisible);

  const translateY = useRef(new Animated.Value(showBottomNavOnScroll ? HIDDEN_OFFSET : 0)).current;
  const prevIndexRef = useRef(state.index);

  const isBarVisible = !showBottomNavOnScroll || bottomNavVisible;
  const targetY = isBarVisible ? 0 : HIDDEN_OFFSET;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: targetY,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  }, [targetY, translateY]);

  useEffect(() => {
    if (state.index !== prevIndexRef.current) {
      prevIndexRef.current = state.index;
      if (showBottomNavOnScroll) {
        setBottomNavVisible(true);
      }
    }
  }, [state.index, showBottomNavOnScroll, setBottomNavVisible]);

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom,
          marginHorizontal: NAV_HORIZONTAL_MARGIN,
        },
      ]}
      pointerEvents="box-none"
    >
      <Animated.View style={[styles.animatedWrap, { transform: [{ translateY }] }]}>
        <BlurView intensity={20} style={[styles.blurContainer, createSquircleStyle('xl')]}>
          <View style={styles.tabBar}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const isFocused = state.index === index;
              const navItem = navItems.find((item) => item.route === route.name);

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!isFocused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              return (
                <TouchableOpacity
                  key={route.key}
                  accessibilityRole="button"
                  accessibilityState={isFocused ? { selected: true } : {}}
                  accessibilityLabel={options.tabBarAccessibilityLabel}
                  testID={options.tabBarTestID}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  style={styles.tabButton}
                >
                  {isFocused ? (
                    <LinearGradient
                      colors={navItem?.gradient || ['#9333ea', '#ea580c']}
                      style={[styles.activeTab, createSquircleStyle('md')]}
                    >
                      <MaterialCommunityIcons
                        name={navItem?.icon || 'circle'}
                        size={24}
                        color="#ffffff"
                      />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.inactiveTab, createSquircleStyle('md')]}>
                      <MaterialCommunityIcons
                        name={navItem?.icon || 'circle'}
                        size={24}
                        color="#6b7280"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  animatedWrap: {
    alignSelf: 'center',
  },
  blurContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabButton: {
    padding: 8,
  },
  activeTab: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveTab: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.1)',
  },
});
