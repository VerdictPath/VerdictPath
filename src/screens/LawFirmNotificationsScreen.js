import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { theme } from '../styles/theme';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationInboxScreen from './NotificationInboxScreen';
import NotificationOutboxScreen from './NotificationOutboxScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import LawFirmSendNotificationScreen from './LawFirmSendNotificationScreen';
import LawFirmNotificationAnalyticsScreen from './LawFirmNotificationAnalyticsScreen';
import NotificationSettingsScreen from './NotificationSettingsScreen';

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

  if (activeTab === 'analytics') {
    return (
      <LawFirmNotificationAnalyticsScreen
        user={user}
        onBack={() => setActiveTab('inbox')}
        embedded={true}
      />
    );
  }

  if (activeTab === 'settings') {
    return (
      <NotificationSettingsScreen
        user={user}
        onBack={() => setActiveTab('inbox')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notification Center</Text>
          <TouchableOpacity onPress={() => setActiveTab('settings')} style={styles.settingsButton}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarScroll} contentContainerStyle={styles.tabBarContent}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'inbox' && styles.activeTab]}
          onPress={() => setActiveTab('inbox')}
        >
          <Text style={styles.tabIcon}>📥</Text>
          <Text style={[styles.tabText, activeTab === 'inbox' && styles.activeTabText]}>
            Inbox {unreadCount > 0 ? `(${unreadCount})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'outbox' && styles.activeTab]}
          onPress={() => setActiveTab('outbox')}
        >
          <Text style={styles.tabIcon}>📤</Text>
          <Text style={[styles.tabText, activeTab === 'outbox' && styles.activeTabText]}>
            Sent
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, styles.composeTab, activeTab === 'compose' && styles.activeTab]}
          onPress={() => setActiveTab('compose')}
        >
          <Text style={styles.tabIcon}>✏️</Text>
          <Text style={[styles.tabText, styles.composeTabText, activeTab === 'compose' && styles.activeTabText]}>
            Compose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'analytics' && styles.activeTab]}
          onPress={() => setActiveTab('analytics')}
        >
          <Text style={styles.tabIcon}>📊</Text>
          <Text style={[styles.tabText, activeTab === 'analytics' && styles.activeTabText]}>
            Tracking
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
    backgroundColor: theme.lawFirm.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.primaryDark,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  settingsButton: {
    paddingVertical: 4,
    paddingLeft: 12,
  },
  settingsIcon: {
    fontSize: 20,
  },
  tabBarScroll: {
    backgroundColor: theme.lawFirm.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
    flexGrow: 0,
  },
  tabBarContent: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  activeTab: {
    backgroundColor: theme.lawFirm.primary,
  },
  tabIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  composeTab: {
    backgroundColor: theme.lawFirm.info + '20',
  },
  composeTabText: {
    color: theme.lawFirm.info,
  },
  content: {
    flex: 1,
  },
});

export default LawFirmNotificationsScreen;
