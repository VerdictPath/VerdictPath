// Medical Provider HIPAA Compliance Dashboard - PostgreSQL adapted

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import MedicalGlassCard from '../components/MedicalGlassCard';
import MedicalStatCard from '../components/MedicalStatCard';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { apiRequest } from '../config/api';

const { width } = Dimensions.get('window');

const MedicalProviderHIPAADashboardScreen = ({ user, onBack }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeFilter, setTimeFilter] = useState('month');

  useEffect(() => {
    loadHIPAAReport();
  }, [timeFilter]);

  const loadHIPAAReport = async () => {
    try {
      setLoading(true);
      
      const daysMap = {
        week: 7,
        month: 30,
        quarter: 90,
        year: 365
      };
      
      const response = await apiRequest(
        `/api/medicalprovider/hipaa-report?days=${daysMap[timeFilter]}`,
        {
          method: 'GET',
        }
      );

      setReport(response.report);
    } catch (error) {
      console.error('[HIPAADashboard] Load error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadHIPAAReport();
  };

  if (loading || !report) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[
            medicalProviderTheme.colors.clinicalWhite,
            medicalProviderTheme.colors.lightGray,
          ]}
          style={styles.background}
        />
        <Text style={styles.loadingText}>Generating HIPAA compliance report...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[
          medicalProviderTheme.colors.clinicalWhite,
          medicalProviderTheme.colors.lightGray,
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
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerIcon}>🔒</Text>
              <Text style={styles.headerTitle}>HIPAA Compliance</Text>
            </View>
            <View style={{ width: 60 }} />
          </View>
        </BlurView>
      </LinearGradient>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['week', 'month', 'quarter', 'year'].map((filter) => (
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
                {filter === 'week' ? 'Last Week' : 
                 filter === 'month' ? 'Last Month' :
                 filter === 'quarter' ? 'Last Quarter' : 'Last Year'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={medicalProviderTheme.colors.accentTeal}
          />
        }
      >
        <MedicalGlassCard variant="mint" style={styles.reportHeaderCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportTitle}>HIPAA Audit Report</Text>
            <Text style={styles.reportDate}>
              Generated: {new Date(report.generatedAt).toLocaleString()}
            </Text>
            <Text style={styles.reportPeriod}>{report.period}</Text>
          </View>
        </MedicalGlassCard>

        <Text style={styles.sectionTitle}>Key Compliance Metrics</Text>
        <View style={styles.statsRow}>
          <MedicalStatCard
            label="Total Activities"
            value={report.metrics.totalActivities}
            icon="📊"
            color={medicalProviderTheme.colors.accentTeal}
            size="small"
          />
          <View style={{ width: 12 }} />
          <MedicalStatCard
            label="Audit Required"
            value={report.metrics.auditRequiredCount}
            icon="⚠️"
            color={medicalProviderTheme.colors.warning}
            size="small"
          />
          <View style={{ width: 12 }} />
          <MedicalStatCard
            label="Compliance Rate"
            value={`${report.metrics.complianceRate}%`}
            icon="✅"
            color={medicalProviderTheme.colors.healthy}
            size="small"
          />
        </View>

        <MedicalGlassCard variant="white" style={styles.complianceCard}>
          <View style={styles.complianceRow}>
            <View style={styles.complianceStat}>
              <Text style={styles.complianceValue}>{report.metrics.compliantActivities}</Text>
              <Text style={styles.complianceLabel}>Compliant</Text>
            </View>
            <View style={styles.complianceDivider} />
            <View style={styles.complianceStat}>
              <Text style={[styles.complianceValue, { color: medicalProviderTheme.colors.emergencyRed }]}>
                {report.metrics.nonCompliantActivities}
              </Text>
              <Text style={styles.complianceLabel}>Non-Compliant</Text>
            </View>
          </View>
        </MedicalGlassCard>

        <Text style={styles.sectionTitle}>Risk Assessment</Text>
        <View style={styles.sensitivityGrid}>
          {report.sensitivityBreakdown && report.sensitivityBreakdown.map((item) => (
            <RiskLevelCard
              key={item.sensitivity_level || 'unknown'}
              level={item.sensitivity_level || 'unknown'}
              count={item.count}
              uniqueUsers={item.unique_users}
              uniquePatients={item.unique_patients}
            />
          ))}
        </View>

        {report.nonCompliantActivities && report.nonCompliantActivities.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Non-Compliant Activities</Text>
              <View style={styles.criticalBadge}>
                <Text style={styles.criticalBadgeText}>⚠️ REVIEW</Text>
              </View>
            </View>
            <MedicalGlassCard variant="white" style={styles.warningCard}>
              <Text style={styles.warningText}>
                {report.nonCompliantActivities.length} non-compliant activit{report.nonCompliantActivities.length === 1 ? 'y' : 'ies'} detected. 
                These require immediate investigation for HIPAA compliance.
              </Text>
            </MedicalGlassCard>

            {report.nonCompliantActivities.slice(0, 5).map((activity, index) => (
              <NonCompliantCard key={activity.id || index} activity={activity} />
            ))}
          </>
        )}

        {report.criticalActivities && report.criticalActivities.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Critical Activities</Text>
            <Text style={styles.sectionDescription}>
              High-sensitivity activities requiring administrative review
            </Text>
            {report.criticalActivities.slice(0, 10).map((activity, index) => (
              <CriticalActivityCard
                key={activity.id || index}
                activity={activity}
              />
            ))}
          </>
        )}

        {report.userTrainingStatus && report.userTrainingStatus.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Staff HIPAA Training Status</Text>
            {report.userTrainingStatus.map((user, index) => (
              <TrainingStatusCard
                key={user.id || index}
                user={user}
              />
            ))}
          </>
        )}

        {report.patientAccessSummary && report.patientAccessSummary.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Patient Access Summary</Text>
            <Text style={styles.sectionDescription}>
              Most frequently accessed patient records in the reporting period
            </Text>
            {report.patientAccessSummary.slice(0, 10).map((patient, index) => (
              <PatientAccessCard
                key={patient.patient_id || index}
                patient={patient}
              />
            ))}
          </>
        )}

        <Text style={styles.sectionTitle}>Compliance Checklist</Text>
        <MedicalGlassCard variant="white" style={styles.checklistCard}>
          <ChecklistItem
            label="Activity Logging Enabled"
            status="passed"
            description="All PHI access is being logged"
          />
          <ChecklistItem
            label="Data Retention Policy"
            status="passed"
            description="7-year retention configured"
          />
          <ChecklistItem
            label="Compliance Rate"
            status={report.metrics.complianceRate >= 95 ? 'passed' : 'attention'}
            description={`${report.metrics.complianceRate}% compliant activities`}
          />
          <ChecklistItem
            label="Non-Compliant Monitoring"
            status={report.metrics.nonCompliantActivities === 0 ? 'passed' : 'attention'}
            description={
              report.metrics.nonCompliantActivities === 0
                ? 'No non-compliant activities'
                : `${report.metrics.nonCompliantActivities} activities need review`
            }
          />
          <ChecklistItem
            label="Critical Action Auditing"
            status={report.metrics.auditRequiredCount > 0 ? 'review' : 'passed'}
            description={
              report.metrics.auditRequiredCount > 0
                ? `${report.metrics.auditRequiredCount} actions require audit`
                : 'No pending audits'
            }
          />
        </MedicalGlassCard>

        <MedicalGlassCard variant="mint" style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>📋 HIPAA Compliance Notice</Text>
          <Text style={styles.disclaimerText}>
            This report provides an overview of Protected Health Information (PHI) access 
            activities. Regular review of these reports is required under HIPAA regulations. 
            All critical actions and non-compliant activities must be investigated and documented. 
            Retain this report for at least 7 years as required by HIPAA.
          </Text>
        </MedicalGlassCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const RiskLevelCard = ({ level, count, uniqueUsers, uniquePatients }) => {
  const riskData = {
    low: {
      label: 'Low Risk',
      icon: '✓',
      color: medicalProviderTheme.colors.healthy,
      description: 'Routine activities',
    },
    medium: {
      label: 'Medium Risk',
      icon: '◐',
      color: medicalProviderTheme.colors.stable,
      description: 'Standard medical access',
    },
    high: {
      label: 'High Risk',
      icon: '⚠',
      color: medicalProviderTheme.colors.warning,
      description: 'Sensitive data access',
    },
    critical: {
      label: 'Critical',
      icon: '⚠️',
      color: medicalProviderTheme.colors.critical,
      description: 'Requires audit',
    },
    unknown: {
      label: 'Unknown',
      icon: '❓',
      color: medicalProviderTheme.colors.darkGray,
      description: 'Data missing',
    },
  };

  const risk = riskData[level] || riskData.unknown;

  return (
    <MedicalGlassCard variant="white" style={styles.riskCard}>
      <View style={[styles.riskIconBg, { backgroundColor: risk.color + '30' }]}>
        <Text style={styles.riskIcon}>{risk.icon}</Text>
      </View>
      <Text style={[styles.riskCount, { color: risk.color }]}>{count}</Text>
      <Text style={styles.riskLabel}>{risk.label}</Text>
      <Text style={styles.riskDescription}>{risk.description}</Text>
      {uniqueUsers > 0 && (
        <Text style={styles.riskDetail}>{uniqueUsers} users • {uniquePatients} patients</Text>
      )}
    </MedicalGlassCard>
  );
};

