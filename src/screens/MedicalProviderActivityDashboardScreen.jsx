import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const { width } = Dimensions.get('window');

const MedicalProviderActivityDashboardScreen = ({ 
  user, 
  onBack, 
  onNavigateToUser,
  onNavigateToHIPAAReport 
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');

  useEffect(() => {
    loadActivitySummary();
  }, [timeFilter]);

  const loadActivitySummary = async () => {
    try {
      setLoading(true);
      
      const dateFilters = getDateFilters(timeFilter);
      const queryString = new URLSearchParams(dateFilters).toString();
      
      const response = await apiRequest(
        `${API_ENDPOINTS.MEDICAL_PROVIDER_ACTIVITY.GET_SUMMARY}?${queryString}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`,
          },
        }
      );

      setSummary(response.summary);
    } catch (error) {
      console.error('[MedicalActivityDashboard] Load error:', error);
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
    }

    return filters;
  };

  const categoryIcons = {
    user: '👤',
    patient: '🏥',
    medical_record: '📋',
    document: '📄',
    financial: '💰',
    communication: '📨',
    treatment: '💊',
    compliance: '✅',
    settings: '⚙️',
    security: '🔒',
  };

  const sensitivityColors = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#f44336',
    critical: '#D32F2F',
    unknown: '#9E9E9E',
  };

  const actionIcons = {
    user_created: '➕',
    user_login: '🔓',
    user_updated: '✏️',
    user_deactivated: '🚫',
    patient_viewed: '👁️',
    patient_phi_accessed: '🔐',
    medical_record_viewed: '📋',
    medical_record_updated: '✏️',
    medical_record_created: '📝',
    document_uploaded: '📤',
    document_downloaded: '📥',
    document_viewed: '👁️',
    prescription_created: '💊',
    treatment_plan_created: '📝',
    notification_sent: '📨',
    bill_negotiation_initiated: '💰',
    settings_updated: '⚙️',
    hipaa_training_completed: '✅',
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📊 Activity Dashboard</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading activity data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📊 Activity Dashboard</Text>
        <TouchableOpacity onPress={onNavigateToHIPAAReport} style={styles.hipaaButton}>
          <Text style={styles.hipaaButtonText}>🔒 HIPAA</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        {['today', 'week', 'month', 'all'].map((filter) => (
          <TouchableOpacity
            key={filter}
            style={[styles.filterChip, timeFilter === filter && styles.filterChipActive]}
            onPress={() => setTimeFilter(filter)}
          >
            <Text style={[styles.filterChipText, timeFilter === filter && styles.filterChipTextActive]}>
              {filter === 'today' ? 'Today' : 
               filter === 'week' ? '7 Days' :
               filter === 'month' ? '30 Days' : 'All'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Total Activities Card */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Activities</Text>
          <Text style={styles.totalValue}>{summary?.totalActivities || 0}</Text>
        </View>

        {/* HIPAA Risk Assessment */}
        {summary?.activitiesBySensitivity && summary.activitiesBySensitivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 HIPAA Risk Assessment</Text>
            <View style={styles.sensitivityGrid}>
              {summary.activitiesBySensitivity.map((item, index) => (
                <View key={item.sensitivity_level || index} style={styles.sensitivityCard}>
                  <View style={[styles.sensitivityDot, { backgroundColor: sensitivityColors[item.sensitivity_level] || '#9E9E9E' }]} />
                  <Text style={styles.sensitivityCount}>{item.count || 0}</Text>
                  <Text style={styles.sensitivityLabel}>
                    {item.sensitivity_level === 'low' ? 'Low Risk' :
                     item.sensitivity_level === 'medium' ? 'Medium' :
                     item.sensitivity_level === 'high' ? 'High Risk' :
                     item.sensitivity_level === 'critical' ? 'Critical' : 'Unknown'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Critical Actions Alert */}
        {summary?.criticalActions && summary.criticalActions.length > 0 && (
          <View style={styles.alertCard}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{summary.criticalActions.length} Critical Actions</Text>
              <Text style={styles.alertDescription}>Require audit review for HIPAA compliance</Text>
            </View>
            <TouchableOpacity style={styles.alertButton} onPress={onNavigateToHIPAAReport}>
              <Text style={styles.alertButtonText}>View →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Activity by Category */}
        {summary?.activitiesByCategory && summary.activitiesByCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 Activity by Category</Text>
            <View style={styles.categoryGrid}>
              {summary.activitiesByCategory.map((category, index) => (
                <View key={category.action_category || index} style={styles.categoryCard}>
                  <Text style={styles.categoryIcon}>{categoryIcons[category.action_category] || '📊'}</Text>
                  <Text style={styles.categoryCount}>{category.count || 0}</Text>
                  <Text style={styles.categoryName}>{(category.action_category || 'unknown').replace(/_/g, ' ')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Most Active Staff */}
        {summary?.topUsers && summary.topUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Most Active Staff</Text>
            {summary.topUsers.map((userActivity, index) => (
              <TouchableOpacity
                key={userActivity.user_id || index}
                style={styles.staffCard}
                onPress={() => onNavigateToUser && onNavigateToUser(userActivity.user_id)}
              >
                <View style={[styles.rankBadge, index === 0 && styles.rankBadgeFirst]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{userActivity.user_name || 'Unknown'}</Text>
                  <Text style={styles.staffEmail}>{userActivity.user_email}</Text>
                  <Text style={styles.staffRole}>{(userActivity.user_role || 'staff').replace(/_/g, ' ')}</Text>
                </View>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityCount}>{userActivity.count}</Text>
                  <Text style={styles.activityLabel}>actions</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recent Activity */}
        {summary?.recentActivities && summary.recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
            {summary.recentActivities.slice(0, 10).map((activity, index) => (
              <View key={activity.id || index} style={styles.activityCard}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>{actionIcons[activity.action] || '📊'}</Text>
                  {activity.sensitivity_level && (
                    <View style={[styles.sensitivityIndicator, { backgroundColor: sensitivityColors[activity.sensitivity_level] }]} />
                  )}
                </View>
                <View style={styles.activityInfo}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityUserName}>{activity.user_name}</Text>
                    {activity.user_role && (
                      <Text style={styles.activityUserRole}>({activity.user_role})</Text>
                    )}
                  </View>
                  <Text style={styles.activityAction}>{(activity.action || 'activity').replace(/_/g, ' ')}</Text>
                  {activity.target_name && (
                    <Text style={styles.activityTarget}>→ {activity.target_name}</Text>
                  )}
                  {activity.patient_name && (
                    <Text style={styles.activityPatient}>Patient: {activity.patient_name}</Text>
                  )}
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityTime}>{getTimeAgo(activity.created_at)}</Text>
                  {activity.audit_required && (
                    <Text style={styles.auditBadge}>⚠️ Audit</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5dc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.primary,
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#d4a574',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerPlaceholder: {
    width: 60,
  },
  hipaaButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  hipaaButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  totalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#d4a574',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sensitivityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sensitivityCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sensitivityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  sensitivityCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  sensitivityLabel: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff9800',
  },
  alertIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#e65100',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#bf360c',
  },
  alertButton: {
    backgroundColor: '#ff9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  alertButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: (width - 56) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  categoryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rankBadgeFirst: {
    backgroundColor: '#d4a574',
  },
  rankText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityBadge: {
    alignItems: 'center',
  },
  activityCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  activityLabel: {
    fontSize: 11,
    color: '#999',
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  activityIconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  activityIcon: {
    fontSize: 24,
  },
  sensitivityIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityUserName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 6,
  },
  activityUserRole: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
  },
  activityAction: {
    fontSize: 14,
    color: '#666',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  activityTarget: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  activityPatient: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4,
  },
  auditBadge: {
    fontSize: 10,
    backgroundColor: '#fff3e0',
    color: '#ff9800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontWeight: '700',
  },
});

export default MedicalProviderActivityDashboardScreen;
