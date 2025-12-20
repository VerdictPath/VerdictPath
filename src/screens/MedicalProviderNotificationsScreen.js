import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { useNotifications } from '../contexts/NotificationContext';
import NotificationInboxScreen from './NotificationInboxScreen';
import NotificationOutboxScreen from './NotificationOutboxScreen';
import NotificationDetailScreen from './NotificationDetailScreen';
import MedicalProviderSendNotificationScreen from './MedicalProviderSendNotificationScreen';

const MedicalProviderNotificationsScreen = ({ user, onBack }) => {
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
      <MedicalProviderSendNotificationScreen
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
    backgroundColor: medicalProviderTheme.colors.background,
  },
  header: {
    backgroundColor: medicalProviderTheme.colors.primary,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.primaryDark,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: medicalProviderTheme.colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  activeTab: {
    backgroundColor: medicalProviderTheme.colors.cardBackground,
    borderColor: medicalProviderTheme.colors.cardBackground,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activeTabText: {
    color: medicalProviderTheme.colors.primary,
  },
  composeTab: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  composeTabText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
});

export default MedicalProviderNotificationsScreen;
