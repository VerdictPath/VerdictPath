import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { lawFirmTheme as theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const LawFirmNotificationAnalyticsScreen = ({ user, onBack }) => {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState('7days');

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await apiRequest(`${API_ENDPOINTS.NOTIFICATIONS.ANALYTICS}?timeRange=${timeRange}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      if (response.success) {
        setAnalytics(response.analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  };

  const calculatePercentage = (value, total) => {
    if (!total || total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  if (isLoading && !analytics) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Analytics</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Analytics</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '7days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('7days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '7days' && styles.timeRangeTextActive]}>
            7 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '30days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('30days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '30days' && styles.timeRangeTextActive]}>
            30 Days
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeRangeButton, timeRange === '90days' && styles.timeRangeButtonActive]}
          onPress={() => setTimeRange('90days')}
        >
          <Text style={[styles.timeRangeText, timeRange === '90days' && styles.timeRangeTextActive]}>
            90 Days
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      >
        {/* Overview Stats */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{analytics?.totalSent || 0}</Text>
              <Text style={styles.statLabel}>Total Sent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#27ae60' }]}>
                {analytics?.totalDelivered || 0}
              </Text>
              <Text style={styles.statLabel}>Delivered</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#3498db' }]}>
                {analytics?.totalRead || 0}
              </Text>
              <Text style={styles.statLabel}>Read</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={[styles.statValue, { color: '#9b59b6' }]}>
                {analytics?.totalClicked || 0}
              </Text>
              <Text style={styles.statLabel}>Clicked</Text>
            </View>
          </View>
        </View>

        {/* Engagement Rates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Engagement Rates</Text>
          
          <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateLabel}>Delivery Rate</Text>
              <Text style={styles.ratePercentage}>
                {calculatePercentage(analytics?.totalDelivered, analytics?.totalSent)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculatePercentage(analytics?.totalDelivered, analytics?.totalSent)}%`,
                    backgroundColor: '#27ae60'
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateLabel}>Read Rate</Text>
              <Text style={styles.ratePercentage}>
                {calculatePercentage(analytics?.totalRead, analytics?.totalDelivered)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculatePercentage(analytics?.totalRead, analytics?.totalDelivered)}%`,
                    backgroundColor: '#3498db'
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
              <Text style={styles.rateLabel}>Click Rate</Text>
              <Text style={styles.ratePercentage}>
                {calculatePercentage(analytics?.totalClicked, analytics?.totalRead)}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${calculatePercentage(analytics?.totalClicked, analytics?.totalRead)}%`,
                    backgroundColor: '#9b59b6'
                  }
                ]}
              />
            </View>
          </View>
        </View>

        {/* By Type */}
        {analytics?.byType && analytics.byType.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By Notification Type</Text>
            {analytics.byType.map((item, index) => (
              <View key={index} style={styles.typeCard}>
                <View style={styles.typeHeader}>
                  <Text style={styles.typeLabel}>
                    {item.notification_type === 'deadline_reminder' ? '⏰ Deadline' :
                     item.notification_type === 'task_reminder' ? '📋 Task' :
                     item.notification_type === 'document_request' ? '📄 Document' :
                     item.notification_type === 'appointment_reminder' ? '📅 Appointment' :
                     '📢 General'}
                  </Text>
                  <Text style={styles.typeCount}>{item.count} sent</Text>
                </View>
                <View style={styles.typeStats}>
                  <Text style={styles.typeStat}>
                    ✓ {item.delivered || 0} delivered
                  </Text>
                  <Text style={styles.typeStat}>
                    👁 {item.read || 0} read
                  </Text>
                  <Text style={styles.typeStat}>
                    🖱 {item.clicked || 0} clicked
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#d4a574',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 60,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 10,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  timeRangeButtonActive: {
    backgroundColor: theme.colors.primary,
  },
  timeRangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  timeRangeTextActive: {
    color: '#fff',
  },
  scrollContent: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  overviewSection: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  rateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ratePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  typeCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  typeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  typeCount: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  typeStats: {
    flexDirection: 'row',
    gap: 16,
  },
  typeStat: {
    fontSize: 13,
    color: '#666',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default LawFirmNotificationAnalyticsScreen;
