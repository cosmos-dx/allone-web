/**
 * Centralized Design System
 * Matches web app design language with glass morphism and purple-orange gradient
 */

// Color Palette
export const colors = {
  // Primary Brand Colors
  purple: '#9333ea',
  purpleDark: '#7e22ce',
  purpleLight: '#a855f7',
  orange: '#ea580c',
  orangeDark: '#c2410c',
  orangeLight: '#f97316',
  
  // Gradient Colors
  gradientPurple: '#9333ea',
  gradientOrange: '#ea580c',
  
  // Feature Colors
  blue: '#3b82f6',
  blueLight: '#60a5fa',
  blueDark: '#2563eb',
  green: '#10b981',
  greenLight: '#34d399',
  greenDark: '#059669',
  red: '#ef4444',
  redLight: '#f87171',
  redDark: '#dc2626',
  yellow: '#f59e0b',
  yellowLight: '#fbbf24',
  yellowDark: '#d97706',
  indigo: '#6366f1',
  indigoLight: '#818cf8',
  indigoDark: '#4f46e5',
  
  // Neutral Grays
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  
  // Semantic Colors
  success: '#10b981',
  successLight: '#34d399',
  successDark: '#059669',
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  info: '#3b82f6',
  infoLight: '#60a5fa',
  infoDark: '#2563eb',
  
  // Background Colors
  background: '#f9fafb',
  backgroundDark: '#111827',
  surface: '#ffffff',
  surfaceDark: '#1f2937',
  
  // Text Colors
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textTertiary: '#9ca3af',
  textInverse: '#ffffff',
  
  // Border Colors
  border: '#e5e7eb',
  borderDark: '#374151',
  
  // Glass Morphism
  glassWhite: 'rgba(255, 255, 255, 0.7)',
  glassWhiteLight: 'rgba(255, 255, 255, 0.8)',
  glassWhiteDark: 'rgba(255, 255, 255, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  
  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',
  
  // Transparent
  transparent: 'transparent',
};

// Typography
export const typography = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
    loose: 2,
  },
  
  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
};

// Spacing (using 4px base unit)
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
  '5xl': 64,
  '6xl': 80,
};

// Border Radius (Squircle-inspired)
export const borderRadius = {
  none: 0,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  full: 9999,
};

// Shadows
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },
};

// Z-Index
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
};

// Animation Durations
export const animation = {
  duration: {
    fast: 150,
    base: 200,
    medium: 300,
    slow: 500,
  },
  easing: {
    linear: 'linear',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// Touch Targets (Minimum 44x44 for accessibility)
export const touchTarget = {
  min: 44,
  comfortable: 48,
  large: 56,
};

// Opacity
export const opacity = {
  disabled: 0.5,
  hover: 0.8,
  pressed: 0.7,
  subtle: 0.6,
};

// Gradients
export const gradients = {
  primary: ['#9333ea', '#ea580c'],
  primaryReverse: ['#ea580c', '#9333ea'],
  purple: ['#9333ea', '#7e22ce'],
  orange: ['#ea580c', '#c2410c'],
  blue: ['#3b82f6', '#2563eb'],
  green: ['#10b981', '#059669'],
  red: ['#ef4444', '#dc2626'],
  glass: ['rgba(255, 255, 255, 0.8)', 'rgba(255, 255, 255, 0.6)'],
};

// Gradient Positions
export const gradientPositions = {
  horizontal: { start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
  vertical: { start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  diagonal: { start: { x: 0, y: 0 }, end: { x: 1, y: 1 } },
  diagonalReverse: { start: { x: 1, y: 0 }, end: { x: 0, y: 1 } },
};

// Password Strength Colors
export const passwordStrength = {
  veryWeak: colors.red,
  weak: colors.orange,
  fair: colors.yellow,
  good: colors.yellowLight,
  strong: colors.green,
  veryStrong: colors.greenDark,
};

// Category Colors
export const categoryColors = {
  Social: colors.blue,
  Banking: colors.green,
  Work: colors.indigo,
  Shopping: colors.orange,
  Email: colors.purple,
  Entertainment: colors.red,
  Other: colors.gray500,
};

// Export default theme object
export default {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  animation,
  touchTarget,
  opacity,
  gradients,
  gradientPositions,
  passwordStrength,
  categoryColors,
};
