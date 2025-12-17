import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const NotificationInboxScreen = ({ user, onNavigate, onNotificationPress }) => {
  const { notifications, isLoading, refreshNotifications, markAllAsRead } = useNotifications();
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  useEffect(() => {
    refreshNotifications();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    const unreadCount = notifications.filter(n => !n.is_read).length;
    if (unreadCount === 0) {
      return;
    }

    setMarkingAllRead(true);
    const result = await markAllAsRead();
    setMarkingAllRead(false);

    if (result.success) {
      await refreshNotifications();
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.is_read;
    if (filter === 'read') return notification.is_read;
    return true;
  });

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderNotificationItem = ({ item }) => {
    const isUrgent = item.is_urgent || item.priority === 'urgent';
    
    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.is_read && styles.unreadCard,
          isUrgent && styles.urgentCard
        ]}
        onPress={() => onNotificationPress && onNotificationPress(item.id)}
      >
        {isUrgent && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerText}>⚠️ URGENT</Text>
          </View>
        )}
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, isUrgent && styles.urgentTitle]} numberOfLines={1}>
            {item.subject || item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadBadge} />}
        </View>
        {item.sender_name && (
          <Text style={styles.senderName}>From: {item.sender_name}</Text>
        )}
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>
            {formatTimestamp(item.created_at)}
          </Text>
          <View style={styles.statusContainer}>
            {item.is_clicked && (
              <Text style={styles.clickedLabel}>✓ Viewed</Text>
            )}
            {item.is_read && !item.is_clicked && (
              <Text style={styles.readLabel}>Read</Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate && onNavigate('dashboard')}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🔔 Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All ({notifications.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            Unread ({notifications.filter(n => !n.is_read).length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.activeFilterTab]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            Read ({notifications.filter(n => n.is_read).length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtonContainer}>
        {user?.userType === 'individual' && (
          <>
            <TouchableOpacity
              style={styles.sendNotificationButton}
              onPress={() => onNavigate && onNavigate('individual-send-notification')}
            >
              <Text style={styles.sendNotificationText}>📨 Compose</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.outboxButton}
              onPress={() => onNavigate && onNavigate('notification-outbox')}
            >
              <Text style={styles.outboxButtonText}>📤 Sent</Text>
            </TouchableOpacity>
          </>
        )}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAllRead}
          >
            <Text style={styles.markAllReadText}>
              {markingAllRead ? '✓ Marking...' : '✓ Mark Read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Notification List */}
      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🏴‍☠️</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            {filter === 'unread' 
              ? "You're all caught up! No unread notifications."
              : filter === 'read'
              ? "No read notifications yet."
              : "When you receive notifications, they'll appear here."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FFD700']}
              tintColor="#FFD700"
            />
          }
        />
      )}
    </View>
  );

  return (
    <ImageBackground
      source={pirateShipBackground}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <View style={styles.overlay}>
        {renderContent()}
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
  contentContainer: {
    flex: 1,
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  filterText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendNotificationButton: {
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.5)',
    marginRight: 10,
  },
  sendNotificationText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  outboxButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    marginRight: 10,
  },
  outboxButtonText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  markAllReadButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  markAllReadText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  notificationCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  unreadCard: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    flex: 1,
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFD700',
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 12,
    lineHeight: 20,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notificationTime: {
    fontSize: 12,
    color: 'rgba(255, 215, 0, 0.7)',
  },
  clickedLabel: {
    fontSize: 12,
    color: '#4ade80',
    fontWeight: '600',
  },
  readLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderName: {
    fontSize: 13,
    color: 'rgba(255, 215, 0, 0.8)',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  urgentCard: {
    backgroundColor: 'rgba(185, 28, 28, 0.2)',
    borderColor: '#dc2626',
    borderWidth: 2,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  urgentBanner: {
    backgroundColor: '#dc2626',
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  urgentTitle: {
    color: '#fca5a5',
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
    paddingHorizontal: 40,
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    padding: 30,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default NotificationInboxScreen;
