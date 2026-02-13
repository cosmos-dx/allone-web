/**
 * Animation utilities matching frontend timing (300ms cubic-bezier)
 */

import { Animated } from 'react-native';

export const ANIMATION_DURATION = 300;
export const ANIMATION_EASING = {
  // Cubic bezier equivalent for React Native
  easeInOut: 'ease-in-out',
  easeOut: 'ease-out',
  easeIn: 'ease-in',
};

/**
 * Fade in animation
 * @param {Animated.Value} animValue - Animated value
 * @param {number} duration - Duration in ms
 * @param {Function} callback - Optional callback
 */
export const fadeIn = (animValue, duration = ANIMATION_DURATION, callback) => {
  return Animated.timing(animValue, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Fade out animation
 * @param {Animated.Value} animValue - Animated value
 * @param {number} duration - Duration in ms
 * @param {Function} callback - Optional callback
 */
export const fadeOut = (animValue, duration = ANIMATION_DURATION, callback) => {
  return Animated.timing(animValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  }).start(callback);
};

/**
 * Slide in from direction
 * @param {Animated.Value} animValue - Animated value
 * @param {string} direction - 'left', 'right', 'top', 'bottom'
 * @param {number} distance - Distance to slide
 * @param {number} duration - Duration in ms
 */
export const slideIn = (animValue, direction = 'right', distance = 100, duration = ANIMATION_DURATION) => {
  const toValue = direction === 'left' || direction === 'top' ? -distance : distance;
  return Animated.timing(animValue, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  });
};

/**
 * Scale animation
 * @param {Animated.Value} animValue - Animated value
 * @param {number} toValue - Target scale (1 = normal)
 * @param {number} duration - Duration in ms
 */
export const scale = (animValue, toValue = 1.05, duration = ANIMATION_DURATION) => {
  return Animated.timing(animValue, {
    toValue,
    duration,
    useNativeDriver: true,
  });
};

/**
 * Create animated value with initial value
 * @param {number} initialValue - Initial value
 * @returns {Animated.Value}
 */
export const createAnimatedValue = (initialValue = 0) => {
  return new Animated.Value(initialValue);
};

/**
 * Parallel animations
 * @param {Array} animations - Array of animations
 * @param {Function} callback - Optional callback
 */
export const parallel = (animations, callback) => {
  return Animated.parallel(animations).start(callback);
};

/**
 * Sequence animations
 * @param {Array} animations - Array of animations
 * @param {Function} callback - Optional callback
 */
export const sequence = (animations, callback) => {
  return Animated.sequence(animations).start(callback);
};

