import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput
} from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { CASE_PHASES } from '../constants/mockData';
import InviteModal from '../components/InviteModal';

const MedicalProviderDashboardScreen = ({ user, onNavigateToPatient, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState('patients');
  const [patients, setPatients] = useState([]);
  const [providerData, setProviderData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('[MedProvider Dashboard] Fetching dashboard data...');
      console.log('[MedProvider Dashboard] Token:', user.token ? 'Present' : 'Missing');
      console.log('[MedProvider Dashboard] API URL:', `${API_BASE_URL}${API_ENDPOINTS.MEDICALPROVIDER.DASHBOARD}`);
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.MEDICALPROVIDER.DASHBOARD}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      console.log('[MedProvider Dashboard] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[MedProvider Dashboard] Data received:', data);
        console.log('[MedProvider Dashboard] Patients count:', data.patients?.length || 0);
        
        setProviderData(data);
        setPatients(data.patients || []);
        
        // Use analytics from backend
        setAnalytics(data.analytics || {
          totalPatients: data.patients?.length || 0,
          preLitigationCount: 0,
          litigationCount: 0,
          trialCount: 0
        });
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

  // Filter patients based on search query
  const getFilteredPatients = () => {
    console.log('[MedProvider Search] Query:', searchQuery);
    console.log('[MedProvider Search] Total patients:', patients.length);
    
    if (!searchQuery.trim()) {
      console.log('[MedProvider Search] No query, returning all patients');
      return patients;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = patients.filter(patient => 
      patient.displayName?.toLowerCase().includes(query) ||
      patient.email?.toLowerCase().includes(query) ||
      patient.firstName?.toLowerCase().includes(query) ||
      patient.lastName?.toLowerCase().includes(query)
    );
    
    console.log('[MedProvider Search] Filtered results:', filtered.length);
    console.log('[MedProvider Search] Filtered patients:', filtered.map(p => p.displayName));
    
    return filtered;
  };

  const renderPatientsTab = () => {
    const filteredPatients = getFilteredPatients();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚕️ Patient List</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients by name or email..."
              placeholderTextColor={theme.colors.warmGray}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                onPress={() => setSearchQuery('')}
                style={styles.clearButton}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          
          {patients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏥</Text>
              <Text style={styles.emptyText}>No patients registered yet</Text>
              <Text style={styles.emptySubtext}>
                Share your provider code with patients: {providerData?.providerCode}
              </Text>
            </View>
          ) : filteredPatients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No patients found</Text>
              <Text style={styles.emptySubtext}>
                Try a different search term
              </Text>
            </View>
          ) : (
            filteredPatients.map(patient => (
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
              
              {/* Litigation Progress */}
              <View style={styles.litigationSection}>
                <View style={styles.litigationHeader}>
                  <Text style={styles.litigationLabel}>⚖️ Litigation Stage:</Text>
                  <Text style={styles.litigationStage}>
                    {patient.litigationStage || 'Pre-Litigation'}
                  </Text>
                </View>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${patient.litigationProgress || 0}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {patient.litigationProgress || 0}% Complete
                </Text>
              </View>

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
};

const renderAnalyticsTab = () => {
    const totalPatients = analytics?.totalPatients || 0;
    const preLitigationCount = analytics?.preLitigationCount || 0;
    const litigationCount = analytics?.litigationCount || 0;
    const trialCount = analytics?.trialCount || 0;

    const preLitigationPct = totalPatients > 0 ? Math.round((preLitigationCount / totalPatients) * 100) : 0;
    const litigationPct = totalPatients > 0 ? Math.round((litigationCount / totalPatients) * 100) : 0;
    const trialPct = totalPatients > 0 ? Math.round((trialCount / totalPatients) * 100) : 0;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Provider Analytics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statValue}>{totalPatients}</Text>
              <Text style={styles.statLabel}>Total Patients</Text>
            </View>
            
            <View style={[styles.statCard, { borderLeftColor: CASE_PHASES.PRE_LITIGATION.color, borderLeftWidth: 4 }]}>
              <Text style={styles.statIcon}>{CASE_PHASES.PRE_LITIGATION.icon}</Text>
              <Text style={styles.statValue}>{preLitigationCount}</Text>
              <Text style={styles.statLabel}>Pre-Litigation</Text>
            </View>
            
            <View style={[styles.statCard, { borderLeftColor: CASE_PHASES.LITIGATION.color, borderLeftWidth: 4 }]}>
              <Text style={styles.statIcon}>{CASE_PHASES.LITIGATION.icon}</Text>
              <Text style={styles.statValue}>{litigationCount}</Text>
              <Text style={styles.statLabel}>Litigation</Text>
            </View>
            
            <View style={[styles.statCard, { borderLeftColor: CASE_PHASES.TRIAL.color, borderLeftWidth: 4 }]}>
              <Text style={styles.statIcon}>{CASE_PHASES.TRIAL.icon}</Text>
              <Text style={styles.statValue}>{trialCount}</Text>
              <Text style={styles.statLabel}>Trial</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎯 Patient Phase Distribution</Text>
          
          {/* Pre-Litigation Phase */}
          <View style={styles.phaseRow}>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{CASE_PHASES.PRE_LITIGATION.icon} {CASE_PHASES.PRE_LITIGATION.name}</Text>
              <Text style={styles.phaseCount}>{preLitigationCount} patients ({preLitigationPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${preLitigationPct}%`, 
                    backgroundColor: CASE_PHASES.PRE_LITIGATION.color 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Litigation Phase */}
          <View style={styles.phaseRow}>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{CASE_PHASES.LITIGATION.icon} {CASE_PHASES.LITIGATION.name}</Text>
              <Text style={styles.phaseCount}>{litigationCount} patients ({litigationPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${litigationPct}%`, 
                    backgroundColor: CASE_PHASES.LITIGATION.color 
                  }
                ]} 
              />
            </View>
          </View>

          {/* Trial Phase */}
          <View style={styles.phaseRow}>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{CASE_PHASES.TRIAL.icon} {CASE_PHASES.TRIAL.name}</Text>
              <Text style={styles.phaseCount}>{trialCount} patients ({trialPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    width: `${trialPct}%`, 
                    backgroundColor: CASE_PHASES.TRIAL.color 
                  }
                ]} 
              />
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
  };

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
        <View>
          <Text style={styles.providerName}>⚕️ {providerData?.providerName || 'Medical Provider Portal'}</Text>
          <Text style={styles.providerCode}>Provider Code: {providerData?.providerCode}</Text>
        </View>
        <TouchableOpacity 
          style={styles.inviteButton} 
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.inviteButtonText}>👍 Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('patients', 'Patients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        user={user}
      />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  inviteButton: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  inviteButtonText: {
    color: theme.colors.navy,
    fontSize: 14,
    fontWeight: '600',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.lightCream,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 15,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.navy,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: theme.colors.warmGray,
    fontWeight: 'bold',
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
  phaseRow: {
    marginBottom: 20,
  },
  phaseInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  phaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.mahogany,
  },
  phaseCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.colors.lightCream,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.warmGray,
  },
  progressBar: {
    height: '100%',
    borderRadius: 5,
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
  // Litigation Progress Styles
  litigationSection: {
    backgroundColor: theme.colors.lightCream,
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
    marginBottom: 10,
  },
  litigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  litigationLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  litigationStage: {
    fontSize: 14,
    color: theme.colors.mahogany,
    fontWeight: '600',
  },
  progressBar: {
    height: 16,
    backgroundColor: theme.colors.sand,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.secondary,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.warmGold,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  hipaaSection: {
    backgroundColor: theme.colors.cream,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.secondary,
  },
  hipaaDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  hipaaButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  hipaaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default MedicalProviderDashboardScreen;
