import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, ImageBackground, Platform } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';
import { apiRequest, API_ENDPOINTS, API_BASE_URL } from '../config/api';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const getNotificationTypeInfo = (type) => {
  switch (type) {
    case 'case_update':
    case 'new_information':
    case 'status_update_request':
    case 'deadline_reminder':
      return { icon: '📋', label: 'Case Update', color: '#3b82f6' };
    case 'appointment_request':
    case 'appointment_reminder':
      return { icon: '📅', label: 'Appointment', color: '#8b5cf6' };
    case 'payment_notification':
    case 'disbursement_complete':
      return { icon: '💰', label: 'Payment', color: '#10b981' };
    case 'document_request':
      return { icon: '📄', label: 'Document Request', color: '#f59e0b' };
    case 'system_alert':
      return { icon: '⚙️', label: 'System Alert', color: '#6b7280' };
    case 'task_assigned':
    case 'task_reminder':
      return { icon: '✅', label: 'Task', color: '#ec4899' };
    case 'message':
      return { icon: '💬', label: 'Message', color: '#06b6d4' };
    default:
      return { icon: '🔔', label: 'Notification', color: '#FFD700' };
  }
};

const getSenderInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const NotificationDetailScreen = ({ user, notificationId, onBack, onNavigate, isOutbox = false }) => {
  const { markAsRead, markAsClicked, refreshNotifications } = useNotifications();
  const [notification, setNotification] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isArchiving, setIsArchiving] = useState(false);

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
        if (!isOutbox && !response.notification.is_read) {
          await markAsRead(notificationId);
        }
        if (!isOutbox && !response.notification.is_clicked) {
          await markAsClicked(notificationId);
        }
      }
    } catch (error) {
      console.error('Error loading notification detail:', error);
      alert('Error', 'Failed to load notification details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    alert(
      'Archive Notification',
      'Are you sure you want to archive this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          onPress: async () => {
            try {
              setIsArchiving(true);
              const response = await fetch(
                `${API_BASE_URL}/api/notifications/${notificationId}/archive`,
                {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                  },
                }
              );
              
              if (response.ok) {
                await refreshNotifications();
                alert('Archived', 'Notification has been archived', [
                  { text: 'OK', onPress: () => onBack() }
                ]);
              }
            } catch (error) {
              console.error('Error archiving notification:', error);
              alert('Error', 'Failed to archive notification');
            } finally {
              setIsArchiving(false);
            }
          }
        }
      ]
    );
  };

  const handleDelete = async () => {
    alert(
      'Delete Notification',
      'Are you sure you want to delete this notification? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsArchiving(true);
              const response = await fetch(
                `${API_BASE_URL}/api/notifications/${notificationId}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                  },
                }
              );
              
              if (response.ok) {
                await refreshNotifications();
                alert('Deleted', 'Notification has been deleted', [
                  { text: 'OK', onPress: () => onBack() }
                ]);
              }
            } catch (error) {
              console.error('Error deleting notification:', error);
              alert('Error', 'Failed to delete notification');
            } finally {
              setIsArchiving(false);
            }
          }
        }
      ]
    );
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
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

  const formatShortTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
      <Text style={styles.headerTitle}>
        {isOutbox ? '📤 Sent' : '📥 Notification'}
      </Text>
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

  const isUrgent = notification.is_urgent || notification.priority === 'urgent';
  const typeInfo = getNotificationTypeInfo(notification.notification_type || notification.type);
  const senderName = notification.sender_name || 'Your Legal Team';
  const senderInitials = getSenderInitials(senderName);

  return (
    <ImageBackground
      source={pirateShipBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {renderHeader()}

        {isUrgent && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerText}>⚠️ URGENT NOTIFICATION</Text>
          </View>
        )}

        <ScrollView style={styles.scrollContent} contentContainerStyle={styles.contentContainer}>
          <View style={[styles.typeBadge, { backgroundColor: typeInfo.color + '30', borderColor: typeInfo.color }]}>
            <Text style={[styles.typeBadgeText, { color: typeInfo.color }]}>
              {typeInfo.icon} {typeInfo.label}
            </Text>
          </View>

          <View style={styles.senderCard}>
            <View style={[styles.senderAvatar, isUrgent && styles.senderAvatarUrgent]}>
              <Text style={styles.senderInitials}>{senderInitials}</Text>
            </View>
            <View style={styles.senderInfo}>
              <Text style={styles.senderLabel}>From</Text>
              <Text style={styles.senderName}>{senderName}</Text>
            </View>
          </View>

          <Text style={styles.timestamp}>
            {isOutbox ? 'Sent: ' : 'Received: '}{formatTimestamp(notification.created_at || notification.sent_at)}
          </Text>

          <View style={styles.subjectCard}>
            <Text style={styles.subjectLabel}>Subject</Text>
            <Text style={[styles.subjectText, isUrgent && styles.subjectTextUrgent]}>
              {notification.subject || notification.title}
            </Text>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageLabel}>Message</Text>
            <Text style={styles.messageText}>{notification.body}</Text>
          </View>

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

          {isOutbox && (
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>📊 Delivery Analytics</Text>
              
              <View style={styles.analyticsRow}>
                <View style={[styles.analyticsIcon, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]}>
                  <Text>↑</Text>
                </View>
                <View style={styles.analyticsInfo}>
                  <Text style={styles.analyticsLabel}>Sent</Text>
                  <Text style={styles.analyticsTime}>
                    {formatShortTimestamp(notification.sent_at || notification.created_at)}
                  </Text>
                </View>
                <Text style={styles.analyticsCheck}>✓</Text>
              </View>
              
              <View style={styles.analyticsRow}>
                <View style={[styles.analyticsIcon, { backgroundColor: notification.clicked_at ? 'rgba(251, 191, 36, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                  <Text>👆</Text>
                </View>
                <View style={styles.analyticsInfo}>
                  <Text style={styles.analyticsLabel}>Clicked</Text>
                  <Text style={[styles.analyticsTime, notification.clicked_at && { color: '#fbbf24' }]}>
                    {notification.clicked_at ? formatShortTimestamp(notification.clicked_at) : 'Not clicked'}
                  </Text>
                </View>
                {notification.clicked_at && <Text style={[styles.analyticsCheck, { color: '#fbbf24' }]}>✓</Text>}
              </View>
              
              <View style={[styles.analyticsRow, { borderBottomWidth: 0 }]}>
                <View style={[styles.analyticsIcon, { backgroundColor: notification.read_at ? 'rgba(74, 222, 128, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                  <Text>👁️</Text>
                </View>
                <View style={styles.analyticsInfo}>
                  <Text style={styles.analyticsLabel}>Read</Text>
                  <Text style={[styles.analyticsTime, notification.read_at && { color: '#4ade80' }]}>
                    {notification.read_at ? formatShortTimestamp(notification.read_at) : 'Not read'}
                  </Text>
                </View>
                {notification.read_at && <Text style={[styles.analyticsCheck, { color: '#4ade80' }]}>✓✓</Text>}
              </View>
            </View>
          )}

          {!isOutbox && (
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
                    {formatShortTimestamp(notification.clicked_at)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {!isOutbox && (
          <View style={styles.bottomActions}>
            <TouchableOpacity
              style={styles.archiveButton}
              onPress={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? (
                <ActivityIndicator size="small" color="#FFD700" />
              ) : (
                <>
                  <Text style={styles.archiveButtonIcon}>📁</Text>
                  <Text style={styles.archiveButtonText}>Archive</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isArchiving}
            >
              <Text style={styles.deleteButtonIcon}>🗑️</Text>
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  placeholder: {
    width: 60,
  },
  urgentBanner: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    alignItems: 'center',
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#FFD700',
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
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
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  typeBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  senderCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  senderAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  senderAvatarUrgent: {
    borderColor: '#dc2626',
    backgroundColor: 'rgba(220, 38, 38, 0.3)',
  },
  senderInitials: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  senderInfo: {
    flex: 1,
  },
  senderLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 2,
  },
  senderName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  timestamp: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 16,
  },
  subjectCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  subjectLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  subjectText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFD700',
  },
  subjectTextUrgent: {
    color: '#ff6b6b',
  },
  messageCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  messageLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  messageText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 26,
  },
  actionButton: {
    backgroundColor: '#1e3a5f',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  analyticsCard: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  analyticsTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  analyticsIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  analyticsInfo: {
    flex: 1,
  },
  analyticsLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  analyticsTime: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginTop: 2,
  },
  analyticsCheck: {
    color: '#4ade80',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
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
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  readStatus: {
    color: '#4ade80',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.3)',
  },
  archiveButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  archiveButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  archiveButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(220, 38, 38, 0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.5)',
  },
  deleteButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  deleteButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NotificationDetailScreen;
