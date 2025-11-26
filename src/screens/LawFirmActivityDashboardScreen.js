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
    user: '#6B8E99',      // Warm blue
    client: '#8B7355',    // Warm purple/brown
    document: '#D4AF37',  // Warm gold
    financial: '#5FAD56', // Success green
    communication: '#D2691E', // Warm orange
    case: '#8B6F47',      // Mahogany
    settings: '#A0826D',  // Warm gray
    security: '#8C3B2A',  // Deep maroon
  };

  if (loading || !summary) {
    return (
      <View style={styles.container}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Activity Analytics</Text>
            <View style={{ width: 60 }} />
          </View>
        </View>
        
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading activity data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Activity Analytics</Text>
          <View style={{ width: 60 }} />
        </View>
      </View>

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
        <View style={styles.glassCard}>
          <Text style={styles.totalLabel}>Total Activities</Text>
          <Text style={styles.totalValue}>
            {summary.totalActivities.toLocaleString()}
          </Text>
        </View>

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
          <View style={styles.glassCard}>
            <Text style={styles.emptyText}>No activity data for this period</Text>
          </View>
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
  <View style={styles.glassCard}>
    <LinearGradient
      colors={[color + '40', color + '10']}
      style={styles.categoryIconBg}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
    </LinearGradient>
    <Text style={styles.categoryCount}>{count}</Text>
    <Text style={styles.categoryName}>{name}</Text>
  </View>
);

const UserActivityCard = ({ userName, userEmail, activityCount, rank, onPress }) => {
  const rankColors = {
    1: '#D4AF37', // Gold
    2: '#C0C0C0', // Silver
    3: '#CD7F32', // Bronze
  };

  return (
    <View style={styles.glassCard}>
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
    </View>
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
    <View style={styles.glassCard}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4E8D8',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#F8F1E7',
    borderBottomWidth: 2,
    borderBottomColor: '#D4AF37',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: '#8B6F47',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
    letterSpacing: -0.5,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8F1E7',
    borderBottomWidth: 1,
    borderBottomColor: '#C9A961',
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FBF7F1',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  filterChipActive: {
    backgroundColor: '#D4AF37',
    borderColor: '#D4AF37',
  },
  filterChipText: {
    color: '#8B6F47',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#2C3E50',
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
    color: '#A0826D',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalValue: {
    color: '#8B6F47',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  glassCard: {
    backgroundColor: '#FBF7F1',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#D4AF37',
    borderLeftWidth: 4,
    borderLeftColor: '#D4AF37',
  },
  categoryIconBg: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryCount: {
    color: '#2C3E50',
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  categoryName: {
    color: '#A0826D',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userActivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rankText: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '700',
  },
  userActivityInfo: {
    flex: 1,
  },
  userActivityName: {
    color: '#2C3E50',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  userActivityEmail: {
    color: '#A0826D',
    fontSize: 13,
  },
  activityCountBadge: {
    alignItems: 'center',
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  activityCountText: {
    color: '#2C3E50',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  activityCountLabel: {
    color: '#2C3E50',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  activityLogContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 26,
    marginRight: 14,
  },
  activityLogInfo: {
    flex: 1,
  },
  activityUserName: {
    color: '#2C3E50',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  activityAction: {
    color: '#A0826D',
    fontSize: 14,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  activityTarget: {
    color: '#8B6F47',
    fontSize: 13,
  },
  activityTime: {
    color: '#A0826D',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    color: '#A0826D',
    fontSize: 15,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4E8D8',
  },
  loadingText: {
    color: '#8B6F47',
    fontSize: 16,
    textAlign: 'center',
  },
});

export default LawFirmActivityDashboardScreen;