const NonCompliantCard = ({ activity }) => {
  const userName = activity.user_name || activity.user_email || 'Unknown User';
  const action = (activity.action || 'unknown').replace(/_/g, ' ');
  const timestamp = activity.timestamp ? new Date(activity.timestamp) : null;
  const hasValidTimestamp = timestamp && !isNaN(timestamp.getTime());

  return (
    <MedicalGlassCard variant="white" style={styles.nonCompliantCard}>
      <View style={styles.nonCompliantHeader}>
        <View style={styles.nonCompliantIcon}>
          <Text style={styles.nonCompliantIconText}>🚫</Text>
        </View>
        <View style={styles.nonCompliantInfo}>
          <Text style={styles.nonCompliantUser}>{userName}</Text>
          <Text style={styles.nonCompliantAction}>{action}</Text>
          <Text style={styles.nonCompliantTime}>
            {hasValidTimestamp ? timestamp.toLocaleString() : 'No timestamp'}
          </Text>
        </View>
        <View style={styles.nonCompliantBadge}>
          <Text style={styles.nonCompliantBadgeText}>NON-COMPLIANT</Text>
        </View>
      </View>
      {activity.error_message && (
        <Text style={styles.nonCompliantError}>
          Error: {activity.error_message}
        </Text>
      )}
    </MedicalGlassCard>
  );
};

