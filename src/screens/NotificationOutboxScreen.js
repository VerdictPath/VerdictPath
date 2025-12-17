import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, ImageBackground, Platform, TextInput, Modal, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

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

const NotificationOutboxScreen = ({ user, onNavigate, onNotificationPress, onViewAnalytics }) => {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const autoRefreshInterval = useRef(null);

  useEffect(() => {
    fetchSentNotifications();
    
    autoRefreshInterval.current = setInterval(() => {
      fetchSentNotifications();
    }, 30000);

    return () => {
      if (autoRefreshInterval.current) {
        clearInterval(autoRefreshInterval.current);
      }
    };
  }, []);

  const fetchSentNotifications = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_BASE_URL}/api/notifications/sent-notifications?limit=100`,
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

  const filteredNotifications = notifications.filter(notification => {
    if (statusFilter === 'clicked' && !notification.clickedAt) return false;
    if (statusFilter === 'read' && !notification.readAt) return false;
    if (statusFilter === 'unread' && notification.readAt) return false;
    
    if (typeFilter !== 'all') {
      const notificationType = notification.type || notification.notificationType;
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
      const recipient = (notification.recipientName || '').toLowerCase();
      if (!title.includes(query) && !body.includes(query) && !recipient.includes(query)) {
        return false;
      }
    }
    
    return true;
  });

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

  const formatFullTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getStatusInfo = (notification) => {
    if (notification.readAt) {
      return { 
        label: 'Read', 
        color: '#4ade80', 
        icon: '✓✓',
        bgColor: 'rgba(74, 222, 128, 0.15)',
        borderColor: '#4ade80'
      };
    }
    if (notification.clickedAt) {
      return { 
        label: 'Clicked', 
        color: '#fbbf24', 
        icon: '✓',
        bgColor: 'rgba(251, 191, 36, 0.15)',
        borderColor: '#fbbf24'
      };
    }
    if (notification.deliveredAt) {
      return { 
        label: 'Delivered', 
        color: '#9ca3af', 
        icon: '→',
        bgColor: 'rgba(156, 163, 175, 0.15)',
        borderColor: '#9ca3af'
      };
    }
    return { 
      label: 'Sent', 
      color: '#9ca3af', 
      icon: '↑',
      bgColor: 'rgba(156, 163, 175, 0.15)',
      borderColor: '#9ca3af'
    };
  };

  const openDetailModal = (notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
  };

  const renderNotificationItem = ({ item }) => {
    const isUrgent = item.isUrgent;
    const statusInfo = getStatusInfo(item);
    const notificationType = item.type || item.notificationType;
    const typeIcon = getNotificationTypeIcon(notificationType);

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          isUrgent && styles.urgentCard,
          { borderLeftWidth: 4, borderLeftColor: statusInfo.borderColor }
        ]}
        onPress={() => openDetailModal(item)}
      >
        {isUrgent && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerText}>⚠️ URGENT</Text>
          </View>
        )}
        <View style={styles.notificationRow}>
          <View style={[styles.typeIconContainer, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={styles.typeIcon}>{typeIcon}</Text>
          </View>
          <View style={styles.notificationContent}>
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
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
                <Text style={[styles.statusText, { color: statusInfo.color }]}>
                  {statusInfo.icon} {statusInfo.label}
                </Text>
              </View>
            </View>
            
            {!item.readAt && !item.clickedAt && (
              <View style={styles.notOpenedContainer}>
                <Text style={styles.notOpenedText}>📭 Not opened yet</Text>
              </View>
            )}
            
            {(item.clickedAt || item.readAt) && (
              <View style={styles.trackingContainer}>
                {item.clickedAt && (
                  <Text style={[styles.trackingText, { color: '#fbbf24' }]}>
                    ✓ Clicked {formatTimestamp(item.clickedAt)}
                  </Text>
                )}
                {item.readAt && (
                  <Text style={[styles.trackingText, { color: '#4ade80' }]}>
                    ✓✓ Read {formatTimestamp(item.readAt)}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderDetailModal = () => {
    if (!selectedNotification) return null;
    
    const statusInfo = getStatusInfo(selectedNotification);
    const isUrgent = selectedNotification.isUrgent;
    
    return (
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📤 Sent Notification</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDetailModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {isUrgent && (
                <View style={styles.modalUrgentBanner}>
                  <Text style={styles.modalUrgentText}>⚠️ URGENT NOTIFICATION</Text>
                </View>
              )}
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Subject</Text>
                <Text style={styles.detailValue}>{selectedNotification.subject || selectedNotification.title}</Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Recipient</Text>
                <Text style={styles.detailValue}>{selectedNotification.recipientName}</Text>
              </View>
              
              <View style={styles.detailSection}>
                <Text style={styles.detailLabel}>Message</Text>
                <Text style={styles.detailMessage}>{selectedNotification.body}</Text>
              </View>
              
              <View style={styles.analyticsSection}>
                <Text style={styles.analyticsSectionTitle}>📊 Delivery Analytics</Text>
                
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIcon, { backgroundColor: 'rgba(156, 163, 175, 0.2)' }]}>
                    <Text>↑</Text>
                  </View>
                  <View style={styles.analyticsInfo}>
                    <Text style={styles.analyticsLabel}>Sent</Text>
                    <Text style={styles.analyticsTime}>{formatFullTimestamp(selectedNotification.sentAt)}</Text>
                  </View>
                  <Text style={styles.analyticsCheck}>✓</Text>
                </View>
                
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIcon, { backgroundColor: selectedNotification.deliveredAt ? 'rgba(156, 163, 175, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                    <Text>→</Text>
                  </View>
                  <View style={styles.analyticsInfo}>
                    <Text style={styles.analyticsLabel}>Delivered</Text>
                    <Text style={styles.analyticsTime}>
                      {selectedNotification.deliveredAt ? formatFullTimestamp(selectedNotification.deliveredAt) : 'Pending...'}
                    </Text>
                  </View>
                  {selectedNotification.deliveredAt && <Text style={styles.analyticsCheck}>✓</Text>}
                </View>
                
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIcon, { backgroundColor: selectedNotification.clickedAt ? 'rgba(251, 191, 36, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                    <Text>👆</Text>
                  </View>
                  <View style={styles.analyticsInfo}>
                    <Text style={styles.analyticsLabel}>Clicked</Text>
                    <Text style={[styles.analyticsTime, selectedNotification.clickedAt && { color: '#fbbf24' }]}>
                      {selectedNotification.clickedAt ? formatFullTimestamp(selectedNotification.clickedAt) : 'Not clicked yet'}
                    </Text>
                  </View>
                  {selectedNotification.clickedAt && <Text style={[styles.analyticsCheck, { color: '#fbbf24' }]}>✓</Text>}
                </View>
                
                <View style={styles.analyticsRow}>
                  <View style={[styles.analyticsIcon, { backgroundColor: selectedNotification.readAt ? 'rgba(74, 222, 128, 0.2)' : 'rgba(100, 100, 100, 0.2)' }]}>
                    <Text>👁️</Text>
                  </View>
                  <View style={styles.analyticsInfo}>
                    <Text style={styles.analyticsLabel}>Read</Text>
                    <Text style={[styles.analyticsTime, selectedNotification.readAt && { color: '#4ade80' }]}>
                      {selectedNotification.readAt ? formatFullTimestamp(selectedNotification.readAt) : 'Not read yet'}
                    </Text>
                  </View>
                  {selectedNotification.readAt && <Text style={[styles.analyticsCheck, { color: '#4ade80' }]}>✓✓</Text>}
                </View>
              </View>
              
              <View style={[styles.currentStatusSection, { backgroundColor: statusInfo.bgColor, borderColor: statusInfo.borderColor }]}>
                <Text style={[styles.currentStatusText, { color: statusInfo.color }]}>
                  Current Status: {statusInfo.icon} {statusInfo.label}
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const selectedType = NOTIFICATION_TYPES.find(t => t.key === typeFilter);

  const renderContent = () => (
    <View style={styles.contentContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate && onNavigate('notifications')}
        >
          <Text style={styles.backButtonText}>← Inbox</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📤 Sent ({total})</Text>
        <TouchableOpacity
          style={styles.analyticsButton}
          onPress={() => onViewAnalytics && onViewAnalytics()}
        >
          <Text style={styles.analyticsButtonText}>📊</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search sent notifications..."
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

        <View style={styles.statusFilterContainer}>
          {[
            { key: 'all', label: 'All' },
            { key: 'read', label: '✓✓', color: '#4ade80' },
            { key: 'clicked', label: '✓', color: '#fbbf24' },
            { key: 'unread', label: '○', color: '#9ca3af' },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[styles.statusFilterButton, statusFilter === filter.key && styles.activeStatusFilter]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[
                styles.statusFilterText, 
                statusFilter === filter.key && styles.activeStatusFilterText,
                filter.color && { color: statusFilter === filter.key ? filter.color : 'rgba(255,255,255,0.6)' }
              ]}>
                {filter.label}
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

      <View style={styles.legendContainer}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#9ca3af' }]} />
          <Text style={styles.legendText}>Not opened</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#fbbf24' }]} />
          <Text style={styles.legendText}>Clicked</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4ade80' }]} />
          <Text style={styles.legendText}>Read</Text>
        </View>
      </View>

      {isLoading && notifications.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading sent notifications...</Text>
        </View>
      ) : filteredNotifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📤</Text>
          <Text style={styles.emptyTitle}>No Sent Notifications</Text>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? `No notifications matching "${searchQuery}"`
              : statusFilter !== 'all'
              ? `No ${statusFilter} notifications found.`
              : "Notifications you send will appear here so you can track their delivery status."}
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
        {renderDetailModal()}
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
  analyticsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  analyticsButtonText: {
    fontSize: 20,
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
  statusFilterContainer: {
    flexDirection: 'row',
    marginLeft: 'auto',
  },
  statusFilterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 4,
  },
  activeStatusFilter: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  statusFilterText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    fontWeight: '600',
  },
  activeStatusFilterText: {
    fontWeight: '700',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.6)',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  legendText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 11,
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
    marginBottom: 10,
  },
  urgentBannerText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  notificationRow: {
    flexDirection: 'row',
  },
  typeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  urgentTitle: {
    color: '#fca5a5',
  },
  recipientName: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 6,
  },
  notificationBody: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    lineHeight: 20,
    marginBottom: 10,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notOpenedContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notOpenedText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    fontStyle: 'italic',
  },
  trackingContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trackingText: {
    fontSize: 11,
    marginRight: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxHeight: '85%',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.3)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    color: '#FFD700',
    fontSize: 20,
  },
  modalBody: {
    padding: 16,
  },
  modalUrgentBanner: {
    backgroundColor: '#dc3545',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  modalUrgentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  detailSection: {
    marginBottom: 16,
  },
  detailLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  detailMessage: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  analyticsSection: {
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
  },
  analyticsSectionTitle: {
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
    width: 32,
    height: 32,
    borderRadius: 16,
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
  currentStatusSection: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  currentStatusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default NotificationOutboxScreen;
