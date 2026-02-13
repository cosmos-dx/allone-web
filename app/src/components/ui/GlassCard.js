import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

/**
 * GlassCard - Card with glass morphism effect
 * @param {ReactNode} children - Card content
 * @param {string} radius - Border radius: 'sm', 'md', 'lg', 'xl'
 * @param {object} style - Additional styles
 * @param {boolean} elevated - Add shadow elevation
 */
export function GlassCard({
  children,
  radius = 'xl',
  style,
  elevated = true,
  ...props
}) {
  const radiusValue = {
    sm: theme.borderRadius.sm,
    md: theme.borderRadius.md,
    lg: theme.borderRadius.lg,
    xl: theme.borderRadius.xl,
    '2xl': theme.borderRadius['2xl'],
  }[radius];

  const shadowStyle = elevated ? theme.shadows.md : theme.shadows.none;

  return (
    <View style={[styles.container, shadowStyle, { borderRadius: radiusValue }, style]} {...props}>
      <LinearGradient
        colors={theme.gradients.glass}
        style={[styles.gradient, { borderRadius: radiusValue }]}
      >
        <View style={[styles.border, { borderRadius: radiusValue }]}>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  border: {
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    flex: 1,
  },
  content: {
    padding: theme.spacing.base,
  },
});

export default GlassCard;
