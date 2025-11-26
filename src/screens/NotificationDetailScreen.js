import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, ImageBackground, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const NotificationDetailScreen = ({ user, notificationId, onBack, onNavigate }) => {
  const { markAsRead, markAsClicked } = useNotifications();
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadNotificationDetail();
  }, [notificationId]);

  const loadNotificationDetail = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(API_ENDPOINTS.NOTIFICATIONS.DETAIL(notificationId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.success) {
        setNotification(response.notification);
        if (!response.notification.is_read) {
          await markAsRead(notificationId);
        }
        if (!response.notification.is_clicked) {
          await markAsClicked(notificationId);
        }
      }
    } catch (error) {
      console.error('Error loading notification detail:', error);
      Alert.alert('Error', 'Failed to load notification details');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const options = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    };
    return date.toLocaleDateString('en-US', options);
  };

  const handleActionButton = () => {
    if (notification?.action_data?.screen) {
      onNavigate && onNavigate(notification.action_data.screen);
    } else {
      onNavigate && onNavigate('dashboard');
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Notification</Text>
      <View style={styles.placeholder} />
    </View>
  );

  if (isLoading) {
    return (
      <ImageBackground
        source={pirateShipBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {renderHeader()}
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Loading notification...</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  if (!notification) {
    return (
      <ImageBackground
        source={pirateShipBackground}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {renderHeader()}
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🏴‍☠️</Text>
            <Text style={styles.emptyText}>Notification not found</Text>
          </View>
        </View>
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={pirateShipBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {renderHeader()}

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
          {/* Notification Type Badge */}
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>
              {notification.notification_type === 'task_reminder' ? '📋 Task Reminder' :
               notification.notification_type === 'deadline_reminder' ? '⏰ Deadline' :
               notification.notification_type === 'document_request' ? '📄 Document Request' :
               notification.notification_type === 'appointment_reminder' ? '📅 Appointment' :
               notification.notification_type === 'general' ? '📢 General' :
               '🔔 Notification'}
            </Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{notification.title}</Text>

          {/* Timestamp */}
          <Text style={styles.timestamp}>{formatTimestamp(notification.created_at)}</Text>

          {/* Sender Info */}
          <View style={styles.senderCard}>
            <Text style={styles.senderLabel}>From:</Text>
            <Text style={styles.senderName}>
              {notification.sender_name || 'Your Legal Team'}
            </Text>
          </View>

          {/* Body */}
          <View style={styles.bodyCard}>
            <Text style={styles.bodyText}>{notification.body}</Text>
          </View>

          {/* Action Button */}
          {notification.action_data?.buttonText && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleActionButton}
            >
              <Text style={styles.actionButtonText}>
                {notification.action_data.buttonText}
              </Text>
            </TouchableOpacity>
          )}

          {/* Status Info */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status:</Text>
              <Text style={[styles.statusValue, notification.is_read && styles.readStatus]}>
                {notification.is_read ? '✓ Read' : 'Unread'}
              </Text>
            </View>
            {notification.is_clicked && (
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Viewed:</Text>
                <Text style={styles.statusValue}>
                  {formatTimestamp(notification.clicked_at)}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  typeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  typeBadgeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  timestamp: {
    fontSize: 14,
    color: 'rgba(255, 215, 0, 0.7)',
    marginBottom: 20,
  },
  senderCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  senderLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  senderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFD700',
  },
  bodyCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  bodyText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 24,
  },
  actionButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
  },
  statusCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  statusValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  readStatus: {
    color: '#4ade80',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFD700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    margin: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#FFD700',
  },
});

export default NotificationDetailScreen;
