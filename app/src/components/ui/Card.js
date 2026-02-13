import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import theme from '../../theme';

export function Card({ children, style, glass = false, radius = 'xl', elevated = true, ...props }) {
  const radiusValue = {
    sm: theme.borderRadius.sm,
    md: theme.borderRadius.md,
    lg: theme.borderRadius.lg,
    xl: theme.borderRadius.xl,
    '2xl': theme.borderRadius['2xl'],
  }[radius];

  const shadowStyle = elevated ? theme.shadows.md : theme.shadows.none;

  if (glass) {
    return (
      <View style={[shadowStyle, { borderRadius: radiusValue }, style]} {...props}>
        <LinearGradient
          colors={theme.gradients.glass}
          style={[styles.card, styles.glass, styles.glassFill, { borderRadius: radiusValue }]}
        >
          {children}
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.card, shadowStyle, { borderRadius: radiusValue }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.base,
  },
  glass: {
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
  },
  glassFill: {
    flex: 1,
  },
});

