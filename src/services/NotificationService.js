import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

let Notifications = null;
let Device = null;
let Constants = null;

if (Platform.OS !== 'web') {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;
  
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  async requestPermissions() {
    if (Platform.OS === 'web') {
      return false;
    }
    
    try {
      if (!Device.isDevice) {
        console.log('Notifications only work on physical devices');
        return false;
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.log('Notification permission not granted');
        return false;
      }

      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3498db',
        });
      }

      return true;
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  async registerForPushNotifications() {
    if (Platform.OS === 'web') {
      return null;
    }
    
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;
      
      const token = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = token.data;
      console.log('Expo Push Token:', this.expoPushToken);

      return this.expoPushToken;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  async registerDeviceWithBackend(authToken, userId) {
    if (Platform.OS === 'web') {
      return false;
    }
    
    try {
      if (!this.expoPushToken) {
        console.log('No push token available');
        return false;
      }

      const deviceInfo = {
        expoPushToken: this.expoPushToken,
        deviceName: Device?.deviceName || 'Unknown Device',
        platform: Platform.OS,
        appVersion: Constants?.expoConfig?.version || '1.0.0',
      };

      const response = await fetch(`${API_BASE_URL}/api/notifications/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(deviceInfo),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to register device');
      }

      if (userId) {
        await AsyncStorage.setItem(`deviceRegistered_${userId}`, 'true');
      }
      console.log('Device registered with backend:', data);
      return true;
    } catch (error) {
      console.error('Error registering device with backend:', error);
      return false;
    }
  }

  async unregisterDeviceFromBackend(authToken, userId) {
    if (Platform.OS === 'web') {
      return false;
    }
    
    try {
      if (!this.expoPushToken) {
        return false;
      }

      const response = await fetch(`${API_BASE_URL}/api/notifications/unregister-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          expoPushToken: this.expoPushToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unregister device');
      }

      if (userId) {
        await AsyncStorage.removeItem(`deviceRegistered_${userId}`);
      }
      console.log('Device unregistered from backend');
      return true;
    } catch (error) {
      console.error('Error unregistering device:', error);
      return false;
    }
  }

  setupNotificationListeners(onNotificationReceived, onNotificationTapped) {
    if (Platform.OS === 'web') {
      return () => {};
    }
    
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      if (onNotificationReceived) {
        onNotificationReceived(notification);
      }
    });

    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      if (onNotificationTapped) {
        onNotificationTapped(response);
      }
    });

    return () => {
      if (this.notificationListener) {
        Notifications.removeNotificationSubscription(this.notificationListener);
      }
      if (this.responseListener) {
        Notifications.removeNotificationSubscription(this.responseListener);
      }
    };
  }

  async setBadgeCount(count) {
    if (Platform.OS === 'web') {
      return;
    }
    
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }

  async getBadgeCount() {
    if (Platform.OS === 'web') {
      return 0;
    }
    
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('Error getting badge count:', error);
      return 0;
    }
  }

  async clearBadge() {
    if (Platform.OS === 'web') {
      return;
    }
    
    try {
      await Notifications.setBadgeCountAsync(0);
    } catch (error) {
      console.error('Error clearing badge:', error);
    }
  }

  async dismissAllNotifications() {
    if (Platform.OS === 'web') {
      return;
    }
    
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('Error dismissing notifications:', error);
    }
  }

  async markNotificationAsRead(notificationId, authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  async markNotificationAsClicked(notificationId, authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/clicked`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as clicked');
      }

      return true;
    } catch (error) {
      console.error('Error marking notification as clicked:', error);
      return false;
    }
  }

  async markAllAsRead(authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }

      return { success: true, count: data.count };
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchUnreadCount(authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/unread-count`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch unread count');
      }

      return data.unreadCount || 0;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  async fetchNotifications(authToken, options = {}) {
    try {
      const { limit = 50, offset = 0, status, type } = options;
      
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) queryParams.append('status', status);
      if (type) queryParams.append('type', type);

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/my-notifications?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      return data.notifications || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  async getPreferences(authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch preferences');
      }

      return data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }

  async updatePreferences(authToken, preferences) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update preferences');
      }

      return data.preferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }
}

export default new NotificationService();
