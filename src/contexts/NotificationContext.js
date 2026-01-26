import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';
import firebaseService from '../services/firebaseService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children, onNavigate = null, user = null }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState(user?.token || null);
  const [useFirebase, setUseFirebase] = useState(true);
  const firebaseUnsubscribe = useRef(null);
  const pollIntervalRef = useRef(null);

  useEffect(() => {
    const status = { 
      hasUser: !!user, 
      userId: user?.id, 
      userType: user?.userType,
      hasToken: !!user?.token,
      timestamp: new Date().toISOString()
    };
    
    // Expose status for debugging (web only)
    if (typeof window !== 'undefined') {
      window.__vpNotifyStatus = {
        ...status,
        unreadCount,
        useFirebase,
        hasFirebaseUnsubscribe: !!firebaseUnsubscribe.current,
        hasPollInterval: !!pollIntervalRef.current
      };
    }
    
    if (user?.token) {
      setAuthToken(user.token);
    } else {
      setAuthToken(null);
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [user, unreadCount, useFirebase]);

  const loadAuthToken = useCallback(async () => {
    try {
      if (authToken) {
        return authToken;
      }
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        setAuthToken(token);
      }
      return token;
    } catch (error) {
      return null;
    }
  }, [authToken]);

  const setupFirebaseListeners = useCallback(async () => {
    if (!user?.id || !user?.userType) {
      return false;
    }

    const token = user?.token || authToken || await loadAuthToken();
    if (!token) {
      setUseFirebase(false);
      return false;
    }

    try {
      const initResult = firebaseService.initializeFirebase();
      if (!initResult.success) {
        setUseFirebase(false);
        return false;
      }

      
      const handleNotificationsUpdate = (firebaseNotifications) => {
          count: firebaseNotifications.length,
          notifications: firebaseNotifications.map(n => ({ id: n.id, title: n.title }))
        });
        setNotifications(firebaseNotifications);
      };

      const handleUnreadCountUpdate = (count) => {
          newCount: count,
          oldCount: unreadCount 
        });
        setUnreadCount(count);
        NotificationService.setBadgeCount(count);
      };

      const unsubscribe = await firebaseService.subscribeToNotifications(
        user.userType,
        user.id,
        handleNotificationsUpdate,
        handleUnreadCountUpdate,
        token
      );

      if (unsubscribe) {
        firebaseUnsubscribe.current = unsubscribe;
        setUseFirebase(true);
        return true;
      } else {
        setUseFirebase(false);
        return false;
      }
    } catch (error) {
      setUseFirebase(false);
      return false;
    }
  }, [user, authToken, loadAuthToken]);

  const setupRESTPolling = useCallback(() => {
    
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    const pollNotifications = async () => {
      const token = authToken || await loadAuthToken();
      if (!token) return;

      try {
        // Fetch notifications list only, unread count comes from Firebase
        const fetchedNotifications = await NotificationService.fetchNotifications(token);
        setNotifications(fetchedNotifications);
      } catch (error) {
      }
    };

    pollNotifications();
    pollIntervalRef.current = setInterval(pollNotifications, 30000);
  }, [authToken, loadAuthToken]);

  const initializeNotifications = useCallback(async () => {
    try {
      const token = authToken || await loadAuthToken();
      if (!token || !user?.id) {
        return;
      }

      const pushToken = await NotificationService.registerForPushNotifications();
      if (pushToken) {
        const deviceRegistered = await AsyncStorage.getItem(`deviceRegistered_${user.id}`);
        
        if (!deviceRegistered || deviceRegistered !== 'true') {
          await NotificationService.registerDeviceWithBackend(token, user.id);
        }
      }

      const firebaseSuccess = await setupFirebaseListeners();
      
      if (!firebaseSuccess) {
        setupRESTPolling();
      }

      // Firebase handles unread count automatically, no need for REST call
    } catch (error) {
      setupRESTPolling();
    }
  }, [authToken, user, loadAuthToken, setupFirebaseListeners, setupRESTPolling]);

  const refreshUnreadCount = useCallback(async (token = null) => {
    // This function is kept for backward compatibility but does nothing
    // Firebase Realtime Database automatically syncs unread count
  }, []);

  const fetchNotifications = useCallback(async (options = {}) => {
    try {
      setIsLoading(true);
      const token = authToken || await loadAuthToken();
      if (!token) return;

      const fetchedNotifications = await NotificationService.fetchNotifications(token, options);
      setNotifications(fetchedNotifications);
      return fetchedNotifications;
    } catch (error) {
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [authToken, loadAuthToken]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      const token = authToken || await loadAuthToken();
      if (!token) return false;

      const success = await NotificationService.markNotificationAsRead(notificationId, token);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId 
            ? { ...n, is_read: true, read_at: new Date().toISOString() } 
            : n)
        );
        // Firebase automatically syncs the updated unread count
      }
      return success;
    } catch (error) {
      return false;
    }
  }, [authToken, loadAuthToken, refreshUnreadCount]);

  const markAsClicked = useCallback(async (notificationId) => {
    try {
      const token = authToken || await loadAuthToken();
      if (!token) return false;

      const success = await NotificationService.markNotificationAsClicked(notificationId, token);
      if (success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId 
            ? { ...n, is_clicked: true, clicked_at: new Date().toISOString() } 
            : n)
        );
      }
      return success;
    } catch (error) {
      return false;
    }
  }, [authToken, loadAuthToken]);

  const markAllAsRead = useCallback(async () => {
    try {
      const token = authToken || await loadAuthToken();
      if (!token) return { success: false, error: 'No auth token' };

      const result = await NotificationService.markAllAsRead(token);
      if (result.success) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
        );
        setUnreadCount(0);
        await NotificationService.setBadgeCount(0);
      }
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  }, [authToken, loadAuthToken]);

  const handleNotificationReceived = useCallback((notification) => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handleNotificationTapped = useCallback(async (response) => {
    const notification = response.notification;
    const notificationData = notification.request.content.data;


    if (notificationData.notificationId) {
      await markAsClicked(notificationData.notificationId);
      await markAsRead(notificationData.notificationId);
    }

    if (notificationData.actionUrl && onNavigate) {
      onNavigate('dashboard');
    }
  }, [markAsClicked, markAsRead, onNavigate]);

  useEffect(() => {
    // Use user.token directly to avoid timing issues with authToken state
    const token = user?.token || authToken;
    
      userId: user?.id,
      userType: user?.userType,
      hasUserToken: !!user?.token,
      hasAuthToken: !!authToken,
      hasToken: !!token,
      timestamp: new Date().toISOString()
    });
    
    if (!user?.id || !token) {
        hasUserId: !!user?.id,
        hasUserToken: !!user?.token,
        hasAuthToken: !!authToken
      });
      return;
    }

      userType: user.userType,
      userId: user.id,
      hasToken: !!token
    });
    
    // Call initialization async
    const init = async () => {
      try {
        if (!token || !user?.id) {
          return;
        }

        try {
          const pushToken = await NotificationService.registerForPushNotifications();
          if (pushToken) {
            const deviceRegistered = await AsyncStorage.getItem(`deviceRegistered_${user.id}`);
            
            if (!deviceRegistered || deviceRegistered !== 'true') {
              await NotificationService.registerDeviceWithBackend(token, user.id);
            } else {
            }
          } else {
          }
        } catch (pushError) {
          // Don't block app - push notifications are optional
        }

        const firebaseSuccess = await setupFirebaseListeners();
        
        if (!firebaseSuccess) {
          setupRESTPolling();
        } else {
        }

        await refreshUnreadCount(token);
      } catch (error) {
        setupRESTPolling();
      }
    };
    
    init();

    const cleanup = NotificationService.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    return () => {
      cleanup();
      if (firebaseUnsubscribe.current) {
        firebaseUnsubscribe.current();
        firebaseUnsubscribe.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [user?.id, user?.userType, user?.token]);

  useEffect(() => {
    if (!useFirebase && user?.id && authToken) {
      setupRESTPolling();
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, [useFirebase, user, authToken, setupRESTPolling]);

  const logout = useCallback(async () => {
    try {
      const token = authToken || await loadAuthToken();
      if (token && user?.id) {
        await NotificationService.unregisterDeviceFromBackend(token, user.id);
      }

      if (firebaseUnsubscribe.current) {
        firebaseUnsubscribe.current();
        firebaseUnsubscribe.current = null;
      }

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      firebaseService.unsubscribeAll();
      
      setAuthToken(null);
      setUnreadCount(0);
      setNotifications([]);
      setUseFirebase(true);
      await NotificationService.clearBadge();
    } catch (error) {
    }
  }, [authToken, user, loadAuthToken]);

  const value = {
    unreadCount,
    notifications,
    isLoading,
    initializeNotifications,
    refreshUnreadCount,
    refreshNotifications: fetchNotifications,
    markAsRead,
    markAsClicked,
    markAllAsRead,
    logout,
    setAuthToken,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
