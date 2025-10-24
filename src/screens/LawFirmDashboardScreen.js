import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS, API_BASE_URL } from '../config/api';

const LawFirmDashboardScreen = ({ user, onNavigateToClient, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [firmData, setFirmData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('[Dashboard] Fetching dashboard data...');
      console.log('[Dashboard] Token:', user?.token ? 'Present' : 'Missing');
      console.log('[Dashboard] API URL:', `${API_BASE_URL}${API_ENDPOINTS.LAWFIRM.DASHBOARD}`);
      
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINTS.LAWFIRM.DASHBOARD}`, {
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      console.log('[Dashboard] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[Dashboard] Data received:', data);
        console.log('[Dashboard] Clients count:', data.clients?.length || 0);
        
        setFirmData(data);
        setClients(data.clients || []);
        
        // Use analytics from backend
        setAnalytics(data.analytics || {
          totalClients: data.clients?.length || 0,
          preLitigationCount: 0,
          litigationCount: 0,
          trialCount: 0
        });
        
        // Set medical records and evidence
        setMedicalRecords(data.medicalRecords || []);
        setEvidence(data.evidence || []);
      } else {
        const errorData = await response.json();
        console.error('[Dashboard] Failed response:', response.status, errorData);
      }
    } catch (error) {
      console.error('[Dashboard] Error fetching dashboard:', error);
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

  const renderClientsTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚓ Active Clients</Text>
        
        {clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏴‍☠️</Text>
            <Text style={styles.emptyText}>No clients aboard yet!</Text>
            <Text style={styles.emptySubtext}>
              Share your firm code with clients to get started: {firmData?.firmCode}
            </Text>
          </View>
        ) : (
          clients.map(client => (
            <TouchableOpacity
              key={client.id}
              style={styles.clientCard}
              onPress={() => onNavigateToClient(client.id)}
            >
              <View style={styles.clientHeader}>
                <Text style={styles.clientName}>🧭 {client.displayName}</Text>
                <Text style={styles.clientBadge}>
                  {client.litigationStage || 'Not Started'}
                </Text>
              </View>
              <Text style={styles.clientEmail}>{client.email}</Text>
              <View style={styles.clientStats}>
                <Text style={styles.clientStat}>📋 {client.medicalRecordCount || 0} Records</Text>
                <Text style={styles.clientStat}>💰 ${client.totalBilled || 0} Billed</Text>
              </View>
              <Text style={styles.clientDate}>
                ⏰ Registered: {new Date(client.registeredDate).toLocaleDateString()}
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
        <Text style={styles.sectionTitle}>📊 Firm Analytics</Text>
        
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statIcon}>👥</Text>
            <Text style={styles.statValue}>{analytics?.totalClients || 0}</Text>
            <Text style={styles.statLabel}>Total Clients</Text>
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
              <Text style={styles.activityText}>Welcome to your Law Firm Portal</Text>
              <Text style={styles.activityTime}>Just now</Text>
            </View>
          </View>
          {clients.length > 0 && (
            <View style={styles.activityItem}>
              <Text style={styles.activityIcon}>👤</Text>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{clients.length} client(s) registered</Text>
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
            <Text style={styles.emptyIcon}>🏴‍☠️</Text>
            <Text style={styles.emptyText}>No medical records yet</Text>
            <Text style={styles.emptySubtext}>
              Medical records will appear here once clients upload them
            </Text>
          </View>
        ) : (
          medicalRecords.map((record, index) => (
            <View key={index} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordTitle}>📄 {record.type}</Text>
                <Text style={styles.recordBadge}>{record.status}</Text>
              </View>
              <Text style={styles.recordClient}>Client: {record.clientName}</Text>
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
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 HIPAA Forms</Text>
        <View style={styles.hipaaSection}>
          <Text style={styles.hipaaDescription}>
            Manage consent forms and authorizations for sharing client medical information
          </Text>
          <TouchableOpacity 
            style={styles.hipaaButton}
            onPress={() => onNavigate('hipaaForms')}
          >
            <Text style={styles.hipaaButtonText}>📄 View HIPAA Forms</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEvidenceTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📎 Evidence Locker</Text>
        
        {evidence.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🗃️</Text>
            <Text style={styles.emptyText}>Evidence locker is empty</Text>
            <Text style={styles.emptySubtext}>
              Evidence documents will be stored securely here
            </Text>
          </View>
        ) : (
          evidence.map((item, index) => (
            <View key={index} style={styles.evidenceCard}>
              <View style={styles.evidenceHeader}>
                <Text style={styles.evidenceIcon}>📎</Text>
                <View style={styles.evidenceInfo}>
                  <Text style={styles.evidenceTitle}>{item.title}</Text>
                  <Text style={styles.evidenceClient}>Client: {item.clientName}</Text>
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
            All client data is encrypted and protected with HIPAA-compliant security measures.
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
        <Text style={styles.firmName}>⚓ {firmData?.firmName || 'Law Firm Portal'}</Text>
        <Text style={styles.firmCode}>Firm Code: {firmData?.firmCode}</Text>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('clients', 'Clients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
        {renderTabButton('medical', 'Medical Hub', '🏥')}
        {renderTabButton('evidence', 'Evidence', '📎')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'clients' && renderClientsTab()}
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
  firmName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 5,
  },
  firmCode: {
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
  clientCard: {
    backgroundColor: theme.colors.lightCream,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.warmGold,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.mahogany,
    flex: 1,
  },
  clientBadge: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.navy,
  },
  clientEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 8,
  },
  clientStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  clientStat: {
    fontSize: 13,
    color: theme.colors.warmGray,
  },
  clientDate: {
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
  recordClient: {
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
  evidenceClient: {
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

export default LawFirmDashboardScreen;
