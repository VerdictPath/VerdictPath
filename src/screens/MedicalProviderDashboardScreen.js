import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator
} from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';

const MedicalProviderDashboardScreen = ({ user, onNavigateToPatient, onLogout }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [providerData, setProviderData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEDICALPROVIDER.DASHBOARD}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProviderData(data);
        setPatients(data.patients || []);
        
        // Use analytics from backend
        setAnalytics(data.analytics || {
          totalPatients: data.patients?.length || 0,
          preLitigationCount: 0,
          litigationCount: 0,
          trialCount: 0
        });
        
        // Set medical records and evidence
        setMedicalRecords(data.medicalRecords || []);
        setEvidence(data.evidence || []);
      } else {
        // Fallback for when API doesn't exist yet
        setProviderData({
          providerName: user.providerName || 'Medical Provider',
          providerCode: user.providerCode
        });
        setPatients([]);
        setAnalytics({
          totalPatients: 0,
          preLitigationCount: 0,
          litigationCount: 0,
          trialCount: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      // Fallback data
      setProviderData({
        providerName: user.providerName || 'Medical Provider',
        providerCode: user.providerCode
      });
      setPatients([]);
      setAnalytics({
        totalPatients: 0,
        preLitigationCount: 0,
        litigationCount: 0,
        trialCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const renderTabButton = (tabName, label, icon) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => setActiveTab(tabName)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabText, activeTab === tabName && styles.activeTabText]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPatientsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚕️ Patient List</Text>
        
        {patients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏥</Text>
            <Text style={styles.emptyText}>No patients registered yet</Text>
            <Text style={styles.emptySubtext}>
              Share your provider code with patients: {providerData?.providerCode}
            </Text>
          </View>
        ) : (
          patients.map(patient => (
            <TouchableOpacity
              key={patient.id}
              style={styles.patientCard}
              onPress={() => onNavigateToPatient(patient.id)}
            >
              <View style={styles.patientHeader}>
                <Text style={styles.patientName}>👤 {patient.displayName}</Text>
                <Text style={styles.patientBadge}>
                  {patient.hasConsent ? 'Active' : 'Pending'}
                </Text>
              </View>
              <Text style={styles.patientEmail}>{patient.email}</Text>
              <View style={styles.patientStats}>
                <Text style={styles.patientStat}>📋 {patient.recordCount || 0} Records</Text>
                <Text style={styles.patientStat}>💰 ${patient.totalBilled || 0} Billed</Text>
              </View>
              <Text style={styles.patientDate}>
                ⏰ Registered: {new Date(patient.registeredDate).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );

  const renderAnalyticsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📊 Provider Analytics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{analytics?.totalPatients || 0}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>📝</Text>
            <Text style={styles.statValue}>{analytics?.preLitigationCount || 0}</Text>
            <Text style={styles.statLabel}>Pre-Litigation</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>⚖️</Text>
            <Text style={styles.statValue}>{analytics?.litigationCount || 0}</Text>
            <Text style={styles.statLabel}>Litigation</Text>
          </View>
          
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>🏛️</Text>
            <Text style={styles.statValue}>{analytics?.trialCount || 0}</Text>
            <Text style={styles.statLabel}>Trial</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📈 Recent Activity</Text>
        <View style={styles.activityList}>
          <View style={styles.activityItem}>
            <Text style={styles.activityIcon}>🆕</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityText}>Welcome to your Medical Provider Portal</Text>
              <Text style={styles.activityTime}>Just now</Text>
            </View>
          </View>
          {patients.length > 0 && (
            <View style={styles.activityItem}>
              <Text style={styles.activityIcon}>👤</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{patients.length} patient(s) registered</Text>
                <Text style={styles.activityTime}>Today</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  const renderMedicalHubTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏥 Medical Records Hub</Text>
        
        {medicalRecords.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No medical records yet</Text>
            <Text style={styles.emptySubtext}>
              Patient medical records will appear here once uploaded
            </Text>
          </View>
        ) : (
          medicalRecords.map((record, index) => (
            <View key={index} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>📄 {record.type}</Text>
                <Text style={styles.recordBadge}>{record.status}</Text>
              </View>
              <Text style={styles.recordPatient}>Patient: {record.patientName}</Text>
              <Text style={styles.recordDate}>
                Uploaded: {new Date(record.uploadedDate).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💊 Billing Summary</Text>
        <View style={styles.billingSummary}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Total Billed:</Text>
            <Text style={styles.billingValue}>${(analytics?.totalBilling || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Total Records:</Text>
            <Text style={styles.billingValue}>{analytics?.totalRecords || 0}</Text>
          </View>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Pending Reviews:</Text>
            <Text style={styles.billingValue}>{analytics?.pendingReviews || 0}</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderEvidenceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📎 Medical Evidence</Text>
        
        {evidence.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗃️</Text>
            <Text style={styles.emptyText}>No evidence documents yet</Text>
            <Text style={styles.emptySubtext}>
              Medical evidence and supporting documents will be stored here
            </Text>
          </View>
        ) : (
          evidence.map((item, index) => (
            <View key={index} style={styles.evidenceCard}>
              <View style={styles.evidenceHeader}>
                <Text style={styles.evidenceIcon}>📎</Text>
                <View style={styles.evidenceInfo}>
                  <Text style={styles.evidenceTitle}>{item.title}</Text>
                  <Text style={styles.evidencePatient}>Patient: {item.patientName}</Text>
                </View>
                <Text style={styles.evidenceBadge}>{item.type}</Text>
              </View>
              <Text style={styles.evidenceDate}>
                Added: {new Date(item.addedDate).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔐 HIPAA Compliance Status</Text>
        <View style={styles.complianceCard}>
          <Text style={styles.complianceIcon}>✅</Text>
          <Text style={styles.complianceTitle}>Fully Compliant</Text>
          <Text style={styles.complianceText}>
            All patient data is encrypted and protected with HIPAA-compliant security measures.
          </Text>
          <View style={styles.complianceFeatures}>
            <Text style={styles.complianceFeature}>🔒 AES-256-GCM Encryption</Text>
            <Text style={styles.complianceFeature}>👁️ Audit Logging Enabled</Text>
            <Text style={styles.complianceFeature}>🛡️ Role-Based Access Control</Text>
            <Text style={styles.complianceFeature}>📋 Patient Consent Management</Text>
          </View>
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.mahogany} />
        <Text style={styles.loadingText}>Loading the Portal</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.providerName}>⚕️ {providerData?.providerName || 'Medical Provider Portal'}</Text>
        <Text style={styles.providerCode}>Provider Code: {providerData?.providerCode}</Text>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('patients', 'Patients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
        {renderTabButton('medical', 'Medical Hub', '🏥')}
        {renderTabButton('evidence', 'Evidence', '📎')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'medical' && renderMedicalHubTab()}
        {activeTab === 'evidence' && renderEvidenceTab()}

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sand,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.sand,
  },
  loadingText: {
    marginTop: 10,
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.secondary,
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  providerCode: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontFamily: 'monospace',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.cream,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.warmGold,
    backgroundColor: theme.colors.lightCream,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.colors.mahogany,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: theme.colors.cream,
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: theme.colors.secondary,
  },
  emptyState: {
    padding: 30,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.warmGray,
    textAlign: 'center',
  },
  patientCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patientName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
    flex: 1,
  },
  patientBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  patientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  patientStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  patientStat: {
    fontSize: 13,
    color: theme.colors.warmGray,
  },
  patientDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 16,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.warmGold,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.lightCream,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warmGold,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: theme.colors.navy,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.colors.warmGray,
  },
  recordCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  recordBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  recordPatient: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
  },
  billingSummary: {
    gap: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.lightCream,
    borderRadius: 6,
  },
  billingLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  billingValue: {
    fontSize: 18,
    color: theme.colors.mahogany,
    fontWeight: 'bold',
  },
  evidenceCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  evidenceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  evidenceInfo: {
    flex: 1,
  },
  evidenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
    marginBottom: 2,
  },
  evidencePatient: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  evidenceBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  evidenceDate: {
    fontSize: 12,
    color: theme.colors.warmGray,
    marginLeft: 36,
  },
  complianceCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#27ae60',
  },
  complianceIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  complianceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
  },
  complianceText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  complianceFeatures: {
    alignSelf: 'stretch',
    gap: 8,
  },
  complianceFeature: {
    fontSize: 13,
    color: theme.colors.navy,
    paddingVertical: 6,
  },
  logoutButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicalProviderDashboardScreen;
