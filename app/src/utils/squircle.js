/**
 * Squircle utility for consistent rounded corners
 * Matches frontend design patterns with rounded-2xl (20px) and rounded-xl (12px)
 */

export const squircleRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
};

/**
 * Create squircle style for React Native components
 * @param {number|string} radius - Radius size (number or key from squircleRadius)
 * @returns {Object} Style object with borderRadius
 */
export const createSquircleStyle = (radius = 20) => {
  const borderRadius = typeof radius === 'string' ? squircleRadius[radius] || 20 : radius;
  return {
    borderRadius,
  };
};

/**
 * Get glass morphism style combined with squircle
 * @param {number|string} radius - Squircle radius
 * @param {number} opacity - Background opacity (0-1)
 * @returns {Object} Combined style object
 */
export const createGlassSquircleStyle = (radius = 20, opacity = 0.7) => {
  return {
    ...createSquircleStyle(radius),
    backgroundColor: `rgba(255, 255, 255, ${opacity})`,
  };
};

