import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import { theme } from '../styles/theme';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { API_BASE_URL } from '../config/api';

const { width } = Dimensions.get('window');

const getThemeForUserType = (userType) => {
  if (userType === 'medical_provider' || userType === 'medicalprovider') {
    return {
      primary: medicalProviderTheme.colors.primary,
      headerBg: medicalProviderTheme.colors.primary,
      headerText: '#FFFFFF',
      background: medicalProviderTheme.colors.background,
      surface: medicalProviderTheme.colors.surface,
      text: medicalProviderTheme.colors.text,
      textSecondary: medicalProviderTheme.colors.textSecondary,
      border: medicalProviderTheme.colors.border,
      accent: '#4CAF50',
    };
  }
  return {
    primary: '#1E3A5F',
    headerBg: '#1E3A5F',
    headerText: '#FFFFFF',
    background: '#F5F7FA',
    surface: '#FFFFFF',
    text: '#1E3A5F',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    accent: '#D4AF37',
  };
};

const NotificationAnalyticsScreen = ({ user, onBack }) => {
  const userType = user?.userType || user?.type;
  const themeColors = useMemo(() => getThemeForUserType(userType), [userType]);
  const styles = useMemo(() => createStyles(themeColors), [themeColors]);

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [timeRange, setTimeRange] = useState('30days');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_BASE_URL}/api/notifications/analytics?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.error || 'Failed to load analytics');
      }
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderTimeRangeSelector = () => (
    <View style={styles.timeRangeContainer}>
      {['7days', '30days', '90days'].map((range) => (
        <TouchableOpacity
          key={range}
          style={[
            styles.timeRangeButton,
            timeRange === range && styles.timeRangeButtonActive
          ]}
          onPress={() => setTimeRange(range)}
        >
          <Text style={[
            styles.timeRangeText,
            timeRange === range && styles.timeRangeTextActive
          ]}>
            {range === '7days' ? '7 Days' : range === '30days' ? '30 Days' : '90 Days'}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStatCard = (title, value, subtitle, icon) => (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderPercentageBar = (label, percentage, color) => (
    <View style={styles.percentageBarContainer}>
      <View style={styles.percentageBarHeader}>
        <Text style={styles.percentageBarLabel}>{label}</Text>
        <Text style={styles.percentageBarValue}>{percentage}%</Text>
      </View>
      <View style={styles.percentageBarTrack}>
        <View 
          style={[
            styles.percentageBarFill, 
            { width: `${Math.min(percentage, 100)}%`, backgroundColor: color }
          ]} 
        />
      </View>
    </View>
  );

  const renderTypeBreakdown = () => {
    if (!analytics?.byType) return null;

    const typeLabels = {
      caseUpdate: { label: 'Case Updates', icon: '📋', color: '#3B82F6' },
      appointmentReminder: { label: 'Appointments', icon: '📅', color: '#8B5CF6' },
      paymentNotification: { label: 'Payments', icon: '💰', color: '#10B981' },
      documentRequest: { label: 'Documents', icon: '📄', color: '#F59E0B' },
      systemAlert: { label: 'System Alerts', icon: '⚙️', color: '#6B7280' },
      taskAssigned: { label: 'Tasks Assigned', icon: '✅', color: '#EC4899' },
      taskReminder: { label: 'Task Reminders', icon: '⏰', color: '#EF4444' },
      deadlineReminder: { label: 'Deadlines', icon: '🎯', color: '#14B8A6' },
      general: { label: 'General', icon: '📬', color: '#8B5CF6' }
    };

    const typeEntries = Object.entries(analytics.byType)
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a);

    if (typeEntries.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No notifications sent in this period</Text>
        </View>
      );
    }

    const maxCount = Math.max(...typeEntries.map(([, count]) => count));

    return (
      <View style={styles.typeBreakdownContainer}>
        {typeEntries.map(([type, count]) => {
          const config = typeLabels[type] || { label: type, icon: '📬', color: '#6B7280' };
          const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

          return (
            <View key={type} style={styles.typeRow}>
              <View style={styles.typeInfo}>
                <Text style={styles.typeIcon}>{config.icon}</Text>
                <Text style={styles.typeLabel}>{config.label}</Text>
              </View>
              <View style={styles.typeBarContainer}>
                <View 
                  style={[
                    styles.typeBar, 
                    { width: `${percentage}%`, backgroundColor: config.color }
                  ]} 
                />
              </View>
              <Text style={styles.typeCount}>{count}</Text>
            </View>
          );
        })}
      </View>
    );
  };

  const renderUrgentComparison = () => {
    if (!analytics?.urgentVsNormal) return null;

    const { urgent, normal } = analytics.urgentVsNormal;

    return (
      <View style={styles.comparisonContainer}>
        <View style={styles.comparisonCard}>
          <View style={[styles.comparisonHeader, { backgroundColor: '#EF4444' }]}>
            <Text style={styles.comparisonHeaderText}>⚠️ URGENT</Text>
          </View>
          <View style={styles.comparisonBody}>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{urgent.sent}</Text>
              <Text style={styles.comparisonLabel}>Sent</Text>
            </View>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{urgent.readRate}%</Text>
              <Text style={styles.comparisonLabel}>Read Rate</Text>
            </View>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{urgent.clickRate}%</Text>
              <Text style={styles.comparisonLabel}>Click Rate</Text>
            </View>
          </View>
        </View>

        <View style={styles.comparisonCard}>
          <View style={[styles.comparisonHeader, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.comparisonHeaderText}>📬 NORMAL</Text>
          </View>
          <View style={styles.comparisonBody}>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{normal.sent}</Text>
              <Text style={styles.comparisonLabel}>Sent</Text>
            </View>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{normal.readRate}%</Text>
              <Text style={styles.comparisonLabel}>Read Rate</Text>
            </View>
            <View style={styles.comparisonStat}>
              <Text style={styles.comparisonValue}>{normal.clickRate}%</Text>
              <Text style={styles.comparisonLabel}>Click Rate</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Analytics</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Analytics</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchAnalytics}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderTimeRangeSelector()}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📈 Overview</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('Total Sent', analytics?.totalSent || 0, null, '📤')}
            {renderStatCard('Total Read', analytics?.totalRead || 0, null, '👁️')}
            {renderStatCard('Total Clicked', analytics?.totalClicked || 0, null, '👆')}
            {renderStatCard('All-Time Sent', analytics?.allTime?.totalSent || 0, null, '📊')}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Performance Rates</Text>
          {renderPercentageBar('Click-Through Rate', analytics?.clickRate || 0, '#10B981')}
          {renderPercentageBar('Read Rate', analytics?.readRate || 0, '#3B82F6')}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏱️ Response Times</Text>
          <View style={styles.timeStatsContainer}>
            <View style={styles.timeStat}>
              <Text style={styles.timeStatIcon}>👆</Text>
              <Text style={styles.timeStatValue}>
                {analytics?.avgTimeToClick || 'N/A'}
              </Text>
              <Text style={styles.timeStatLabel}>Avg. Time to Click</Text>
            </View>
            <View style={styles.timeStat}>
              <Text style={styles.timeStatIcon}>👁️</Text>
              <Text style={styles.timeStatValue}>
                {analytics?.avgTimeToRead || 'N/A'}
              </Text>
              <Text style={styles.timeStatLabel}>Avg. Time to Read</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📬 By Notification Type</Text>
          {renderTypeBreakdown()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚠️ Urgent vs Normal</Text>
          {renderUrgentComparison()}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🏴‍☠️ Track your notification performance to better reach your clients!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const createStyles = (themeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: themeColors.headerBg,
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: themeColors.headerText,
    fontSize: 16,
  },
  headerTitle: {
    color: themeColors.headerText,
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: themeColors.textSecondary,
    fontSize: 14,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  timeRangeButtonActive: {
    backgroundColor: themeColors.primary,
  },
  timeRangeText: {
    color: themeColors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  timeRangeTextActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.text,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: (width - 48) / 2,
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  statTitle: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  statSubtitle: {
    fontSize: 10,
    color: themeColors.textSecondary,
    marginTop: 2,
  },
  percentageBarContainer: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  percentageBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  percentageBarLabel: {
    fontSize: 14,
    color: themeColors.text,
    fontWeight: '500',
  },
  percentageBarValue: {
    fontSize: 14,
    color: themeColors.primary,
    fontWeight: 'bold',
  },
  percentageBarTrack: {
    height: 12,
    backgroundColor: themeColors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  percentageBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  timeStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 20,
  },
  timeStat: {
    alignItems: 'center',
  },
  timeStatIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  timeStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  timeStatLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  typeBreakdownContainer: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
  },
  typeIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  typeLabel: {
    fontSize: 12,
    color: themeColors.text,
  },
  typeBarContainer: {
    flex: 1,
    height: 16,
    backgroundColor: themeColors.border,
    borderRadius: 8,
    marginHorizontal: 8,
    overflow: 'hidden',
  },
  typeBar: {
    height: '100%',
    borderRadius: 8,
  },
  typeCount: {
    width: 40,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  emptyState: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyStateText: {
    color: themeColors.textSecondary,
    fontSize: 14,
  },
  comparisonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonCard: {
    width: (width - 48) / 2,
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  comparisonHeader: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  comparisonHeaderText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  comparisonBody: {
    padding: 12,
  },
  comparisonStat: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  comparisonLabel: {
    fontSize: 12,
    color: themeColors.textSecondary,
  },
  comparisonValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: themeColors.text,
  },
  footer: {
    backgroundColor: themeColors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  footerText: {
    color: themeColors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NotificationAnalyticsScreen;
