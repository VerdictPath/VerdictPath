import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationInboxScreen from './NotificationInboxScreen';
import NotificationOutboxScreen from './NotificationOutboxScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import LawFirmSendNotificationScreen from './LawFirmSendNotificationScreen';

const LawFirmNotificationsScreen = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedNotificationId, setSelectedNotificationId] = useState(null);
  const [detailIsOutbox, setDetailIsOutbox] = useState(false);
  const { unreadCount } = useNotifications();

  const handleViewNotification = (notificationId, isOutbox = false) => {
    setSelectedNotificationId(notificationId);
    setDetailIsOutbox(isOutbox);
    setActiveTab('detail');
  };

  const handleBackFromDetail = () => {
    setSelectedNotificationId(null);
    setActiveTab(detailIsOutbox ? 'outbox' : 'inbox');
  };

  const handleComposeSent = () => {
    setActiveTab('outbox');
  };

  if (activeTab === 'detail' && selectedNotificationId) {
    return (
      <NotificationDetailScreen
        user={user}
        notificationId={selectedNotificationId}
        onBack={handleBackFromDetail}
        isOutbox={detailIsOutbox}
      />
    );
  }

  if (activeTab === 'compose') {
    return (
      <LawFirmSendNotificationScreen
        user={user}
        onBack={() => setActiveTab('inbox')}
        onSent={handleComposeSent}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            Inbox {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbox' && styles.activeTab]}
          onPress={() => setActiveTab('outbox')}
        >
          <Text style={[styles.tabText, activeTab === 'outbox' && styles.activeTabText]}>
            Outbox
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, styles.composeTab, activeTab === 'compose' && styles.activeTab]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={[styles.tabText, styles.composeTabText, activeTab === 'compose' && styles.activeTabText]}>
            + Compose
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'inbox' && (
          <NotificationInboxScreen
            user={user}
            onViewNotification={(id) => handleViewNotification(id, false)}
            embedded={true}
          />
        )}
        {activeTab === 'outbox' && (
          <NotificationOutboxScreen
            user={user}
            onViewNotification={(id) => handleViewNotification(id, true)}
            embedded={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  header: {
    backgroundColor: theme.lawFirm.headerBackground || '#1a1a2e',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.lawFirm.cardBackground || '#252540',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  activeTab: {
    backgroundColor: theme.lawFirm.accent || '#4a90d9',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  composeTab: {
    backgroundColor: 'rgba(74, 144, 217, 0.2)',
  },
  composeTabText: {
    color: theme.lawFirm.accent || '#4a90d9',
  },
  content: {
    flex: 1,
  },
});

export default LawFirmNotificationsScreen;
