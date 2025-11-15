"""
Application Constants
"""

# Firestore Collection Names
COLLECTIONS = {
    'USERS': 'users',
    'PASSWORDS': 'passwords',
    'TOTP_SECRETS': 'totpSecrets',
    'SPACES': 'spaces',
    'NOTIFICATIONS': 'notifications',
    'BILLS': 'bills',
    'BILL_SETTLEMENTS': 'billSettlements',
}

# Default Values
DEFAULTS = {
    'SPACE_ID': 'personal',
    'PASSWORD_CATEGORY': 'Other',
    'TOTP_ALGORITHM': 'SHA1',
    'TOTP_DIGITS': 6,
    'TOTP_PERIOD': 30,
}

# Query Limits (for performance)
QUERY_LIMITS = {
    'PASSWORDS': 1000,
    'TOTP': 500,
    'SEARCH_RESULTS': 100,
    'USER_SEARCH': 20,
}

# Space Types
SPACE_TYPES = {
    'PERSONAL': 'personal',
    'FAMILY': 'family',
    'WORK': 'work',
}

# Notification Types
NOTIFICATION_TYPES = {
    'INFO': 'info',
    'WARNING': 'warning',
    'ERROR': 'error',
    'SUCCESS': 'success',
}

# Error Messages
ERROR_MESSAGES = {
    'DATABASE_UNAVAILABLE': 'Database not available',
    'USER_NOT_FOUND': 'User not found',
    'PASSWORD_NOT_FOUND': 'Password not found',
    'TOTP_NOT_FOUND': 'TOTP not found',
    'SPACE_NOT_FOUND': 'Space not found',
    'BILL_NOT_FOUND': 'Bill not found',
    'NOT_AUTHORIZED': 'Not authorized',
    'ONLY_OWNER_CAN_MANAGE': 'Only space owner can manage members',
    'USER_ALREADY_MEMBER': 'User is already a member',
    'INVALID_SPLIT_AMOUNT': 'Split amounts do not match bill total',
    'PARTICIPANT_NOT_FOUND': 'Participant not found in bill',
}

