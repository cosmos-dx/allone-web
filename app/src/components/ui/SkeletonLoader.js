import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import theme from '../../theme';

/**
 * SkeletonLoader - Animated skeleton loading placeholder
 * @param {number} width - Width of skeleton (default: '100%')
 * @param {number} height - Height of skeleton
 * @param {string} radius - Border radius: 'sm', 'md', 'lg', 'xl'
 * @param {object} style - Additional styles
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  radius = 'md',
  style,
}) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [opacity]);

  const radiusValue = {
    sm: theme.borderRadius.sm,
    md: theme.borderRadius.md,
    lg: theme.borderRadius.lg,
    xl: theme.borderRadius.xl,
  }[radius];

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: radiusValue,
          opacity,
        },
        style,
      ]}
    />
  );
}

/**
 * SkeletonCard - Skeleton for card layout
 */
export function SkeletonCard({ style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardHeader}>
        <SkeletonLoader width={48} height={48} radius="xl" />
        <View style={styles.cardHeaderText}>
          <SkeletonLoader width="60%" height={18} radius="sm" />
          <SkeletonLoader width="40%" height={14} radius="sm" style={styles.marginTop} />
        </View>
      </View>
      <SkeletonLoader width="100%" height={14} radius="sm" style={styles.marginTop} />
      <SkeletonLoader width="80%" height={14} radius="sm" style={styles.marginTop} />
    </View>
  );
}

/**
 * SkeletonList - Multiple skeleton cards
 */
export function SkeletonList({ count = 3 }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} style={styles.listItem} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.gray200,
  },
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.xl,
    ...theme.shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  cardHeaderText: {
    flex: 1,
    marginLeft: theme.spacing.md,
  },
  marginTop: {
    marginTop: theme.spacing.sm,
  },
  list: {
    padding: theme.spacing.base,
  },
  listItem: {
    marginBottom: theme.spacing.md,
  },
});

export default SkeletonLoader;
