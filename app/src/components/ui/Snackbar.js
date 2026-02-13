import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  PanResponder,
} from 'react-native';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createSquircleStyle } from '../../utils/squircle';
import { toast } from '../../utils/toast';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOAST_WIDTH = SCREEN_WIDTH - 40;

const Snackbar = ({ toast: toastData, onDismiss }) => {
  const [translateX] = useState(new Animated.Value(TOAST_WIDTH));
  const [opacity] = useState(new Animated.Value(0));
  const [progress] = useState(new Animated.Value(1));

  useEffect(() => {
    if (toastData) {
      // Slide in animation
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress bar animation
      if (toastData.duration > 0) {
        Animated.timing(progress, {
          toValue: 0,
          duration: toastData.duration,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [toastData]);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx > 0) {
        translateX.setValue(gestureState.dx);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > 100) {
        // Dismiss on swipe right
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: TOAST_WIDTH,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss(toastData.id);
        });
      } else {
        // Spring back
        Animated.spring(translateX, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }).start();
      }
    },
  });

  if (!toastData) return null;

  const getIcon = () => {
    switch (toastData.type) {
      case 'success':
        return { name: 'check-circle', color: '#22c55e' };
      case 'error':
        return { name: 'alert-circle', color: '#ef4444' };
      case 'warning':
        return { name: 'alert', color: '#f59e0b' };
      default:
        return { name: 'information', color: '#3b82f6' };
    }
  };

  const getBackgroundColor = () => {
    switch (toastData.type) {
      case 'success':
        return 'rgba(34, 197, 94, 0.1)';
      case 'error':
        return 'rgba(239, 68, 68, 0.1)';
      case 'warning':
        return 'rgba(245, 158, 11, 0.1)';
      default:
        return 'rgba(59, 130, 246, 0.1)';
    }
  };

  const icon = getIcon();
  const backgroundColor = getBackgroundColor();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BlurView intensity={20} style={[styles.blurContainer, { backgroundColor }]}>
        <View style={[styles.content, createSquircleStyle('xl')]}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={icon.name} size={24} color={icon.color} />
          </View>
          <View style={styles.textContainer}>
            {toastData.title && (
              <Text style={styles.title}>{toastData.title}</Text>
            )}
            <Text style={styles.message}>{toastData.message}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onDismiss(toastData.id)}
            style={styles.closeButton}
          >
            <MaterialCommunityIcons name="close" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
        {toastData.duration > 0 && (
          <View style={styles.progressBarContainer}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                  backgroundColor: icon.color,
                },
              ]}
            />
          </View>
        )}
      </BlurView>
    </Animated.View>
  );
};

export const SnackbarContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (toast) => {
      setToasts((prev) => [toast, ...prev].slice(0, 3));
    };

    const handleDismiss = (id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleDismissAll = () => {
      setToasts([]);
    };

    toast.on('toast', handleToast);
    toast.on('dismiss', handleDismiss);
    toast.on('dismissAll', handleDismissAll);

    return () => {
      toast.off('toast', handleToast);
      toast.off('dismiss', handleDismiss);
      toast.off('dismissAll', handleDismissAll);
    };
  }, []);

  const handleDismiss = (id) => {
    toast.dismiss(id);
  };

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((t) => (
        <Snackbar key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    zIndex: 9999,
    alignItems: 'flex-end',
  },
  container: {
    marginBottom: 10,
    width: TOAST_WIDTH,
    maxWidth: 400,
  },
  blurContainer: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  progressBar: {
    height: '100%',
  },
});

export default Snackbar;

