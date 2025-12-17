import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const NotificationOutboxScreen = ({ user, onNavigate, onNotificationPress }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchSentNotifications();
  }, [filter]);

  const fetchSentNotifications = async () => {
    try {
      setIsLoading(true);
      const filterParam = filter !== 'all' ? `&filter=${filter}` : '';
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/sent-notifications?limit=50${filterParam}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Error fetching sent notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSentNotifications();
    setRefreshing(false);
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
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

  const getStatusInfo = (notification) => {
    if (notification.clickedAt) {
      return { label: 'Clicked', color: '#4ade80', icon: '✓✓' };
    }
    if (notification.readAt) {
      return { label: 'Read', color: '#60a5fa', icon: '✓' };
    }
    if (notification.deliveredAt) {
      return { label: 'Delivered', color: '#fbbf24', icon: '→' };
    }
    return { label: 'Sent', color: '#9ca3af', icon: '↑' };
  };

  const renderNotificationItem = ({ item }) => {
    const isUrgent = item.isUrgent;
    const statusInfo = getStatusInfo(item);

    return (
      <View
        style={[
          styles.notificationCard,
          isUrgent && styles.urgentCard
        ]}
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
        </View>
        <Text style={styles.recipientName}>To: {item.recipientName}</Text>
        <Text style={styles.notificationBody} numberOfLines={2}>
          {item.body}
        </Text>
        <View style={styles.notificationFooter}>
          <Text style={styles.notificationTime}>
            Sent {formatTimestamp(item.sentAt)}
          </Text>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusInfo.color + '30' }]}>
              <Text style={[styles.statusText, { color: statusInfo.color }]}>
                {statusInfo.icon} {statusInfo.label}
              </Text>
            </View>
          </View>
        </View>
        {(item.readAt || item.clickedAt) && (
          <View style={styles.trackingContainer}>
            {item.readAt && (
              <Text style={styles.trackingText}>
                Read {formatTimestamp(item.readAt)}
              </Text>
            )}
            {item.clickedAt && (
              <Text style={styles.trackingText}>
                Clicked {formatTimestamp(item.clickedAt)}
              </Text>
            )}
          </View>
        )}
      </View>
    );
  };

  const countByStatus = (statusType) => {
    switch (statusType) {
      case 'clicked':
        return notifications.filter(n => n.clickedAt).length;
      case 'read':
        return notifications.filter(n => n.readAt && !n.clickedAt).length;
      case 'unread':
        return notifications.filter(n => !n.readAt).length;
      default:
        return notifications.length;
    }
  };

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate && onNavigate('notifications')}
        >
          <Text style={styles.backButtonText}>← Inbox</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📤 Sent</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.activeFilterTab]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            All ({total})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'clicked' && styles.activeFilterTab]}
          onPress={() => setFilter('clicked')}
        >
          <Text style={[styles.filterText, filter === 'clicked' && styles.activeFilterText]}>
            Clicked
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'read' && styles.activeFilterTab]}
          onPress={() => setFilter('read')}
        >
          <Text style={[styles.filterText, filter === 'read' && styles.activeFilterText]}>
            Read
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'unread' && styles.activeFilterTab]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.activeFilterText]}>
            Not Read
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading sent notifications...</Text>
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📤</Text>
          <Text style={styles.emptyTitle}>No Sent Notifications</Text>
          <Text style={styles.emptyText}>
            Notifications you send will appear here so you can track their delivery status.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
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
    padding: 8,
  },
  backButtonText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  activeFilterTab: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  filterText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontWeight: '600',
  },
  activeFilterText: {
    color: '#FFD700',
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
  urgentCard: {
    backgroundColor: 'rgba(185, 28, 28, 0.2)',
    borderColor: '#dc2626',
    borderWidth: 2,
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
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFD700',
    flex: 1,
  },
  recipientName: {
    fontSize: 13,
    color: 'rgba(255, 215, 0, 0.8)',
    marginBottom: 6,
    fontStyle: 'italic',
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
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  trackingContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  trackingText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 2,
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

export default NotificationOutboxScreen;
