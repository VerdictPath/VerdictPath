// Medical Provider Activity Dashboard - PostgreSQL adapted

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
import MedicalGlassCard from '../components/MedicalGlassCard';
import MedicalStatCard from '../components/MedicalStatCard';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest } from '../config/api';

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
        `/api/medicalprovider/activity/summary?${queryString}`,
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

  const categoryColors = {
    user: medicalProviderTheme.colors.accentTeal,
    patient: medicalProviderTheme.colors.medicalTeal,
    medical_record: medicalProviderTheme.colors.medicalBlue,
    document: medicalProviderTheme.colors.prescriptionGreen,
    financial: medicalProviderTheme.colors.healthy,
    communication: medicalProviderTheme.colors.accentTeal,
    treatment: medicalProviderTheme.colors.prescriptionGreen,
    compliance: medicalProviderTheme.colors.stable,
    settings: medicalProviderTheme.colors.darkGray,
    security: medicalProviderTheme.colors.emergencyRed,
  };

  const sensitivityColors = {
    low: medicalProviderTheme.colors.healthy,
    medium: medicalProviderTheme.colors.stable,
    high: medicalProviderTheme.colors.warning,
    critical: medicalProviderTheme.colors.critical,
    unknown: medicalProviderTheme.colors.darkGray,
  };

  if (loading || !summary) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            medicalProviderTheme.colors.clinicalWhite,
            medicalProviderTheme.colors.lightGray,
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
          medicalProviderTheme.colors.clinicalWhite,
          medicalProviderTheme.colors.lightGray,
          medicalProviderTheme.colors.clinicalWhite,
        ]}
        style={styles.background}
      />

      <LinearGradient
        colors={[
          medicalProviderTheme.colors.deepTeal,
          medicalProviderTheme.colors.clinicalTeal,
        ]}
        style={styles.headerGradient}
      >
        <BlurView intensity={10} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={onBack}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Activity Analytics</Text>
            <TouchableOpacity onPress={onNavigateToHIPAAReport}>
              <Text style={styles.hipaaButton}>🔒 HIPAA</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </LinearGradient>

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
        <MedicalGlassCard variant="white" style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Activities</Text>
          <Text style={styles.totalValue}>
            {summary.totalActivities.toLocaleString()}
          </Text>
        </MedicalGlassCard>

        {summary.activitiesBySensitivity && summary.activitiesBySensitivity.length > 0 && (
          <View style={styles.sensitivitySection}>
            <Text style={styles.sectionTitle}>HIPAA Risk Assessment</Text>
            <View style={styles.sensitivityGrid}>
              {summary.activitiesBySensitivity.map((item) => (
                <SensitivityCard
                  key={item.sensitivity_level || 'unknown'}
                  level={item.sensitivity_level || 'unknown'}
                  count={item.count || 0}
                  color={sensitivityColors[item.sensitivity_level] || medicalProviderTheme.colors.darkGray}
                />
              ))}
            </View>
          </View>
        )}

        {summary.criticalActions && summary.criticalActions.length > 0 && (
          <MedicalGlassCard variant="mint" style={styles.alertCard}>
            <View style={styles.alertHeader}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={styles.alertTitle}>
                {summary.criticalActions.length} Critical Actions Requiring Audit
              </Text>
            </View>
            <Text style={styles.alertDescription}>
              High-sensitivity activities that require administrative review for HIPAA compliance.
            </Text>
            <TouchableOpacity 
              style={styles.alertButton}
              onPress={onNavigateToHIPAAReport}
            >
              <Text style={styles.alertButtonText}>View HIPAA Report →</Text>
            </TouchableOpacity>
          </MedicalGlassCard>
        )}

        {summary.activitiesByCategory && summary.activitiesByCategory.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Activity Breakdown</Text>
            <View style={styles.categoryGrid}>
              {summary.activitiesByCategory.map((category) => (
                <CategoryCard
                  key={category.action_category || 'unknown'}
                  name={category.action_category || 'unknown'}
                  count={category.count || 0}
                  icon={categoryIcons[category.action_category] || '📊'}
                  color={categoryColors[category.action_category] || medicalProviderTheme.colors.accentTeal}
                />
              ))}
            </View>
          </>
        )}

        {summary.topUsers && summary.topUsers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Most Active Staff</Text>
            </View>
            {summary.topUsers.map((userActivity, index) => (
              <StaffActivityCard
                key={userActivity.user_id || index}
                userId={userActivity.user_id}
                userName={userActivity.user_name}
                userEmail={userActivity.user_email}
                userRole={userActivity.user_role}
                activityCount={userActivity.count}
                rank={index + 1}
                onPress={() => onNavigateToUser && onNavigateToUser(userActivity.user_id)}
              />
            ))}
          </>
        )}

        {summary.recentActivities && summary.recentActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            {summary.recentActivities.slice(0, 10).map((activity, index) => (
              <ActivityLogCard key={activity.id || index} activity={activity} />
            ))}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const SensitivityCard = ({ level, count, color }) => {
  const labels = {
    low: 'Low Risk',
    medium: 'Medium Risk',
    high: 'High Risk',
    critical: 'Critical',
    unknown: 'Data Missing',
  };

  const icons = {
    low: '✓',
    medium: '◐',
    high: '⚠',
    critical: '⚠️',
    unknown: '❓',
  };

  return (
    <MedicalGlassCard variant="white" style={styles.sensitivityCard}>
      <View style={[styles.sensitivityIconBg, { backgroundColor: color + '30' }]}>
        <Text style={styles.sensitivityIcon}>{icons[level]}</Text>
      </View>
      <Text style={[styles.sensitivityCount, { color }]}>{count}</Text>
      <Text style={styles.sensitivityLabel}>{labels[level]}</Text>
    </MedicalGlassCard>
  );
};

const CategoryCard = ({ name, count, icon, color }) => (
  <MedicalGlassCard variant="white" style={styles.categoryCard}>
    <LinearGradient
      colors={[color + '30', color + '10']}
      style={styles.categoryIconBg}
    >
      <Text style={styles.categoryIcon}>{icon}</Text>
    </LinearGradient>
    <Text style={styles.categoryCount}>{count}</Text>
    <Text style={styles.categoryName}>{name.replace(/_/g, ' ')}</Text>
  </MedicalGlassCard>
);

const StaffActivityCard = ({ 
  userId,
  userName, 
  userEmail, 
  userRole, 
  activityCount, 
  rank, 
  onPress 
}) => {
  const rankColors = {
    1: medicalProviderTheme.colors.accentTeal,
    2: medicalProviderTheme.colors.prescriptionGreen,
    3: medicalProviderTheme.colors.medicalBlue,
  };

  const roleIcons = {
    admin: '👑',
    physician: '🩺',
    nurse: '💉',
    staff: '👤',
    billing: '💳',
  };

  return (
    <MedicalGlassCard variant="white" onPress={onPress} style={styles.staffActivityCard}>
      <View style={styles.staffActivityContent}>
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: rankColors[rank] || medicalProviderTheme.colors.accentTeal },
          ]}
        >
          <Text style={styles.rankText}>#{rank}</Text>
        </View>

        <View style={styles.staffActivityInfo}>
          <View style={styles.staffNameRow}>
            <Text style={styles.staffActivityName}>{userName}</Text>
            <Text style={styles.staffRoleIcon}>{roleIcons[userRole] || '👤'}</Text>
          </View>
          <Text style={styles.staffActivityEmail}>{userEmail}</Text>
          <Text style={styles.staffRole}>{(userRole || 'staff').replace(/_/g, ' ')}</Text>
        </View>

        <View style={styles.activityCountBadge}>
          <Text style={styles.activityCountText}>{activityCount}</Text>
          <Text style={styles.activityCountLabel}>actions</Text>
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const ActivityLogCard = ({ activity }) => {
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

  const sensitivityColors = {
    low: medicalProviderTheme.colors.healthy,
    medium: medicalProviderTheme.colors.stable,
    high: medicalProviderTheme.colors.warning,
    critical: medicalProviderTheme.colors.critical,
    unknown: medicalProviderTheme.colors.darkGray,
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
    <MedicalGlassCard variant="white" style={styles.activityLogCard}>
      <View style={styles.activityLogContent}>
        <View style={styles.activityIconContainer}>
          <Text style={styles.activityIcon}>
            {actionIcons[activity.action] || '📊'}
          </Text>
          {activity.sensitivity_level && (
            <View
              style={[
                styles.sensitivityDot,
                { backgroundColor: sensitivityColors[activity.sensitivity_level] },
              ]}
            />
          )}
        </View>
        
        <View style={styles.activityLogInfo}>
          <View style={styles.activityLogHeader}>
            <Text style={styles.activityUserName}>{activity.user_name}</Text>
            {activity.user_role && (
              <Text style={styles.activityUserRole}>
                ({(activity.user_role || 'staff').replace(/_/g, ' ')})
              </Text>
            )}
          </View>
          <Text style={styles.activityAction}>
            {(activity.action || 'activity').replace(/_/g, ' ')}
          </Text>
          {activity.target_name && (
            <Text style={styles.activityTarget}>→ {activity.target_name}</Text>
          )}
          {activity.patient_name && (
            <Text style={styles.activityPatient}>
              Patient: {activity.patient_name}
            </Text>
          )}
        </View>

        <View style={styles.activityMeta}>
          <Text style={styles.activityTime}>{getTimeAgo(activity.created_at)}</Text>
          {activity.audit_required && (
            <Text style={styles.auditRequiredBadge}>⚠️ Audit</Text>
          )}
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: medicalProviderTheme.colors.clinicalWhite,
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  loadingText: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
  headerGradient: {
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  hipaaButton: {
    color: medicalProviderTheme.colors.mintGreen,
    fontSize: 14,
    fontWeight: '700',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: medicalProviderTheme.colors.lightGray,
    marginRight: 10,
    borderWidth: 1,
    borderColor: medicalProviderTheme.colors.accentTeal + '30',
  },
  filterChipActive: {
    backgroundColor: medicalProviderTheme.colors.accentTeal,
    borderColor: medicalProviderTheme.colors.accentTeal,
  },
  filterChipText: {
    color: medicalProviderTheme.colors.deepTeal,
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
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  totalValue: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 48,
    fontWeight: '700',
  },
  sensitivitySection: {
    marginBottom: 25,
  },
  sensitivityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sensitivityCard: {
    width: (width - 55) / 2,
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  sensitivityIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  sensitivityIcon: {
    fontSize: 24,
  },
  sensitivityCount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  sensitivityLabel: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertCard: {
    padding: 20,
    marginBottom: 25,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  alertTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
  },
  alertDescription: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 15,
  },
  alertButton: {
    backgroundColor: medicalProviderTheme.colors.accentTeal,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
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
    padding: 18,
    alignItems: 'center',
    marginBottom: 15,
  },
  categoryIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryCount: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryName: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    textAlign: 'center',
  },
  staffActivityCard: {
    padding: 16,
    marginBottom: 12,
  },
  staffActivityContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  staffActivityInfo: {
    flex: 1,
  },
  staffNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  staffActivityName: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 17,
    fontWeight: '700',
    marginRight: 8,
  },
  staffRoleIcon: {
    fontSize: 18,
  },
  staffActivityEmail: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 13,
    marginBottom: 4,
  },
  staffRole: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  activityCountBadge: {
    alignItems: 'center',
  },
  activityCountText: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 24,
    fontWeight: '700',
  },
  activityCountLabel: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 11,
    fontWeight: '600',
  },
  activityLogCard: {
    padding: 14,
    marginBottom: 10,
  },
  activityLogContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityIconContainer: {
    position: 'relative',
    marginRight: 15,
  },
  activityIcon: {
    fontSize: 28,
  },
  sensitivityDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  activityLogInfo: {
    flex: 1,
  },
  activityLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityUserName: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 15,
    fontWeight: '700',
    marginRight: 6,
  },
  activityUserRole: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 12,
    fontStyle: 'italic',
  },
  activityAction: {
    color: medicalProviderTheme.colors.darkGray,
    fontSize: 14,
    textTransform: 'capitalize',
    marginBottom: 3,
  },
  activityTarget: {
    color: medicalProviderTheme.colors.accentTeal,
    fontSize: 13,
    fontWeight: '600',
  },
  activityPatient: {
    color: medicalProviderTheme.colors.medicalBlue,
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 2,
  },
  activityMeta: {
    alignItems: 'flex-end',
  },
  activityTime: {
    color: medicalProviderTheme.colors.mediumGray,
    fontSize: 12,
    marginBottom: 4,
  },
  auditRequiredBadge: {
    backgroundColor: medicalProviderTheme.colors.warning + '20',
    color: medicalProviderTheme.colors.warning,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
});

export default MedicalProviderActivityDashboardScreen;
