import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

export function Button({ 
  children, 
  onPress, 
  variant = 'default', 
  size = 'md',
  disabled = false,
  loading = false,
  style,
  textStyle,
  ...props 
}) {
  const buttonStyles = [
    styles.button,
    styles[size],
    variant === 'ghost' && styles.ghost,
    variant === 'outline' && styles.outline,
    variant === 'secondary' && styles.secondary,
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${size}`],
    variant === 'ghost' && styles.ghostText,
    variant === 'outline' && styles.outlineText,
    variant === 'secondary' && styles.secondaryText,
    disabled && styles.disabledText,
    textStyle,
  ];

  if (variant === 'default' && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        disabled={disabled || loading}
        activeOpacity={theme.opacity.pressed}
        style={[styles.container, style]}
        {...props}
      >
        <LinearGradient
          colors={theme.gradients.primary}
          start={theme.gradientPositions.horizontal.start}
          end={theme.gradientPositions.horizontal.end}
          style={[styles.button, styles[size]]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.textInverse} />
          ) : (
            <Text style={[styles.text, styles[`text_${size}`], { color: theme.colors.textInverse }]}>
              {children}
            </Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity 
      onPress={onPress} 
      disabled={disabled || loading}
      style={buttonStyles}
      activeOpacity={theme.opacity.pressed}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? theme.colors.purple : theme.colors.purple} />
      ) : (
        <Text style={textStyles}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: theme.borderRadius.md,
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
  ghost: {
    backgroundColor: theme.colors.transparent,
  },
  outline: {
    backgroundColor: theme.colors.transparent,
    borderWidth: 1,
    borderColor: theme.colors.purple,
  },
  secondary: {
    backgroundColor: theme.colors.gray100,
  },
  disabled: {
    opacity: theme.opacity.disabled,
  },
  text: {
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.purple,
  },
  text_sm: {
    fontSize: theme.typography.fontSize.sm,
  },
  text_md: {
    fontSize: theme.typography.fontSize.base,
  },
  text_lg: {
    fontSize: theme.typography.fontSize.lg,
  },
  ghostText: {
    color: theme.colors.purple,
  },
  outlineText: {
    color: theme.colors.purple,
  },
  secondaryText: {
    color: theme.colors.textPrimary,
  },
  disabledText: {
    color: theme.colors.gray400,
  },
});

