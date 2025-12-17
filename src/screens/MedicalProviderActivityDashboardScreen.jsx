import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  useWindowDimensions,
} from 'react-native';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const MedicalProviderActivityDashboardScreen = ({ 
  user, 
  onBack, 
  onNavigateToUser,
  onNavigateToHIPAAReport 
}) => {
  const { width } = useWindowDimensions();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('today');
  const [patientSearch, setPatientSearch] = useState('');

  const isCompact = width < 500;
  const cardWidth = isCompact ? '100%' : (width - 56) / 2;

  useEffect(() => {
    loadActivitySummary();
  }, [timeFilter, patientSearch]);

  const loadActivitySummary = async () => {
    try {
      setLoading(true);
      console.log('[MedicalActivityDashboard] Loading summary with token:', user?.token ? 'Present' : 'Missing');
      
      const dateFilters = getDateFilters(timeFilter);
      if (patientSearch.trim()) {
        dateFilters.patientName = patientSearch.trim();
      }
      const queryString = new URLSearchParams(dateFilters).toString();
      const url = `${API_ENDPOINTS.MEDICAL_PROVIDER_ACTIVITY.GET_SUMMARY}?${queryString}`;
      console.log('[MedicalActivityDashboard] API URL:', url);
      
      const response = await apiRequest(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`,
        },
      });

      console.log('[MedicalActivityDashboard] Summary loaded successfully:', response);
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
    low: medicalProviderTheme.colors.healthy,
    medium: medicalProviderTheme.colors.warning,
    high: medicalProviderTheme.colors.critical,
    critical: medicalProviderTheme.colors.emergencyRed,
    unknown: medicalProviderTheme.colors.mediumGray,
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
          <Text style={styles.headerTitle}>📊 User Activity</Text>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={medicalProviderTheme.colors.clinicalTeal} />
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
        <Text style={styles.headerTitle}>📊 User Activity</Text>
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

      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by patient name..."
          placeholderTextColor={medicalProviderTheme.colors.mediumGray}
          value={patientSearch}
          onChangeText={setPatientSearch}
        />
        {patientSearch.length > 0 && (
          <TouchableOpacity onPress={() => setPatientSearch('')} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Activities</Text>
          <Text style={styles.totalValue}>{summary?.totalActivities || 0}</Text>
        </View>

        {summary?.activitiesBySensitivity && summary.activitiesBySensitivity.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔒 HIPAA Risk Assessment</Text>
            <View style={[styles.cardGrid, isCompact && styles.cardGridCompact]}>
              {summary.activitiesBySensitivity.map((item, index) => (
                <View key={item.sensitivity_level || index} style={[styles.sensitivityCard, { width: cardWidth }]}>
                  <View style={[styles.sensitivityDot, { backgroundColor: sensitivityColors[item.sensitivity_level] || sensitivityColors.unknown }]} />
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

        {summary?.activitiesByCategory && summary.activitiesByCategory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📁 Activity by Category</Text>
            <View style={[styles.cardGrid, isCompact && styles.cardGridCompact]}>
              {summary.activitiesByCategory.map((category, index) => (
                <View key={category.action_category || index} style={[styles.categoryCard, { width: cardWidth }]}>
                  <Text style={styles.categoryIcon}>
                    {categoryIcons[category.action_category] || '📊'}
                  </Text>
                  <Text style={styles.categoryCount}>{category.count || 0}</Text>
                  <Text style={styles.categoryName}>
                    {(category.action_category || 'Other').replace(/_/g, ' ')}
                  </Text>
                  {category.unique_users && (
                    <Text style={styles.categoryUsers}>
                      {category.unique_users} user{category.unique_users > 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {summary?.topUsers && summary.topUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>👥 Top Staff Activity</Text>
            {summary.topUsers.slice(0, 5).map((staffMember, index) => (
              <TouchableOpacity
                key={staffMember.user_id || index}
                style={styles.staffCard}
                onPress={() => onNavigateToUser && onNavigateToUser(staffMember.user_id)}
              >
                <View style={[styles.rankBadge, index === 0 && styles.rankBadgeFirst]}>
                  <Text style={styles.rankText}>#{index + 1}</Text>
                </View>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>{staffMember.user_name || 'Unknown User'}</Text>
                  <Text style={styles.staffEmail}>{staffMember.user_email || ''}</Text>
                  <Text style={styles.staffRole}>{staffMember.user_role || 'Staff'}</Text>
                </View>
                <View style={styles.activityBadge}>
                  <Text style={styles.activityCount}>{staffMember.count || 0}</Text>
                  <Text style={styles.activityLabel}>actions</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {summary?.recentActivities && summary.recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
            {summary.recentActivities.slice(0, 10).map((activity, index) => (
              <View key={activity.id || index} style={styles.activityCard}>
                <View style={styles.activityIconContainer}>
                  <Text style={styles.activityIcon}>
                    {actionIcons[activity.action] || '📋'}
                  </Text>
                  <View style={[
                    styles.sensitivityIndicator,
                    { backgroundColor: sensitivityColors[activity.sensitivity_level] || sensitivityColors.unknown }
                  ]} />
                </View>
                <View style={styles.activityInfo}>
                  <View style={styles.activityHeader}>
                    <Text style={styles.activityUserName}>{activity.user_name || 'Unknown'}</Text>
                    <Text style={styles.activityUserRole}>({activity.user_role || 'staff'})</Text>
                  </View>
                  <Text style={styles.activityAction}>
                    {(activity.action || '').replace(/_/g, ' ')}
                  </Text>
                  {activity.target_name && (
                    <Text style={styles.activityTarget}>{activity.target_name}</Text>
                  )}
                  {activity.patient_name && (
                    <Text style={styles.activityPatient}>Patient: {activity.patient_name}</Text>
                  )}
                </View>
                <View style={styles.activityMeta}>
                  <Text style={styles.activityTime}>{getTimeAgo(activity.created_at)}</Text>
                  {activity.audit_required && (
                    <Text style={styles.auditBadge}>AUDIT</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.offWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.lg,
    backgroundColor: medicalProviderTheme.colors.deepTeal,
    ...medicalProviderTheme.shadows.header,
  },
  backButton: {
    paddingVertical: medicalProviderTheme.spacing.sm,
    paddingHorizontal: medicalProviderTheme.spacing.md,
  },
  backText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: medicalProviderTheme.colors.clinicalWhite,
  },
  headerPlaceholder: {
    width: 60,
  },
  hipaaButton: {
    backgroundColor: medicalProviderTheme.colors.clinicalTeal,
    paddingHorizontal: medicalProviderTheme.spacing.md,
    paddingVertical: medicalProviderTheme.spacing.sm,
    borderRadius: medicalProviderTheme.borderRadius.small,
  },
  hipaaButtonText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: medicalProviderTheme.spacing.lg,
    fontSize: 16,
    color: medicalProviderTheme.colors.darkGray,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.md,
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.lightGray,
    gap: medicalProviderTheme.spacing.sm,
  },
  filterChip: {
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.sm,
    borderRadius: medicalProviderTheme.borderRadius.round,
    backgroundColor: medicalProviderTheme.colors.lightGray,
  },
  filterChipActive: {
    backgroundColor: medicalProviderTheme.colors.clinicalTeal,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: medicalProviderTheme.colors.darkGray,
  },
  filterChipTextActive: {
    color: medicalProviderTheme.colors.clinicalWhite,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.md,
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.lightGray,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: medicalProviderTheme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    backgroundColor: medicalProviderTheme.colors.offWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    paddingHorizontal: medicalProviderTheme.spacing.md,
    fontSize: 14,
    color: medicalProviderTheme.colors.charcoal,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.lightGray,
  },
  clearButton: {
    marginLeft: medicalProviderTheme.spacing.sm,
    padding: medicalProviderTheme.spacing.sm,
  },
  clearButtonText: {
    fontSize: 16,
    color: medicalProviderTheme.colors.mediumGray,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: medicalProviderTheme.spacing.lg,
  },
  totalCard: {
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.large,
    padding: medicalProviderTheme.spacing.xxl,
    alignItems: 'center',
    marginBottom: medicalProviderTheme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: medicalProviderTheme.colors.clinicalTeal,
    ...medicalProviderTheme.shadows.card,
  },
  totalLabel: {
    fontSize: 16,
    color: medicalProviderTheme.colors.darkGray,
    marginBottom: medicalProviderTheme.spacing.sm,
  },
  totalValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.deepTeal,
  },
  section: {
    marginBottom: medicalProviderTheme.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: medicalProviderTheme.spacing.md,
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: medicalProviderTheme.spacing.md,
  },
  cardGridCompact: {
    flexDirection: 'column',
  },
  sensitivityCard: {
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    alignItems: 'center',
    ...medicalProviderTheme.shadows.card,
  },
  sensitivityDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: medicalProviderTheme.spacing.sm,
  },
  sensitivityCount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: medicalProviderTheme.spacing.xs,
  },
  sensitivityLabel: {
    fontSize: 12,
    color: medicalProviderTheme.colors.darkGray,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    marginBottom: medicalProviderTheme.spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: medicalProviderTheme.colors.warning,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: medicalProviderTheme.spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 13,
    color: '#BF360C',
  },
  alertButton: {
    backgroundColor: medicalProviderTheme.colors.warning,
    paddingHorizontal: medicalProviderTheme.spacing.lg,
    paddingVertical: medicalProviderTheme.spacing.sm,
    borderRadius: medicalProviderTheme.borderRadius.small,
  },
  alertButtonText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontWeight: '700',
    fontSize: 14,
  },
  categoryCard: {
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    alignItems: 'center',
    ...medicalProviderTheme.shadows.card,
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: medicalProviderTheme.spacing.sm,
  },
  categoryCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.clinicalTeal,
    marginBottom: medicalProviderTheme.spacing.xs,
  },
  categoryName: {
    fontSize: 12,
    color: medicalProviderTheme.colors.darkGray,
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  categoryUsers: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
    marginTop: medicalProviderTheme.spacing.xs,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.lg,
    marginBottom: medicalProviderTheme.spacing.md,
    ...medicalProviderTheme.shadows.card,
  },
  rankBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: medicalProviderTheme.colors.clinicalTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: medicalProviderTheme.spacing.md,
  },
  rankBadgeFirst: {
    backgroundColor: medicalProviderTheme.colors.deepTeal,
  },
  rankText: {
    color: medicalProviderTheme.colors.clinicalWhite,
    fontSize: 14,
    fontWeight: 'bold',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.charcoal,
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 13,
    color: medicalProviderTheme.colors.darkGray,
    marginBottom: 2,
  },
  staffRole: {
    fontSize: 12,
    color: medicalProviderTheme.colors.clinicalTeal,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityBadge: {
    alignItems: 'center',
  },
  activityCount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.clinicalTeal,
  },
  activityLabel: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
    borderRadius: medicalProviderTheme.borderRadius.medium,
    padding: medicalProviderTheme.spacing.md,
    marginBottom: medicalProviderTheme.spacing.md,
    ...medicalProviderTheme.shadows.card,
  },
  activityIconContainer: {
    position: 'relative',
    marginRight: medicalProviderTheme.spacing.md,
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
    borderColor: medicalProviderTheme.colors.clinicalWhite,
  },
  activityInfo: {
    flex: 1,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: medicalProviderTheme.spacing.xs,
  },
  activityUserName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: medicalProviderTheme.colors.charcoal,
    marginRight: medicalProviderTheme.spacing.sm,
  },
  activityUserRole: {
    fontSize: 12,
    color: medicalProviderTheme.colors.mediumGray,
    fontStyle: 'italic',
  },
  activityAction: {
    fontSize: 14,
    color: medicalProviderTheme.colors.darkGray,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  activityTarget: {
    fontSize: 13,
    color: medicalProviderTheme.colors.clinicalTeal,
    fontWeight: '600',
  },
  activityPatient: {
    fontSize: 12,
    color: medicalProviderTheme.colors.darkGray,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    fontSize: 12,
    color: medicalProviderTheme.colors.mediumGray,
    marginBottom: medicalProviderTheme.spacing.xs,
  },
  auditBadge: {
    fontSize: 10,
    backgroundColor: '#FFF3E0',
    color: medicalProviderTheme.colors.warning,
    paddingHorizontal: medicalProviderTheme.spacing.sm,
    paddingVertical: 2,
    borderRadius: medicalProviderTheme.borderRadius.small,
    fontWeight: '700',
    overflow: 'hidden',
  },
});

export default MedicalProviderActivityDashboardScreen;
