import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationService from '../services/NotificationService';

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

  useEffect(() => {
    if (user?.token) {
      setAuthToken(user.token);
    } else {
      setAuthToken(null);
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [user]);

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
      console.error('Error loading auth token:', error);
      return null;
    }
  }, [authToken]);

  const initializeNotifications = useCallback(async () => {
    try {
      const token = authToken || await loadAuthToken();
      if (!token || !user?.id) {
        console.log('No auth token or user ID available for notifications');
        return;
      }

      const pushToken = await NotificationService.registerForPushNotifications();
      if (pushToken) {
        const deviceRegistered = await AsyncStorage.getItem(`deviceRegistered_${user.id}`);
        
        if (!deviceRegistered || deviceRegistered !== 'true') {
          await NotificationService.registerDeviceWithBackend(token, user.id);
        }
      }

      await refreshUnreadCount(token);
    } catch (error) {
      console.error('Error initializing notifications:', error);
    }
  }, [authToken, user, loadAuthToken]);

  const refreshUnreadCount = useCallback(async (token = null) => {
    try {
      const activeToken = token || authToken || await loadAuthToken();
      if (!activeToken) return;

      const count = await NotificationService.fetchUnreadCount(activeToken);
      setUnreadCount(count);
      await NotificationService.setBadgeCount(count);
    } catch (error) {
      console.error('Error refreshing unread count:', error);
    }
  }, [authToken, loadAuthToken]);

  const fetchNotifications = useCallback(async (options = {}) => {
    try {
      setIsLoading(true);
      const token = authToken || await loadAuthToken();
      if (!token) return;

      const fetchedNotifications = await NotificationService.fetchNotifications(token, options);
      setNotifications(fetchedNotifications);
      return fetchedNotifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
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
        await refreshUnreadCount(token);
      }
      return success;
    } catch (error) {
      console.error('Error marking notification as read:', error);
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
      console.error('Error marking notification as clicked:', error);
      return false;
    }
  }, [authToken, loadAuthToken]);

  const handleNotificationReceived = useCallback((notification) => {
    console.log('Notification received in app:', notification);
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  const handleNotificationTapped = useCallback(async (response) => {
    const notification = response.notification;
    const notificationData = notification.request.content.data;

    console.log('Notification tapped:', notificationData);

    if (notificationData.notificationId) {
      await markAsClicked(notificationData.notificationId);
      await markAsRead(notificationData.notificationId);
    }

    if (notificationData.actionUrl && onNavigate) {
      console.log('Handling deep link:', notificationData.actionUrl);
      onNavigate('dashboard');
    }
  }, [markAsClicked, markAsRead, onNavigate]);

  useEffect(() => {
    initializeNotifications();

    const cleanup = NotificationService.setupNotificationListeners(
      handleNotificationReceived,
      handleNotificationTapped
    );

    return cleanup;
  }, [initializeNotifications, handleNotificationReceived, handleNotificationTapped]);

  const logout = useCallback(async () => {
    try {
      const token = authToken || await loadAuthToken();
      if (token && user?.id) {
        await NotificationService.unregisterDeviceFromBackend(token, user.id);
      }
      
      setAuthToken(null);
      setUnreadCount(0);
      setNotifications([]);
      await NotificationService.clearBadge();
    } catch (error) {
      console.error('Error during notification logout:', error);
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
    logout,
    setAuthToken,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
