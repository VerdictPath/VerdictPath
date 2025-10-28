import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS, API_BASE_URL } from '../config/api';
import { CASE_PHASES } from '../constants/mockData';
import InviteModal from '../components/InviteModal';
import ConnectionsModal from '../components/ConnectionsModal';
import LawFirmSubscriptionScreen from './LawFirmSubscriptionScreen';

const LawFirmDashboardScreen = ({ user, onNavigateToClient, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [firmData, setFirmData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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

  // Filter clients based on search query
  const getFilteredClients = () => {
    if (!searchQuery.trim()) {
      return clients;
    }
    
    const query = searchQuery.toLowerCase();
    return clients.filter(client => 
      client.displayName?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.firstName?.toLowerCase().includes(query) ||
      client.lastName?.toLowerCase().includes(query)
    );
  };

  const renderClientsTab = () => {
    const filteredClients = getFilteredClients();
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚓ Active Clients</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients by name or email..."
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
          
          {clients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🏴‍☠️</Text>
              <Text style={styles.emptyText}>No clients aboard yet!</Text>
              <Text style={styles.emptySubtext}>
                Share your firm code with clients to get started: {firmData?.firmCode}
              </Text>
            </View>
          ) : filteredClients.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyText}>No clients found</Text>
              <Text style={styles.emptySubtext}>
                Try a different search term
              </Text>
            </View>
          ) : (
            filteredClients.map(client => (
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
              
              {/* Litigation Progress */}
              <View style={styles.litigationSection}>
                <View style={styles.litigationHeader}>
                  <Text style={styles.litigationLabel}>⚖️ Litigation Progress:</Text>
                  <Text style={styles.litigationStage}>
                    {client.litigationStage || 'Not Started'}
                  </Text>
                </View>
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBarFill, 
                      { width: `${client.litigationProgress || 0}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {client.litigationProgress || 0}% Complete
                </Text>
              </View>

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
  };

  const renderAnalyticsTab = () => {
    const totalClients = analytics?.totalClients || 0;
    const preLitigationCount = analytics?.preLitigationCount || 0;
    const litigationCount = analytics?.litigationCount || 0;
    const trialCount = analytics?.trialCount || 0;

    const preLitigationPct = totalClients > 0 ? Math.round((preLitigationCount / totalClients) * 100) : 0;
    const litigationPct = totalClients > 0 ? Math.round((litigationCount / totalClients) * 100) : 0;
    const trialPct = totalClients > 0 ? Math.round((trialCount / totalClients) * 100) : 0;

    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Firm Analytics</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statValue}>{totalClients}</Text>
              <Text style={styles.statLabel}>Total Clients</Text>
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
          <Text style={styles.sectionTitle}>🎯 Case Phase Distribution</Text>
          
          {/* Pre-Litigation Phase */}
          <View style={styles.phaseRow}>
            <View style={styles.phaseInfo}>
              <Text style={styles.phaseName}>{CASE_PHASES.PRE_LITIGATION.icon} {CASE_PHASES.PRE_LITIGATION.name}</Text>
              <Text style={styles.phaseCount}>{preLitigationCount} clients ({preLitigationPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
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
              <Text style={styles.phaseCount}>{litigationCount} clients ({litigationPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
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
              <Text style={styles.phaseCount}>{trialCount} clients ({trialPct}%)</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
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
          <Text style={styles.firmName}>⚓ {firmData?.firmName || 'Law Firm Portal'}</Text>
          <Text style={styles.firmCode}>Firm Code: {firmData?.firmCode}</Text>
        </View>
        <TouchableOpacity 
          style={styles.inviteButton} 
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.inviteButtonText}>👍 Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabBar}>
        {renderTabButton('clients', 'Clients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
        {renderTabButton('subscription', 'Subscription', '💳')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'subscription' && <LawFirmSubscriptionScreen token={user.token} />}

        <TouchableOpacity 
          style={styles.connectionsButton} 
          onPress={() => setConnectionsModalVisible(true)}
        >
          <Text style={styles.connectionsButtonText}>🔗 My Connections</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>🚪 Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConnectionsModal
        visible={connectionsModalVisible}
        onClose={() => setConnectionsModalVisible(false)}
        user={user}
      />

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
  sectionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
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
  litigationSection: {
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.warmGray + '40',
  },
  litigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  litigationLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  litigationStage: {
    fontSize: 13,
    color: theme.colors.mahogany,
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    backgroundColor: theme.colors.lightCream,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.colors.warmGray + '40',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.warmGold,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: theme.colors.warmGray,
    textAlign: 'right',
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
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.colors.successGreen,
    borderRadius: 4,
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
  recordDetail: {
    fontSize: 13,
    color: theme.colors.textPrimary,
    marginBottom: 3,
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
  connectionsButton: {
    backgroundColor: theme.colors.warmGold,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.secondary,
  },
  connectionsButtonText: {
    color: theme.colors.mahogany,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: theme.colors.mahogany,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    marginTop: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LawFirmDashboardScreen;
