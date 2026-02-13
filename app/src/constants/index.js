// Application Constants
import theme from '../theme';

// API Configuration
export const API_ENDPOINTS = {
  AUTH: {
    SESSION: '/api/auth/session',
    USER: '/api/auth/user',
  },
  PASSWORDS: '/api/passwords',
  TOTP: '/api/totp',
  SPACES: '/api/spaces',
  USERS: {
    SEARCH: '/api/users/search',
  },
  SEARCH: '/api/search',
  AI: {
    CHAT: '/api/ai/chat',
    CHAT_STREAM: '/api/ai/chat/stream',
    ANALYZE: '/api/ai/analyze-passwords',
  },
  BILLS: '/api/bills',
  NOTIFICATIONS: '/api/notifications',
};

// Password Categories
export const PASSWORD_CATEGORIES = [
  'Social',
  'Banking',
  'Work',
  'Shopping',
  'Email',
  'Entertainment',
  'Other',
];

// TOTP Defaults
export const TOTP_DEFAULTS = {
  ALGORITHM: 'SHA1',
  DIGITS: 6,
  PERIOD: 30,
  ALGORITHMS: ['SHA1', 'SHA256', 'SHA512'],
};

// Space Types
export const SPACE_TYPES = {
  PERSONAL: 'personal',
  FAMILY: 'family',
  WORK: 'work',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
  SUCCESS: 'success',
};

// Default Values
export const DEFAULTS = {
  SPACE_ID: 'personal',
  PASSWORD_CATEGORY: 'Other',
  PASSWORD_STRENGTH_MIN: 0,
  PASSWORD_STRENGTH_MAX: 5,
};

// UI Constants
export const UI = {
  DEBOUNCE_DELAY: 300,
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: theme.animation.duration.base,
  TOUCH_TARGET_MIN: theme.touchTarget.min,
};

// Error Messages
export const ERROR_MESSAGES = {
  TOTP_SECRET_REQUIRED: 'TOTP secret is required and must be a string',
  TOTP_PERIOD_INVALID: 'TOTP period must be a positive number',
  TOTP_DIGITS_INVALID: 'TOTP digits must be between 6 and 8',
  TOTP_ALGORITHM_INVALID: 'TOTP algorithm must be SHA1, SHA256, or SHA512',
  TOTP_DECRYPT_FAILED: 'Unable to decrypt TOTP',
  TOTP_INVALID_SECRET: 'Invalid or corrupted TOTP secret. Try re-adding this account.',
  PASSWORD_NAME_REQUIRED: 'Name and password are required',
  PASSWORD_DECRYPT_FAILED: 'Unable to decrypt password',
  PASSWORD_LOAD_EDIT_FAILED: 'Failed to load password for editing',
  PASSWORD_ADD_FAILED: 'Failed to add password',
  PASSWORD_UPDATE_FAILED: 'Failed to update password',
  PASSWORD_DELETE_FAILED: 'Failed to delete password',
  PASSWORD_COPY_FAILED: 'Failed to copy password',
  PASSWORD_GENERATE_FAILED: 'Failed to generate password',
  SPACE_NAME_REQUIRED: 'Space name is required',
  GENERIC_ERROR: 'An error occurred. Please try again.',
};

