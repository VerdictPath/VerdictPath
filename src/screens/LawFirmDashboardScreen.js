import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, useWindowDimensions, Modal } from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS, API_BASE_URL } from '../config/api';
import { CASE_PHASES } from '../constants/mockData';
import InviteModal from '../components/InviteModal';
import ConnectionsModal from '../components/ConnectionsModal';
import LawFirmSubscriptionScreen from './LawFirmSubscriptionScreen';
import LawFirmUserManagementScreen from './LawFirmUserManagementScreen';
import LawFirmActivityDashboardScreen from './LawFirmActivityDashboardScreen';
import LawFirmUserActivityTimelineScreen from './LawFirmUserActivityTimelineScreen';
import SettingsScreen from './SettingsScreen';
import { useNotifications } from '../contexts/NotificationContext';

const LawFirmDashboardScreen = ({ user, onNavigateToClient, onNavigate, onLogout }) => {
  const { width, height } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [firmData, setFirmData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [connectionsModalVisible, setConnectionsModalVisible] = useState(false);
  const [clientTrackingModalVisible, setClientTrackingModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get unread count from NotificationContext (Firebase real-time)
  const { unreadCount: unreadNotificationCount } = useNotifications();

  useEffect(() => {
    fetchDashboardData();
    // No need to fetch unread count - Firebase handles it automatically
  }, []);

  const fetchDashboardData = async () => {
    try {
      console.log('[Dashboard] Fetching dashboard data...');
      console.log('[Dashboard] Token:', user?.token ? 'Present' : 'Missing');
      console.log('[Dashboard] API URL:', API_ENDPOINTS.LAWFIRM.DASHBOARD);
      
      const data = await apiRequest(API_ENDPOINTS.LAWFIRM.DASHBOARD, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      console.log('[Dashboard] Data received:', data);
      console.log('[Dashboard] Clients count:', data.clients?.length || 0);
      
      // Extract firm metadata only (not bulk data)
      setFirmData({
        firmName: data.firmName,
        firmCode: data.firmCode,
        totalClients: data.totalClients
      });
      
      // Set clients array in dedicated state
      setClients(data.clients || []);
      
      // Set analytics in dedicated state
      setAnalytics(data.analytics || {
        totalClients: data.totalClients || 0,
        preLitigationCount: 0,
        litigationCount: 0,
        trialCount: 0
      });
    } catch (error) {
      console.error('[Dashboard] Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Removed fetchUnreadNotificationCount - Firebase handles this automatically via NotificationContext

  const renderTabButton = (tabName, label, icon) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => {
        if (tabName === 'notifications') {
          onNavigate && onNavigate('lawfirm-notifications');
        } else {
          setActiveTab(tabName);
        }
      }}
    >
      <View style={styles.tabIconContainer}>
        <Text style={styles.tabIcon}>{icon}</Text>
        {tabName === 'notifications' && unreadNotificationCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationBadgeText}>
              {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
            </Text>
          </View>
        )}
      </View>
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

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.quickActionsTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('lawfirm-user-management')}
              >
                <Text style={styles.quickActionIcon}>👥</Text>
                <Text style={styles.quickActionText}>Manage Users</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('lawfirm-activity-dashboard')}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={styles.quickActionText}>User Activity Logs</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('lawfirm-negotiations')}
              >
                <Text style={styles.quickActionIcon}>💰</Text>
                <Text style={styles.quickActionText}>Bill Negotiations</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('lawfirm-disbursements')}
              >
                <Text style={styles.quickActionIcon}>💵</Text>
                <Text style={styles.quickActionText}>Disbursements</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => setClientTrackingModalVisible(true)}
              >
                <Text style={styles.quickActionIcon}>📍</Text>
                <Text style={styles.quickActionText}>Client Tracking</Text>
              </TouchableOpacity>
            </View>
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
                ⏰ Registered: {new Date(client.registeredDate).toLocaleDateString('en-US')}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </View>
  );
  };

  const renderNotificationsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Client Notifications</Text>
          <Text style={styles.sectionDescription}>
            Send notifications to your clients about case updates, deadlines, and important tasks.
          </Text>
          
          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('lawfirm-send-notification')}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📨</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Send Notification</Text>
              <Text style={styles.notificationActionDescription}>
                Compose and send notifications to your clients
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('lawfirm-notification-analytics')}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📊</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Client Tracking</Text>
              <Text style={styles.notificationActionDescription}>
                Track notification delivery, read, and click rates
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('lawfirm-event-requests')}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📅</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Event Requests</Text>
              <Text style={styles.notificationActionDescription}>
                Request depositions, mediations, and consultations from clients
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('lawfirm-negotiations')}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>💰</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Bill Negotiations</Text>
              <Text style={styles.notificationActionDescription}>
                Negotiate medical bills with providers
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('lawfirm-disbursements')}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>💵</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Settlement Disbursements</Text>
              <Text style={styles.notificationActionDescription}>
                Disburse settlement proceeds to clients and medical providers
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Notification Templates</Text>
          <Text style={styles.sectionDescription}>
            Use pre-built templates for common client communications:
          </Text>
          
          <View style={styles.templatesList}>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>⏰</Text>
              <Text style={styles.templateText}>Deadline Reminders</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📄</Text>
              <Text style={styles.templateText}>Document Requests</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📅</Text>
              <Text style={styles.templateText}>Appointment Reminders</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📢</Text>
              <Text style={styles.templateText}>Case Updates</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📋</Text>
              <Text style={styles.templateText}>Task Reminders</Text>
            </View>
          </View>
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

  const handleNavigateToDisbursements = () => {
    if (onNavigate) {
      onNavigate('disbursement-dashboard');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.firmInfo}>
          <Text style={styles.firmName}>{firmData?.firmName || 'Law Firm Portal'}</Text>
          <Text style={styles.firmCode}>Firm Code: {firmData?.firmCode}</Text>
        </View>
        <TouchableOpacity 
          style={styles.inviteButton} 
          onPress={() => setInviteModalVisible(true)}
        >
          <Text style={styles.inviteButtonText}>+ Invite</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.disbursementCTA} 
        onPress={handleNavigateToDisbursements}
      >
        <View style={styles.disbursementCTAContent}>
          <Text style={styles.disbursementCTAIcon}>💰</Text>
          <View style={styles.disbursementCTATextContainer}>
            <Text style={styles.disbursementCTATitle}>Settlement Disbursements</Text>
            <Text style={styles.disbursementCTASubtitle}>Send payments to clients & medical providers</Text>
          </View>
          <Text style={styles.disbursementCTAArrow}>→</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.tabBar}>
        {renderTabButton('clients', 'Clients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
        {renderTabButton('notifications', 'Notifications', '🔔')}
        {renderTabButton('subscription', 'Subscription', '💳')}
        {renderTabButton('settings', 'Settings', '⚙️')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'clients' && renderClientsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'subscription' && <LawFirmSubscriptionScreen token={user.token} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onBack={() => setActiveTab('clients')} />}

        <TouchableOpacity 
          style={styles.connectionsButton} 
          onPress={() => setConnectionsModalVisible(true)}
        >
          <Text style={styles.connectionsButtonText}>My Connections</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>

      <ConnectionsModal
        visible={connectionsModalVisible}
        onClose={() => setConnectionsModalVisible(false)}
        user={user}
        userType="lawfirm"
      />

      <InviteModal
        visible={inviteModalVisible}
        onClose={() => setInviteModalVisible(false)}
        user={user}
      />

      <Modal
        visible={clientTrackingModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setClientTrackingModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setClientTrackingModalVisible(false)}
        >
          <View style={styles.clientTrackingModal}>
            <Text style={styles.clientTrackingModalTitle}>📍 Client Tracking</Text>
            
            <TouchableOpacity 
              style={styles.clientTrackingModalOption}
              onPress={() => {
                setClientTrackingModalVisible(false);
                onNavigate && onNavigate('lawfirm-notification-analytics');
              }}
            >
              <Text style={styles.clientTrackingModalOptionIcon}>📊</Text>
              <View style={styles.clientTrackingModalOptionContent}>
                <Text style={styles.clientTrackingModalOptionTitle}>Client Tracking</Text>
                <Text style={styles.clientTrackingModalOptionDescription}>
                  Track notification delivery, read, and click rates
                </Text>
              </View>
              <Text style={styles.clientTrackingModalOptionArrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.clientTrackingModalOption}
              onPress={() => {
                setClientTrackingModalVisible(false);
                onNavigate && onNavigate('lawfirm-event-requests');
              }}
            >
              <Text style={styles.clientTrackingModalOptionIcon}>📅</Text>
              <View style={styles.clientTrackingModalOptionContent}>
                <Text style={styles.clientTrackingModalOptionTitle}>Event Requests</Text>
                <Text style={styles.clientTrackingModalOptionDescription}>
                  Request depositions, mediations, and consultations
                </Text>
              </View>
              <Text style={styles.clientTrackingModalOptionArrow}>→</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.clientTrackingModalClose}
              onPress={() => setClientTrackingModalVisible(false)}
            >
              <Text style={styles.clientTrackingModalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: theme.lawFirm.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.background,
  },
  loadingText: {
    marginTop: 10,
    color: theme.lawFirm.text,
    fontSize: 16,
  },
  header: {
    backgroundColor: theme.lawFirm.primary,
    padding: 20,
    paddingTop: 50,
    borderBottomWidth: 2,
    borderBottomColor: theme.lawFirm.accent,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  firmInfo: {
    flex: 1,
    marginRight: 12,
  },
  firmName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.lawFirm.surface,
    marginBottom: 5,
  },
  firmCode: {
    fontSize: 14,
    color: theme.lawFirm.accentLight,
    fontFamily: 'monospace',
  },
  inviteButton: {
    backgroundColor: theme.lawFirm.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 0,
    flexShrink: 0,
  },
  inviteButtonText: {
    color: theme.lawFirm.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.lawFirm.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.lawFirm.primary,
    backgroundColor: theme.lawFirm.surfaceAlt,
  },
  tabIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabIcon: {
    fontSize: 20,
  },
  notificationBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: theme.lawFirm.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tabText: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: theme.lawFirm.primary,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
    backgroundColor: theme.lawFirm.background,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: theme.lawFirm.surface,
    padding: 20,
    marginBottom: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    shadowColor: theme.lawFirm.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.lawFirm.border,
  },
  sectionDescription: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  notificationActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  notificationActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.lawFirm.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  notificationActionIconText: {
    fontSize: 24,
  },
  notificationActionContent: {
    flex: 1,
  },
  notificationActionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.lawFirm.text,
    marginBottom: 4,
  },
  notificationActionDescription: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
  },
  notificationActionArrow: {
    fontSize: 24,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  templatesList: {
    gap: 12,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  templateIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  templateText: {
    fontSize: 15,
    color: theme.lawFirm.text,
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
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
    color: theme.lawFirm.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: theme.lawFirm.textSecondary,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
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
    color: theme.lawFirm.text,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    textAlign: 'center',
  },
  clientCard: {
    backgroundColor: theme.lawFirm.surface,
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.lawFirm.primary,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
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
    color: theme.lawFirm.primary,
    flex: 1,
  },
  clientBadge: {
    backgroundColor: theme.lawFirm.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.lawFirm.surface,
    borderWidth: 0,
    overflow: 'hidden',
  },
  clientEmail: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    marginBottom: 8,
  },
  clientStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  clientStat: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
  },
  clientDate: {
    fontSize: 12,
    color: theme.lawFirm.textLight,
    marginTop: 4,
  },
  litigationSection: {
    marginVertical: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: theme.lawFirm.border,
  },
  litigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  litigationLabel: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    fontWeight: '500',
  },
  litigationStage: {
    fontSize: 13,
    color: theme.lawFirm.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 10,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 5,
    overflow: 'hidden',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.lawFirm.primary,
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 16,
    borderRadius: 12,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
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
    color: theme.lawFirm.primary,
  },
  phaseCount: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: theme.lawFirm.success,
    borderRadius: 4,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.lawFirm.primary,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
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
    color: theme.lawFirm.text,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: theme.lawFirm.textSecondary,
  },
  recordCard: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.lawFirm.primary,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
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
    color: theme.lawFirm.primary,
  },
  recordBadge: {
    backgroundColor: theme.lawFirm.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.lawFirm.surface,
    overflow: 'hidden',
  },
  recordClient: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    marginBottom: 4,
  },
  recordDetail: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
    marginBottom: 3,
  },
  recordDate: {
    fontSize: 12,
    color: theme.lawFirm.textLight,
  },
  billingSummary: {
    gap: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  billingLabel: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    fontWeight: '600',
  },
  billingValue: {
    fontSize: 18,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  evidenceCard: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: theme.lawFirm.primary,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
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
    color: theme.lawFirm.primary,
    marginBottom: 2,
  },
  evidenceClient: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
  },
  evidenceBadge: {
    backgroundColor: theme.lawFirm.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: theme.lawFirm.surface,
    overflow: 'hidden',
  },
  evidenceDate: {
    fontSize: 12,
    color: theme.lawFirm.textLight,
    marginLeft: 36,
  },
  complianceCard: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.success,
  },
  complianceIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  complianceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.lawFirm.success,
    marginBottom: 10,
  },
  complianceText: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
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
    color: theme.lawFirm.text,
    paddingVertical: 6,
  },
  hipaaSection: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  hipaaDescription: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  hipaaButton: {
    backgroundColor: theme.lawFirm.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  hipaaButtonText: {
    color: theme.lawFirm.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  connectionsButton: {
    backgroundColor: theme.lawFirm.primary,
    padding: 15,
    borderRadius: 10,
    margin: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  connectionsButtonText: {
    color: theme.lawFirm.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    padding: 15,
    borderRadius: 10,
    margin: 16,
    marginTop: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  logoutText: {
    color: theme.lawFirm.error,
    fontSize: 16,
    fontWeight: '600',
  },
  disbursementCTA: {
    backgroundColor: theme.lawFirm.surfaceAlt,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    shadowColor: theme.lawFirm.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  disbursementCTAContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  disbursementCTAIcon: {
    fontSize: 40,
    marginRight: 16,
  },
  disbursementCTATextContainer: {
    flex: 1,
  },
  disbursementCTATitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 4,
  },
  disbursementCTASubtitle: {
    fontSize: 14,
    color: theme.lawFirm.textSecondary,
  },
  disbursementCTAArrow: {
    fontSize: 24,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    marginVertical: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lawFirm.primary,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: theme.lawFirm.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.lawFirm.primary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientTrackingModal: {
    backgroundColor: theme.lawFirm.surface,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  clientTrackingModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.lawFirm.primary,
    marginBottom: 20,
    textAlign: 'center',
  },
  clientTrackingModalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.lawFirm.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.lawFirm.border,
  },
  clientTrackingModalOptionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  clientTrackingModalOptionContent: {
    flex: 1,
  },
  clientTrackingModalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.lawFirm.primary,
    marginBottom: 4,
  },
  clientTrackingModalOptionDescription: {
    fontSize: 13,
    color: theme.lawFirm.textSecondary,
  },
  clientTrackingModalOptionArrow: {
    fontSize: 20,
    color: theme.lawFirm.primary,
    fontWeight: 'bold',
  },
  clientTrackingModalClose: {
    marginTop: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  clientTrackingModalCloseText: {
    fontSize: 16,
    color: theme.lawFirm.textSecondary,
    fontWeight: '500',
  },
});

export default LawFirmDashboardScreen;
