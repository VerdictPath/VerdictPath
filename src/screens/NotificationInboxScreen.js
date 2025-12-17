import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform, TextInput } from 'react-native';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';

const pirateShipBackground = require('../../assets/images/pirate-notification-ship.png');

const NOTIFICATION_TYPES = [
  { key: 'all', label: 'All', icon: '📬' },
  { key: 'case_update', label: 'Case Updates', icon: '📋' },
  { key: 'appointment_reminder', label: 'Appointments', icon: '📅' },
  { key: 'payment_notification', label: 'Payments', icon: '💰' },
  { key: 'document_request', label: 'Documents', icon: '📄' },
  { key: 'system_alert', label: 'System Alerts', icon: '⚙️' },
];

const getNotificationTypeIcon = (type) => {
  switch (type) {
    case 'case_update':
    case 'new_information':
    case 'status_update_request':
    case 'deadline_reminder':
      return '📋';
    case 'appointment_request':
    case 'appointment_reminder':
      return '📅';
    case 'payment_notification':
    case 'disbursement_complete':
      return '💰';
    case 'document_request':
      return '📄';
    case 'system_alert':
      return '⚙️';
    case 'task_assigned':
      return '✅';
    case 'message':
      return '💬';
    default:
      return '🔔';
  }
};

const NotificationInboxScreen = ({ user, onNavigate, onNotificationPress }) => {
  const { notifications, isLoading, refreshNotifications, markAllAsRead, unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState('inbox');
  const [readFilter, setReadFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    refreshNotifications();
    
    autoRefreshInterval.current = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshNotifications();
    setRefreshing(false);
  };

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.is_read);
    if (unreadNotifications.length === 0) {
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
    if (readFilter === 'unread' && notification.is_read) return false;
    if (readFilter === 'read' && !notification.is_read) return false;
    
    if (typeFilter !== 'all') {
      const notificationType = notification.type || notification.notification_type;
      if (typeFilter === 'case_update') {
        if (!['case_update', 'new_information', 'status_update_request', 'deadline_reminder'].includes(notificationType)) return false;
      } else if (typeFilter === 'appointment_reminder') {
        if (!['appointment_reminder', 'appointment_request'].includes(notificationType)) return false;
      } else if (notificationType !== typeFilter) {
        return false;
      }
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const title = (notification.subject || notification.title || '').toLowerCase();
      const body = (notification.body || '').toLowerCase();
      const sender = (notification.sender_name || '').toLowerCase();
      if (!title.includes(query) && !body.includes(query) && !sender.includes(query)) {
        return false;
      }
    }
    
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
    const notificationType = item.type || item.notification_type;
    const typeIcon = getNotificationTypeIcon(notificationType);
    
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
        <View style={styles.notificationRow}>
          <View style={styles.typeIconContainer}>
            <Text style={styles.typeIcon}>{typeIcon}</Text>
          </View>
          <View style={styles.notificationContent}>
            <View style={styles.notificationHeader}>
              <Text 
                style={[
                  styles.notificationTitle, 
                  isUrgent && styles.urgentTitle,
                  !item.is_read && styles.unreadTitle
                ]} 
                numberOfLines={1}
              >
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
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.key === typeFilter);

  const renderContent = () => (
    <View style={styles.contentContainer}>
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

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            📥 Inbox
          </Text>
          {unreadCount > 0 && (
            <View style={styles.tabBadge}>
              <Text style={styles.tabBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbox' && styles.activeTab]}
          onPress={() => {
            setActiveTab('outbox');
            onNavigate && onNavigate('notification-outbox');
          }}
        >
          <Text style={[styles.tabText, activeTab === 'outbox' && styles.activeTabText]}>
            📤 Sent
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications..."
          placeholderTextColor="rgba(255, 255, 255, 0.5)"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            style={styles.clearSearchButton}
            onPress={() => setSearchQuery('')}
          >
            <Text style={styles.clearSearchText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={styles.typeDropdownButton}
          onPress={() => setShowTypeDropdown(!showTypeDropdown)}
        >
          <Text style={styles.typeDropdownText}>
            {selectedType?.icon} {selectedType?.label}
          </Text>
          <Text style={styles.dropdownArrow}>{showTypeDropdown ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        <View style={styles.readFilterContainer}>
          {['all', 'unread', 'read'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[styles.readFilterButton, readFilter === filter && styles.activeReadFilter]}
              onPress={() => setReadFilter(filter)}
            >
              <Text style={[styles.readFilterText, readFilter === filter && styles.activeReadFilterText]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {showTypeDropdown && (
        <View style={styles.typeDropdownMenu}>
          {NOTIFICATION_TYPES.map((type) => (
            <TouchableOpacity
              key={type.key}
              style={[styles.typeDropdownItem, typeFilter === type.key && styles.activeTypeDropdownItem]}
              onPress={() => {
                setTypeFilter(type.key);
                setShowTypeDropdown(false);
              }}
            >
              <Text style={styles.typeDropdownItemText}>
                {type.icon} {type.label}
              </Text>
              {typeFilter === type.key && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actionButtonContainer}>
        {user?.userType === 'individual' && (
          <TouchableOpacity
            style={styles.sendNotificationButton}
            onPress={() => onNavigate && onNavigate('individual-send-notification')}
          >
            <Text style={styles.sendNotificationText}>📨 Compose</Text>
          </TouchableOpacity>
        )}
        {notifications.filter(n => !n.is_read).length > 0 && (
          <TouchableOpacity
            style={styles.markAllReadButton}
            onPress={handleMarkAllAsRead}
            disabled={markingAllRead}
          >
            <Text style={styles.markAllReadText}>
              {markingAllRead ? '✓ Marking...' : '✓ Mark All Read'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

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
            {searchQuery 
              ? `No notifications matching "${searchQuery}"`
              : readFilter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : readFilter === 'read'
                ? "No read notifications yet."
                : typeFilter !== 'all'
                ? `No ${selectedType?.label.toLowerCase()} found.`
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

      <View style={styles.autoRefreshIndicator}>
        <Text style={styles.autoRefreshText}>Auto-refreshes every 30 seconds</Text>
      </View>
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(26, 26, 26, 0.88)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  tabText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  tabBadge: {
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  clearSearchButton: {
    marginLeft: 10,
    padding: 8,
  },
  clearSearchText: {
    color: '#FFD700',
    fontSize: 16,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  typeDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  typeDropdownText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownArrow: {
    color: '#FFD700',
    marginLeft: 8,
    fontSize: 10,
  },
  typeDropdownMenu: {
    backgroundColor: 'rgba(26, 26, 26, 0.95)',
    marginHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
    overflow: 'hidden',
  },
  typeDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  activeTypeDropdownItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
  },
  typeDropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  checkmark: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  readFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  readFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  activeReadFilter: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  readFilterText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontWeight: '500',
  },
  activeReadFilterText: {
    color: '#FFD700',
    fontWeight: '700',
  },
  actionButtonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(26, 26, 26, 0.75)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  sendNotificationButton: {
    backgroundColor: 'rgba(30, 58, 95, 0.9)',
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  markAllReadButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 16,
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
  urgentCard: {
    borderColor: '#dc3545',
    borderWidth: 2,
    backgroundColor: 'rgba(220, 53, 69, 0.15)',
  },
  urgentBanner: {
    backgroundColor: '#dc3545',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationRow: {
    flexDirection: 'row',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  typeIcon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  unreadTitle: {
    fontWeight: '700',
    color: '#FFD700',
  },
  urgentTitle: {
    color: '#ff6b6b',
  },
  unreadBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
    marginLeft: 8,
  },
  senderName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clickedLabel: {
    fontSize: 11,
    color: '#4ade80',
    fontWeight: '600',
  },
  readLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFD700',
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 22,
  },
  autoRefreshIndicator: {
    backgroundColor: 'rgba(26, 26, 26, 0.85)',
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  autoRefreshText: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.4)',
  },
});

export default NotificationInboxScreen;
