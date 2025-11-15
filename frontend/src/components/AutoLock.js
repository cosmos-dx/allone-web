import React, { useState, useEffect } from 'react';
import { useActivityTracker } from '../hooks/useActivityTracker';
import LockScreen from './LockScreen';
import { useAuth } from '../context/AuthContext';

export default function AutoLock({ enabled = true, inactivityTimeout = 5 * 60 * 1000 }) {
  const [isLocked, setIsLocked] = useState(false);
  const { currentUser } = useAuth();

  // Check if auto-lock is enabled in user preferences
  const autoLockEnabled = enabled && (currentUser?.preferences?.autoLock !== false);

  const handleInactive = () => {
    if (autoLockEnabled && currentUser?.passwordEnabled) {
      setIsLocked(true);
    }
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  useActivityTracker(inactivityTimeout, handleInactive, autoLockEnabled);

  // Don't show lock screen if passkey is not enabled
  if (isLocked && !currentUser?.passwordEnabled) {
    // If passkey is not enabled, just unlock automatically
    setIsLocked(false);
    return null;
  }

  if (isLocked) {
    return <LockScreen onUnlock={handleUnlock} />;
  }

  return null;
}

