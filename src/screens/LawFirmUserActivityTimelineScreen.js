// src/screens/LawFirmUserActivityTimelineScreen.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { lawFirmTheme } from '../styles/lawFirmTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const LawFirmUserActivityTimelineScreen = ({ 
  user, 
  targetUserId, 
  targetUserName,
  onBack 
}) => {
  const [activities, setActivities] = useState([]);
  const [targetUser, setTargetUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadUserTimeline();
  }, [page]);

  const loadUserTimeline = async () => {
    try {
      if (page === 1) {
        setLoading(true);
      }

      const response = await apiRequest(
        `${API_ENDPOINTS.LAWFIRM_ACTIVITY.GET_USER_TIMELINE(targetUserId)}?page=${page}&limit=20`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user.token}` },
        }
      );

      if (page === 1) {
        setActivities(response.activities);
        setTargetUser(response.user);
      } else {
        setActivities(prev => [...prev, ...response.activities]);
      }

      setHasMore(response.currentPage < response.totalPages);
    } catch (error) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadUserTimeline();
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const groupActivitiesByDate = (activities) => {
    const groups = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const dateKey = date.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(activity);
    });

    return groups;
  };

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          lawFirmTheme.colors.deepNavy,
          lawFirmTheme.colors.midnightBlue,
        ]}
        style={styles.background}
      />

      {/* Header */}
      <BlurView intensity={20} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Timeline</Text>
          <View style={{ width: 60 }} />
        </View>
      </BlurView>

      {/* User Info Card */}
      {targetUser && (
        <View style={styles.glassCard}>
          <View style={styles.userInfoContent}>
            <View style={styles.userAvatar}>
              <Text style={styles.userInitials}>
                {targetUser.name.split(' ').map(n => n[0]).join('')}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{targetUser.name}</Text>
              <Text style={styles.userEmail}>{targetUser.email}</Text>
              <View style={styles.userMeta}>
                <View style={styles.userBadge}>
                  <Text style={styles.userBadgeText}>{targetUser.role}</Text>
                </View>
                <Text style={styles.userCode}>{targetUser.userCode}</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={lawFirmTheme.colors.accentBlue}
          />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
          
          if (isCloseToBottom) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {Object.entries(groupedActivities).map(([date, dayActivities]) => (
          <View key={date} style={styles.dateGroup}>
            <View style={styles.dateHeader}>
              <View style={styles.dateLine} />
              <Text style={styles.dateText}>{date}</Text>
              <View style={styles.dateLine} />
            </View>

            {dayActivities.map((activity, index) => (
              <TimelineActivityCard 
                key={activity.id || index}
                activity={activity}
                isLast={index === dayActivities.length - 1}
              />
            ))}
          </View>
        ))}

        {activities.length === 0 && !loading && (
          <View style={styles.glassCard}>
            <Text style={styles.emptyText}>No activity recorded yet</Text>
          </View>
        )}

        {loading && page === 1 && (
          <Text style={styles.loadingText}>Loading timeline...</Text>
        )}

        {loading && page > 1 && (
          <Text style={styles.loadingMoreText}>Loading more...</Text>
        )}

        {!hasMore && activities.length > 0 && (
          <Text style={styles.endText}>— End of timeline —</Text>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const TimelineActivityCard = ({ activity, isLast }) => {
  const actionIcons = {
    user_created: '➕',
    user_updated: '✏️',
    user_deactivated: '🚫',
    user_login: '🔓',
    user_logout: '🔒',
    client_viewed: '👁️',
    client_updated: '✏️',
    document_uploaded: '📤',
    document_downloaded: '📥',
    document_deleted: '🗑️',
    notification_sent: '📨',
    message_sent: '💬',
    disbursement_initiated: '💸',
    disbursement_completed: '✅',
    case_stage_updated: '📊',
    settings_updated: '⚙️',
    password_changed: '🔑',
  };

  const actionColors = {
    user: lawFirmTheme.colors.accentBlue,
    client: lawFirmTheme.colors.lightBlue,
    document: lawFirmTheme.colors.gold,
    financial: '#10B981',
    communication: '#8B5CF6',
    case: lawFirmTheme.colors.accentBlue,
    settings: lawFirmTheme.colors.mediumGray,
    security: '#EF4444',
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineLeft}>
        <View
          style={[
            styles.timelineDot,
            { backgroundColor: actionColors[activity.actionCategory] || lawFirmTheme.colors.accentBlue }
          ]}
        />
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <View style={styles.glassCard}>
        <View style={styles.activityHeader}>
          <Text style={styles.activityIcon}>
            {actionIcons[activity.action] || '📊'}
          </Text>
          <Text style={styles.activityTime}>{formatTime(activity.timestamp)}</Text>
        </View>

        <Text style={styles.activityAction}>
          {activity.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        </Text>

        {activity.targetName && (
          <View style={styles.activityTarget}>
            <Text style={styles.activityTargetLabel}>Target:</Text>
            <Text style={styles.activityTargetValue}>{activity.targetName}</Text>
          </View>
        )}

        {activity.metadata && Object.keys(activity.metadata).length > 0 && (
          <View style={styles.activityMetadata}>
            <Text style={styles.metadataLabel}>Details:</Text>
            {activity.metadata.method && (
              <Text style={styles.metadataText}>Method: {activity.metadata.method}</Text>
            )}
            {activity.metadata.path && (
              <Text style={styles.metadataText}>Path: {activity.metadata.path}</Text>
            )}
          </View>
        )}

        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: actionColors[activity.actionCategory] + '30' }
          ]}
        >
          <Text
            style={[
              styles.categoryText,
              { color: actionColors[activity.actionCategory] }
            ]}
          >
            {activity.actionCategory.toUpperCase()}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lawFirmTheme.colors.deepNavy,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(59, 130, 246, 0.2)',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userInfoCard: {
    margin: 20,
    padding: 16,
  },
  userInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: lawFirmTheme.colors.accentBlue,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  userInitials: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 14,
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userBadge: {
    backgroundColor: lawFirmTheme.colors.accentBlue + '30',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
  },
  userBadgeText: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userCode: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
  dateGroup: {
    marginBottom: 30,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  dateText: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 14,
    fontWeight: '700',
    marginHorizontal: 15,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineLeft: {
    width: 30,
    alignItems: 'center',
    marginRight: 15,
  },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: lawFirmTheme.colors.deepNavy,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginTop: 8,
  },
  activityCard: {
    flex: 1,
    padding: 15,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  activityIcon: {
    fontSize: 24,
  },
  activityTime: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    fontWeight: '600',
  },
  activityAction: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  activityTarget: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  activityTargetLabel: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 13,
    marginRight: 6,
  },
  activityTargetValue: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 13,
    fontWeight: '600',
  },
  activityMetadata: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  metadataLabel: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metadataText: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 16,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
  },
  loadingMoreText: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 20,
  },
  endText: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 30,
    fontStyle: 'italic',
  },
});

export default LawFirmUserActivityTimelineScreen;