import { useEffect, useRef, useCallback, useState } from 'react';
import { Platform, AppState } from 'react-native';
import alert from '../utils/alert';

const INACTIVITY_TIMEOUT = 20 * 60 * 1000; // 20 minutes
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // Show warning 2 min before timeout

export const useSessionTimeout = (isLoggedIn, onLogout) => {
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const appStateRef = useRef(AppState.currentState);
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
      warningRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
  }, []);

  const handleTimeout = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    
    if (Platform.OS === 'web') {
      if (window.confirm('Your session has expired due to inactivity. You will be logged out for security.')) {
        onLogout();
      } else {
        onLogout();
      }
    } else {
      alert(
        'Session Expired',
        'You have been logged out due to inactivity for security purposes.',
        [{ text: 'OK', onPress: onLogout }]
      );
    }
  }, [onLogout, clearTimers]);

  const showTimeoutWarning = useCallback(() => {
    setShowWarning(true);
    
    let remaining = WARNING_BEFORE_TIMEOUT / 1000;
    setTimeRemaining(remaining);
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }
    
    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      setTimeRemaining(remaining);
      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
    }, 1000);
  }, []);

  const resetTimer = useCallback(() => {
    if (!isLoggedIn) return;
    
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    clearTimers();
    
    warningRef.current = setTimeout(() => {
      showTimeoutWarning();
    }, INACTIVITY_TIMEOUT - WARNING_BEFORE_TIMEOUT);
    
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, INACTIVITY_TIMEOUT);
  }, [isLoggedIn, clearTimers, showTimeoutWarning, handleTimeout]);

  const extendSession = useCallback(() => {
    setShowWarning(false);
    clearTimers();
    resetTimer();
  }, [resetTimer, clearTimers]);

  useEffect(() => {
    if (!isLoggedIn) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    resetTimer();

    if (Platform.OS === 'web') {
      const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
      
      const handleActivity = () => {
        if (Date.now() - lastActivityRef.current > 1000) {
          resetTimer();
        }
      };

      activityEvents.forEach(event => {
        window.addEventListener(event, handleActivity, { passive: true });
      });

      return () => {
        clearTimers();
        activityEvents.forEach(event => {
          window.removeEventListener(event, handleActivity);
        });
      };
    } else {
      const handleAppStateChange = (nextAppState) => {
        if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
          const inactiveTime = Date.now() - lastActivityRef.current;
          if (inactiveTime >= INACTIVITY_TIMEOUT) {
            handleTimeout();
          } else {
            resetTimer();
          }
        }
        appStateRef.current = nextAppState;
        if (nextAppState === 'active') {
          lastActivityRef.current = Date.now();
        }
      };

      const subscription = AppState.addEventListener('change', handleAppStateChange);

      return () => {
        clearTimers();
        subscription?.remove();
      };
    }
  }, [isLoggedIn, resetTimer, clearTimers, handleTimeout]);

  return {
    showWarning,
    timeRemaining,
    extendSession,
    resetTimer
  };
};

export default useSessionTimeout;
