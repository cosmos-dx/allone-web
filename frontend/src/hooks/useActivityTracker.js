import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to track user activity and detect inactivity
 * @param {number} inactivityTimeout - Timeout in milliseconds (default: 5 minutes)
 * @param {function} onInactive - Callback when user becomes inactive
 * @param {boolean} enabled - Whether tracking is enabled
 */
export function useActivityTracker(inactivityTimeout = 5 * 60 * 1000, onInactive, enabled = true) {
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    lastActivityRef.current = Date.now();
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (onInactive) {
        onInactive();
      }
    }, inactivityTimeout);
  }, [inactivityTimeout, onInactive, enabled]);

  const handleActivity = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      // Clear timeout if disabled
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Track various user activities
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Initialize timer
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled, handleActivity, resetTimer]);

  // Return function to manually reset timer (useful for external triggers)
  return {
    resetTimer: handleActivity,
    getLastActivity: () => lastActivityRef.current
  };
}

