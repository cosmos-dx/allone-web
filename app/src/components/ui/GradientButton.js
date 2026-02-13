import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

/**
 * GradientButton - Primary button with gradient background
 * @param {string} title - Button text
 * @param {function} onPress - Press handler
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state
 * @param {string} size - Button size: 'sm', 'md', 'lg'
 * @param {array} colors - Gradient colors (default: primary gradient)
 * @param {object} style - Additional styles
 */
export function GradientButton({
  title,
  children,
  onPress,
  disabled = false,
  loading = false,
  size = 'md',
  colors = theme.gradients.primary,
  style,
  textStyle,
  ...props
}) {
  const sizeStyles = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  const textSizeStyles = {
    sm: styles.textSm,
    md: styles.textMd,
    lg: styles.textLg,
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={theme.opacity.pressed}
      style={[styles.container, disabled && styles.disabled, style]}
      {...props}
    >
      <LinearGradient
        colors={disabled ? [theme.colors.gray300, theme.colors.gray400] : colors}
        start={theme.gradientPositions.horizontal.start}
        end={theme.gradientPositions.horizontal.end}
        style={[styles.gradient, sizeStyles[size]]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.textInverse} size={size === 'sm' ? 'small' : 'small'} />
        ) : (
          <>
            {children || (
              <Text style={[styles.text, textSizeStyles[size], textStyle]}>
                {title}
              </Text>
            )}
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  gradient: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  sm: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    minHeight: 36,
    borderRadius: theme.borderRadius.sm,
  },
  md: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    minHeight: theme.touchTarget.min,
    borderRadius: theme.borderRadius.md,
  },
  lg: {
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.base,
    minHeight: theme.touchTarget.comfortable,
    borderRadius: theme.borderRadius.base,
  },
  disabled: {
    opacity: theme.opacity.disabled,
  },
  text: {
    color: theme.colors.textInverse,
    fontWeight: theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  textSm: {
    fontSize: theme.typography.fontSize.sm,
  },
  textMd: {
    fontSize: theme.typography.fontSize.base,
  },
  textLg: {
    fontSize: theme.typography.fontSize.lg,
  },
});

export default GradientButton;