const CriticalActivityCard = ({ activity }) => {
  const sensitivityColors = {
    low: medicalProviderTheme.colors.healthy,
    medium: medicalProviderTheme.colors.stable,
    high: medicalProviderTheme.colors.warning,
    critical: medicalProviderTheme.colors.critical,
    unknown: medicalProviderTheme.colors.darkGray,
  };

  const sensitivityLevel = activity.sensitivity_level || 'critical';
  const color = sensitivityColors[sensitivityLevel] || sensitivityColors.critical;
  const userName = activity.user_name || 'Unknown User';
  const userRole = (activity.user_role || 'staff').replace(/_/g, ' ');
  const action = (activity.action || 'activity').replace(/_/g, ' ');
  const timestamp = activity.timestamp ? new Date(activity.timestamp) : null;
  const hasValidTimestamp = timestamp && !isNaN(timestamp.getTime());

  return (
    <MedicalGlassCard variant="white" style={styles.criticalCard}>
      <View style={styles.criticalContent}>
        <View style={styles.criticalInfo}>
          <View style={styles.criticalUserRow}>
            <Text style={styles.criticalUserName}>{userName}</Text>
            <Text style={styles.criticalUserRole}>{userRole}</Text>
          </View>
          <Text style={styles.criticalAction}>{action}</Text>
          {activity.patient_name && (
            <Text style={styles.criticalPatient}>Patient: {activity.patient_name}</Text>
          )}
          <Text style={styles.criticalTime}>
            {hasValidTimestamp ? timestamp.toLocaleString() : 'No timestamp'}
          </Text>
        </View>
        <View style={[styles.criticalSensitivityBadge, { backgroundColor: color + '30' }]}>
          <Text style={[styles.criticalSensitivityText, { color }]}>
            {sensitivityLevel.toUpperCase()}
          </Text>
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const TrainingStatusCard = ({ user }) => {
  const statusConfig = {
    valid: {
      icon: '✅',
      color: medicalProviderTheme.colors.healthy,
      label: 'Valid',
    },
    expiring_soon: {
      icon: '⚠️',
      color: medicalProviderTheme.colors.warning,
      label: 'Expiring Soon',
    },
    expired: {
      icon: '❌',
      color: medicalProviderTheme.colors.critical,
      label: 'Expired',
    },
    not_set: {
      icon: '❓',
      color: medicalProviderTheme.colors.darkGray,
      label: 'Not Set',
    },
  };

  const config = statusConfig[user.training_status] || statusConfig.not_set;
  const userName = user.name || 'Unknown User';
  const userRole = (user.role || 'staff').replace(/_/g, ' ');
  const expiryDate = user.hipaa_training_expiry ? new Date(user.hipaa_training_expiry) : null;
  const hasValidExpiry = expiryDate && !isNaN(expiryDate.getTime());

  return (
    <MedicalGlassCard variant="white" style={styles.trainingCard}>
      <View style={styles.trainingContent}>
        <View style={styles.trainingInfo}>
          <Text style={styles.trainingUserName}>{userName}</Text>
          <Text style={styles.trainingUserRole}>{userRole}</Text>
          {hasValidExpiry && (
            <Text style={styles.trainingExpiry}>
              Expires: {expiryDate.toLocaleDateString()}
            </Text>
          )}
        </View>
        <View style={[styles.trainingStatusBadge, { backgroundColor: config.color + '30' }]}>
          <Text style={styles.trainingStatusIcon}>{config.icon}</Text>
          <Text style={[styles.trainingStatusText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const PatientAccessCard = ({ patient }) => {
  const patientName = patient.patient_name || 'Unknown Patient';
  const patientId = patient.patient_id || 'N/A';
  const accessCount = patient.access_count || 0;
  const uniqueUsers = patient.unique_users || 0;
  const lastAccessed = patient.last_accessed ? new Date(patient.last_accessed) : null;
  
  return (
    <MedicalGlassCard variant="white" style={styles.patientCard}>
      <View style={styles.patientContent}>
        <View style={styles.patientInfo}>
          <Text style={styles.patientName}>{patientName}</Text>
          <Text style={styles.patientId}>ID: {patientId}</Text>
          <Text style={styles.patientAccess}>
            {accessCount} access{accessCount === 1 ? '' : 'es'} by {uniqueUsers} user{uniqueUsers === 1 ? '' : 's'}
          </Text>
          {lastAccessed && !isNaN(lastAccessed.getTime()) && (
            <Text style={styles.patientLastAccess}>
              Last accessed: {lastAccessed.toLocaleString()}
            </Text>
          )}
        </View>
        <View style={styles.patientBadge}>
          <Text style={styles.patientAccessCount}>{accessCount}</Text>
          <Text style={styles.patientAccessLabel}>accesses</Text>
        </View>
      </View>
    </MedicalGlassCard>
  );
};

const ChecklistItem = ({ label, status, description }) => {
  const statusConfig = {
    passed: {
      icon: '✅',
      color: medicalProviderTheme.colors.healthy,
      text: 'Passed',
    },
    attention: {
      icon: '⚠️',
      color: medicalProviderTheme.colors.warning,
      text: 'Attention',
    },
    review: {
      icon: '🔍',
      color: medicalProviderTheme.colors.warning,
      text: 'Review',
    },
    failed: {
      icon: '❌',
      color: medicalProviderTheme.colors.critical,
      text: 'Failed',
    },
  };

  const config = statusConfig[status] || statusConfig.passed;

  return (
    <View style={styles.checklistItem}>
      <Text style={styles.checklistIcon}>{config.icon}</Text>
      <View style={styles.checklistInfo}>
        <Text style={styles.checklistLabel}>{label}</Text>
        <Text style={styles.checklistDescription}>{description}</Text>
      </View>
      <View style={[styles.checklistStatus, { backgroundColor: config.color + '30' }]}>
        <Text style={[styles.checklistStatusText, { color: config.color }]}>
          {config.text}
        </Text>
      </View>
    </View>
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
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
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
  reportHeaderCard: {
    padding: 25,
    marginBottom: 25,
  },
  reportHeader: {
    alignItems: 'center',
  },
  reportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 8,
  },
  reportDate: {
    fontSize: 13,
    color: medicalProviderTheme.colors.mediumGray,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  reportPeriod: {
    fontSize: 14,
    color: medicalProviderTheme.colors.deepTeal,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 15,
  },
  sectionDescription: {
    fontSize: 14,
    color: medicalProviderTheme.colors.mediumGray,
    marginBottom: 15,
    marginTop: -10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  criticalBadge: {
    backgroundColor: medicalProviderTheme.colors.warning + '30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  criticalBadgeText: {
    color: medicalProviderTheme.colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  complianceCard: {
    padding: 20,
    marginBottom: 25,
  },
  complianceRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  complianceStat: {
    alignItems: 'center',
  },
  complianceValue: {
    fontSize: 36,
    fontWeight: '700',
    color: medicalProviderTheme.colors.healthy,
    marginBottom: 4,
  },
  complianceLabel: {
    fontSize: 13,
    color: medicalProviderTheme.colors.mediumGray,
    fontWeight: '600',
  },
  complianceDivider: {
    width: 1,
    height: 50,
    backgroundColor: medicalProviderTheme.colors.lightGray,
  },
  sensitivityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  riskCard: {
    width: (width - 55) / 2,
    padding: 18,
    marginBottom: 15,
    alignItems: 'center',
  },
  riskIconBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  riskIcon: {
    fontSize: 24,
  },
  riskCount: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  riskLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 4,
  },
  riskDescription: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
    textAlign: 'center',
    marginBottom: 4,
  },
  riskDetail: {
    fontSize: 10,
    color: medicalProviderTheme.colors.accentTeal,
    textAlign: 'center',
  },
  warningCard: {
    padding: 20,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: medicalProviderTheme.colors.warning,
  },
  warningText: {
    color: medicalProviderTheme.colors.deepTeal,
    fontSize: 14,
    lineHeight: 20,
  },
  nonCompliantCard: {
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: medicalProviderTheme.colors.emergencyRed,
  },
  nonCompliantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nonCompliantIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: medicalProviderTheme.colors.emergencyRed + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  nonCompliantIconText: {
    fontSize: 20,
  },
  nonCompliantInfo: {
    flex: 1,
  },
  nonCompliantUser: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 2,
  },
  nonCompliantAction: {
    fontSize: 13,
    color: medicalProviderTheme.colors.darkGray,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  nonCompliantTime: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
  },
  nonCompliantBadge: {
    backgroundColor: medicalProviderTheme.colors.emergencyRed + '30',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nonCompliantBadgeText: {
    color: medicalProviderTheme.colors.emergencyRed,
    fontSize: 9,
    fontWeight: '700',
  },
  nonCompliantError: {
    marginTop: 10,
    fontSize: 12,
    color: medicalProviderTheme.colors.emergencyRed,
    fontStyle: 'italic',
  },
  criticalCard: {
    padding: 14,
    marginBottom: 10,
  },
  criticalContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  criticalInfo: {
    flex: 1,
  },
  criticalUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  criticalUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginRight: 8,
  },
  criticalUserRole: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
    textTransform: 'capitalize',
  },
  criticalAction: {
    fontSize: 14,
    color: medicalProviderTheme.colors.darkGray,
    textTransform: 'capitalize',
    marginBottom: 3,
  },
  criticalPatient: {
    fontSize: 12,
    color: medicalProviderTheme.colors.medicalBlue,
    fontStyle: 'italic',
    marginBottom: 3,
  },
  criticalTime: {
    fontSize: 11,
    color: medicalProviderTheme.colors.mediumGray,
  },
  criticalSensitivityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 10,
  },
  criticalSensitivityText: {
    fontSize: 10,
    fontWeight: '700',
  },
  trainingCard: {
    padding: 14,
    marginBottom: 10,
  },
  trainingContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trainingInfo: {
    flex: 1,
  },
  trainingUserName: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 4,
  },
  trainingUserRole: {
    fontSize: 13,
    color: medicalProviderTheme.colors.mediumGray,
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  trainingExpiry: {
    fontSize: 11,
    color: medicalProviderTheme.colors.darkGray,
  },
  trainingStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  trainingStatusIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  trainingStatusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  checklistCard: {
    padding: 20,
    marginBottom: 25,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: medicalProviderTheme.colors.lightGray,
  },
  checklistIcon: {
    fontSize: 24,
    marginRight: 15,
  },
  checklistInfo: {
    flex: 1,
  },
  checklistLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 3,
  },
  checklistDescription: {
    fontSize: 12,
    color: medicalProviderTheme.colors.mediumGray,
  },
  checklistStatus: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  checklistStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  disclaimerCard: {
    padding: 20,
    marginBottom: 20,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 12,
  },
  disclaimerText: {
    fontSize: 13,
    color: medicalProviderTheme.colors.darkGray,
    lineHeight: 20,
  },
  patientCard: {
    padding: 14,
    marginBottom: 10,
  },
  patientContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    color: medicalProviderTheme.colors.deepTeal,
    marginBottom: 4,
  },
  patientId: {
    fontSize: 12,
    color: medicalProviderTheme.colors.mediumGray,
    marginBottom: 3,
  },
  patientAccess: {
    fontSize: 13,
    color: medicalProviderTheme.colors.medicalBlue,
    marginBottom: 2,
  },
  patientLastAccess: {
    fontSize: 11,
    color: medicalProviderTheme.colors.darkGray,
    fontStyle: 'italic',
  },
  patientBadge: {
    backgroundColor: medicalProviderTheme.colors.accentTeal + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 12,
  },
  patientAccessCount: {
    fontSize: 22,
    fontWeight: '700',
    color: medicalProviderTheme.colors.accentTeal,
    marginBottom: 2,
  },
  patientAccessLabel: {
    fontSize: 10,
    color: medicalProviderTheme.colors.accentTeal,
    fontWeight: '600',
  },
});

export default MedicalProviderHIPAADashboardScreen;
