// src/screens/LawFirmActivityDashboardScreen.jsx - NEW FILE

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import GlassCard from '../components/GlassCard';
import StatCard from '../components/StatCard';
import { lawFirmTheme } from '../styles/lawFirmTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const { width } = Dimensions.get('window');

const LawFirmActivityDashboardScreen = ({ user, onBack, onNavigateToUser }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today'); // 'today', 'week', 'month', 'all'

  useEffect(() => {
    loadActivitySummary();
  }, [timeFilter]);

  const loadActivitySummary = async () => {
    try {
      setLoading(true);
      
      const dateFilters = getDateFilters(timeFilter);
      const queryString = new URLSearchParams(dateFilters).toString();
      
      const response = await apiRequest(
        `${API_ENDPOINTS.LAWFIRM_ACTIVITY.GET_SUMMARY}?${queryString}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${user.token}` },
        }
      );

      setSummary(response.summary);
    } catch (error) {
      console.error('[ActivityDashboard] Load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDateFilters = (filter) => {
    const now = new Date();
    const filters = {};

    switch (filter) {
      case 'today':
        filters.startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filters.startDate = weekAgo.toISOString();
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        filters.startDate = monthAgo.toISOString();
        break;
      // 'all' returns no filters
    }

    return filters;
  };

  const categoryIcons = {
    user: '👤',
    client: '👥',
    document: '📄',
    financial: '💰',
    communication: '📨',
    case: '⚖️',
    settings: '⚙️',
    security: '🔒',
  };

  const categoryColors = {
    user: lawFirmTheme.colors.accentBlue,
    client: lawFirmTheme.colors.lightBlue,
    document: lawFirmTheme.colors.gold,
    financial: '#10B981',
    communication: '#8B5CF6',
    case: lawFirmTheme.colors.accentBlue,
    settings: lawFirmTheme.colors.mediumGray,
    security: '#EF4444',
  };

  if (loading || !summary) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            lawFirmTheme.colors.deepNavy,
            lawFirmTheme.colors.midnightBlue,
          ]}
          style={styles.background}
        />
        <Text style={styles.loadingText}>Loading activity data...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          lawFirmTheme.colors.deepNavy,
          lawFirmTheme.colors.midnightBlue,
          lawFirmTheme.colors.professionalBlue,
        ]}
        style={styles.background}
      />

      {/* Header */}
      <BlurView intensity={20} style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Analytics</Text>
          <View style={{ width: 60 }} />
        </View>
      </BlurView>

      {/* Time Filter */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['today', 'week', 'month', 'all'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                timeFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setTimeFilter(filter)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  timeFilter === filter && styles.filterChipTextActive,
                ]}
              >
                {filter === 'today' ? 'Today' : 
                 filter === 'week' ? 'Last 7 Days' :
                 filter === 'month' ? 'Last 30 Days' : 'All Time'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Total Activities */}
        <GlassCard variant="dark" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Activities</Text>
          <Text style={styles.totalValue}>
            {summary.totalActivities.toLocaleString()}
          </Text>
        </GlassCard>

        {/* Activities by Category */}
        <Text style={styles.sectionTitle}>Activity Breakdown</Text>
        <View style={styles.categoryGrid}>
          {summary.activitiesByCategory.map((category) => (
            <CategoryCard
              key={category.id}
              name={category.id}
              count={category.count}
              icon={categoryIcons[category.id] || '📊'}
              color={categoryColors[category.id] || lawFirmTheme.colors.accentBlue}
            />
          ))}
        </View>

        {/* Top Users */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Most Active Users</Text>
        </View>
        {summary.topUsers.map((userActivity, index) => (
          <UserActivityCard
            key={userActivity.id || index}
            userName={userActivity.userName}
            userEmail={userActivity.userEmail}
            activityCount={userActivity.count}
            rank={index + 1}
            onPress={() => onNavigateToUser && onNavigateToUser(userActivity.id)}
          />
        ))}

        {summary.topUsers.length === 0 && (
          <GlassCard variant="light" style={styles.emptyCard}>
            <Text style={styles.emptyText}>No activity data for this period</Text>
          </GlassCard>
        )}

        {/* Recent Activities */}
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {summary.recentActivities.slice(0, 10).map((activity, index) => (
          <ActivityLogCard key={activity.id || index} activity={activity} />
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const CategoryCard = ({ name, count, icon, color }) => (
  <GlassCard variant="dark" style={styles.categoryCard}>
    <LinearGradient
      colors={[color + '40', color + '10']}
      style={styles.categoryIconBg}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
    </LinearGradient>
    <Text style={styles.categoryCount}>{count}</Text>
    <Text style={styles.categoryName}>{name}</Text>
  </GlassCard>
);

const UserActivityCard = ({ userName, userEmail, activityCount, rank, onPress }) => {
  const rankColors = {
    1: lawFirmTheme.colors.gold,
    2: lawFirmTheme.colors.silver,
    3: '#CD7F32', // Bronze
  };

  return (
    <GlassCard variant="dark" onPress={onPress} style={styles.userActivityCard}>
      <View style={styles.userActivityContent}>
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: rankColors[rank] || lawFirmTheme.colors.accentBlue },
          ]}
        >
          <Text style={styles.rankText}>#{rank}</Text>
        </View>

        <View style={styles.userActivityInfo}>
          <Text style={styles.userActivityName}>{userName}</Text>
          <Text style={styles.userActivityEmail}>{userEmail}</Text>
        </View>

        <View style={styles.activityCountBadge}>
          <Text style={styles.activityCountText}>{activityCount}</Text>
          <Text style={styles.activityCountLabel}>actions</Text>
        </View>
      </View>
    </GlassCard>
  );
};

const ActivityLogCard = ({ activity }) => {
  const actionIcons = {
    user_created: '➕',
    user_updated: '✏️',
    user_deactivated: '🚫',
    user_login: '🔓',
    client_viewed: '👁️',
    document_uploaded: '📤',
    document_downloaded: '📥',
    notification_sent: '📨',
    disbursement_initiated: '💸',
  };

  const getTimeAgo = (timestamp) => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <GlassCard variant="medium" style={styles.activityLogCard}>
      <View style={styles.activityLogContent}>
        <Text style={styles.activityIcon}>
          {actionIcons[activity.action] || '📊'}
        </Text>
        
        <View style={styles.activityLogInfo}>
          <Text style={styles.activityUserName}>{activity.userName}</Text>
          <Text style={styles.activityAction}>
            {activity.action.replace(/_/g, ' ')}
          </Text>
          {activity.targetName && (
            <Text style={styles.activityTarget}>→ {activity.targetName}</Text>
          )}
        </View>

        <Text style={styles.activityTime}>{getTimeAgo(activity.timestamp)}</Text>
      </View>
    </GlassCard>
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
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: lawFirmTheme.colors.accentBlue,
  },
  filterChipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  totalCard: {
    padding: 30,
    alignItems: 'center',
    marginBottom: 25,
  },
  totalLabel: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  totalValue: {
    color: lawFirmTheme.colors.gold,
    fontSize: 48,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  categoryCard: {
    width: (width - 55) / 2,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 32,
  },
  categoryCount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryName: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userActivityCard: {
    padding: 16,
    marginBottom: 12,
  },
  userActivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userActivityInfo: {
    flex: 1,
  },
  userActivityName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  userActivityEmail: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 13,
  },
  activityCountBadge: {
    alignItems: 'center',
  },
  activityCountText: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 24,
    fontWeight: '700',
  },
  activityCountLabel: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 11,
    fontWeight: '600',
  },
  activityLogCard: {
    padding: 14,
    marginBottom: 10,
  },
  activityLogContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  activityLogInfo: {
    flex: 1,
  },
  activityUserName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  activityAction: {
    color: lawFirmTheme.colors.lightGray,
    fontSize: 14,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  activityTarget: {
    color: lawFirmTheme.colors.accentBlue,
    fontSize: 13,
    fontStyle: 'italic',
  },
  activityTime: {
    color: lawFirmTheme.colors.mediumGray,
    fontSize: 12,
    fontWeight: '600',
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
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
});

export default LawFirmActivityDashboardScreen;