import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert
} from 'react-native';
import { medicalProviderTheme } from '../styles/medicalProviderTheme';
import { API_BASE_URL, API_ENDPOINTS, apiRequest } from '../config/api';
import { CASE_PHASES } from '../constants/mockData';
import InviteModal from '../components/InviteModal';
import MedicalProviderSubscriptionScreen from './MedicalProviderSubscriptionScreen';
import SettingsScreen from './SettingsScreen';
import { useNotifications } from '../contexts/NotificationContext';

const MedicalProviderDashboardScreen = ({ user, initialTab, onNavigateToPatient, onNavigate, onLogout }) => {
  // Create dynamic styles using theme colors
  const styles = useMemo(() => createStyles(medicalProviderTheme.colors), []);
  
  const [activeTab, setActiveTab] = useState(initialTab || 'patients');
  const [patients, setPatients] = useState([]);
  const [providerData, setProviderData] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);
  const [lawFirms, setLawFirms] = useState([]);
  const [firmCode, setFirmCode] = useState('');
  const [addingFirm, setAddingFirm] = useState(false);
  
  // Get unread count from NotificationContext (Firebase real-time)
  const { unreadCount: unreadNotificationCount } = useNotifications();

  // Sync activeTab with initialTab when it changes
  useEffect(() => {
    if (initialTab && initialTab !== activeTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    fetchDashboardData();
    // No need to fetch unread count - Firebase handles it automatically
    checkStripeAccountStatus();
    if (activeTab === 'connections') {
      fetchLawFirms();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      console.log('[MedProvider Dashboard] Fetching dashboard data...');
      console.log('[MedProvider Dashboard] Token:', user.token ? 'Present' : 'Missing');
      console.log('[MedProvider Dashboard] API URL:', API_ENDPOINTS.MEDICALPROVIDER.DASHBOARD);
      
      const response = await fetch(API_ENDPOINTS.MEDICALPROVIDER.DASHBOARD, {
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

  const fetchLawFirms = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.LAW_FIRMS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setLawFirms(response.lawFirms || []);
    } catch (error) {
      console.error('Error fetching law firms:', error);
    }
  };

  const handleAddLawFirm = async () => {
    if (!firmCode.trim()) {
      Alert.alert('Missing Information', 'Please enter a law firm code');
      return;
    }

    try {
      setAddingFirm(true);
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.ADD_LAW_FIRM, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firmCode: firmCode.trim().toUpperCase() })
      });

      if (response.success) {
        Alert.alert('Success', response.message || 'Law firm connection added successfully!');
        setFirmCode('');
        fetchLawFirms();
      }
    } catch (error) {
      console.error('Error adding law firm:', error);
      Alert.alert('Error', error.response?.error || 'Failed to add law firm connection');
    } finally {
      setAddingFirm(false);
    }
  };

  const handleRemoveLawFirm = async (lawFirmId, firmName) => {
    Alert.alert(
      'Remove Connection',
      `Are you sure you want to disconnect from ${firmName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.REMOVE_LAW_FIRM, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lawFirmId })
              });

              if (response.success) {
                Alert.alert('Success', response.message || 'Law firm connection removed successfully');
                fetchLawFirms();
              }
            } catch (error) {
              console.error('Error removing law firm:', error);
              Alert.alert('Error', error.response?.error || 'Failed to remove law firm connection');
            }
          }
        }
      ]
    );
  };

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripeStatus(true);
      if (!user?.token) {
        console.error('No user token available');
        return;
      }
      const response = await fetch(API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStripeAccountStatus(data);
      }
    } catch (error) {
      console.error('Error checking Stripe account status:', error);
    } finally {
      setCheckingStripeStatus(false);
    }
  };

  const handleNavigateToPaymentSetup = () => {
    if (onNavigate) {
      onNavigate('medicalprovider-payment-setup', activeTab);
    }
  };

  const handleNavigateToDisbursements = () => {
    if (onNavigate) {
      onNavigate('medicalprovider-disbursements', activeTab);
    }
  };

  // Removed fetchUnreadNotificationCount - Firebase handles this automatically via NotificationContext

  const renderTabButton = (tabName, label, icon) => (
    <TouchableOpacity
      style={[styles.tab, activeTab === tabName && styles.activeTab]}
      onPress={() => {
        if (tabName === 'notifications') {
          onNavigate && onNavigate('medicalprovider-notifications', activeTab);
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

  const renderPaymentAccountBanner = () => {
    if (checkingStripeStatus) {
      return (
        <View style={styles.paymentBanner}>
          <ActivityIndicator size="small" color={medicalProviderTheme.colors.primary} />
          <Text style={styles.paymentBannerText}>Checking payment account...</Text>
        </View>
      );
    }

    if (!stripeAccountStatus?.hasAccount) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerWarning]}>
          <View style={styles.paymentBannerContent}>
            <Text style={styles.paymentBannerIcon}>⚠️</Text>
            <View style={styles.paymentBannerTextContainer}>
              <Text style={styles.paymentBannerTitle}>Payment Account Required</Text>
              <Text style={styles.paymentBannerDescription}>
                Set up your payment account to receive settlement disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.paymentBannerButton}
            onPress={handleNavigateToPaymentSetup}
          >
            <Text style={styles.paymentBannerButtonText}>Set Up Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.hasAccount && !stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerWarning]}>
          <View style={styles.paymentBannerContent}>
            <Text style={styles.paymentBannerIcon}>⚠️</Text>
            <View style={styles.paymentBannerTextContainer}>
              <Text style={styles.paymentBannerTitle}>Complete Payment Setup</Text>
              <Text style={styles.paymentBannerDescription}>
                Finish your account setup to receive settlement disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.paymentBannerButton}
            onPress={handleNavigateToPaymentSetup}
          >
            <Text style={styles.paymentBannerButtonText}>Resume Setup</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.paymentBanner, styles.paymentBannerSuccess]}>
          <Text style={styles.paymentBannerIcon}>✓</Text>
          <View style={styles.paymentBannerTextContainer}>
            <Text style={styles.paymentBannerSuccessTitle}>Payment Account Active</Text>
            <Text style={styles.paymentBannerSuccessDescription}>
              You can receive settlement disbursements
            </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  const renderPatientsTab = () => {
    const filteredPatients = getFilteredPatients();
    
    return (
      <View style={styles.tabContent}>
        {renderPaymentAccountBanner()}
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚕️ Patient List</Text>
          
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search patients by name or email..."
              placeholderTextColor={medicalProviderTheme.colors.mediumGray}
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
                onPress={() => onNavigate && onNavigate('medicalprovider-negotiations', activeTab)}
              >
                <Text style={styles.quickActionIcon}>💰</Text>
                <Text style={styles.quickActionText}>Bill Negotiations</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('medicalprovider-disbursements', activeTab)}
              >
                <Text style={styles.quickActionIcon}>💵</Text>
                <Text style={styles.quickActionText}>Disbursements</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('medicalprovider-user-management', activeTab)}
              >
                <Text style={styles.quickActionIcon}>👥</Text>
                <Text style={styles.quickActionText}>Manage Users</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('medicalprovider-activity-dashboard', activeTab)}
              >
                <Text style={styles.quickActionIcon}>📊</Text>
                <Text style={styles.quickActionText}>User Activity</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.quickActionsRow}>
              <TouchableOpacity 
                style={styles.quickActionButton}
                onPress={() => onNavigate && onNavigate('medicalprovider-hipaa-dashboard', activeTab)}
              >
                <Text style={styles.quickActionIcon}>🔒</Text>
                <Text style={styles.quickActionText}>HIPAA Report</Text>
              </TouchableOpacity>
            </View>
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
            <View key={`patient-list-${searchQuery}-${filteredPatients.length}`}>
              {filteredPatients.map(patient => (
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
                ⏰ Registered: {new Date(patient.registeredDate).toLocaleDateString('en-US')}
              </Text>
            </TouchableOpacity>
          ))}
            </View>
        )}
      </View>
    </View>
  );
};

  const renderNotificationsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 Patient Notifications</Text>
          <Text style={styles.sectionDescription}>
            Send notifications to your patients about appointments, test results, and important medical information.
          </Text>
          
          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('medicalprovider-send-notification', activeTab)}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📨</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Send Notification</Text>
              <Text style={styles.notificationActionDescription}>
                Compose and send notifications to your patients
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('medicalprovider-notification-analytics', activeTab)}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📊</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>View Analytics</Text>
              <Text style={styles.notificationActionDescription}>
                Track notification delivery, read, and click rates
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('medicalprovider-event-requests', activeTab)}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>📅</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Treatment Date Requests</Text>
              <Text style={styles.notificationActionDescription}>
                Request appointments, consultations, and follow-ups from patients
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.notificationActionCard}
            onPress={() => onNavigate && onNavigate('medicalprovider-negotiations', activeTab)}
          >
            <View style={styles.notificationActionIcon}>
              <Text style={styles.notificationActionIconText}>💰</Text>
            </View>
            <View style={styles.notificationActionContent}>
              <Text style={styles.notificationActionTitle}>Bill Negotiations</Text>
              <Text style={styles.notificationActionDescription}>
                Negotiate medical bills with law firms
              </Text>
            </View>
            <Text style={styles.notificationActionArrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Notification Templates</Text>
          <Text style={styles.sectionDescription}>
            Use pre-built templates for common patient communications:
          </Text>
          
          <View style={styles.templatesList}>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📅</Text>
              <Text style={styles.templateText}>Appointment Reminders</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>📄</Text>
              <Text style={styles.templateText}>Document Upload Requests</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>💳</Text>
              <Text style={styles.templateText}>Billing Notices</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>🔬</Text>
              <Text style={styles.templateText}>Scans Available</Text>
            </View>
            <View style={styles.templateItem}>
              <Text style={styles.templateIcon}>💊</Text>
              <Text style={styles.templateText}>Prescription Refills</Text>
            </View>
          </View>
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

        <TouchableOpacity 
          style={styles.hipaaActivityCard}
          onPress={() => onNavigate && onNavigate('medicalprovider-activity-dashboard', activeTab)}
        >
          <View style={styles.hipaaActivityHeader}>
            <View style={styles.hipaaActivityIcon}>
              <Text style={styles.hipaaActivityIconText}>🔒</Text>
            </View>
            <View style={styles.hipaaActivityContent}>
              <Text style={styles.hipaaActivityTitle}>HIPAA Activity Dashboard</Text>
              <Text style={styles.hipaaActivityDescription}>
                View staff activity, patient access audits, and compliance reports
              </Text>
            </View>
            <Text style={styles.hipaaActivityArrow}>→</Text>
          </View>
        </TouchableOpacity>
        
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

  const renderConnectionsTab = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔗 Law Firm Connections</Text>
          <Text style={styles.sectionDescription}>
            Connect with law firms to collaborate on patient cases, share medical information securely, and negotiate medical bills.
          </Text>

          <View style={styles.addFirmContainer}>
            <Text style={styles.addFirmLabel}>Add Law Firm by Code:</Text>
            <View style={styles.addFirmInputRow}>
              <TextInput
                style={styles.firmCodeInput}
                value={firmCode}
                onChangeText={setFirmCode}
                placeholder="Enter firm code (e.g., LAW-BETA01)"
                placeholderTextColor={medicalProviderTheme.colors.textSecondary}
                autoCapitalize="characters"
              />
              <TouchableOpacity 
                style={[styles.addFirmButton, addingFirm && styles.addFirmButtonDisabled]}
                onPress={handleAddLawFirm}
                disabled={addingFirm}
              >
                <Text style={styles.addFirmButtonText}>
                  {addingFirm ? 'Adding...' : '+ Add'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {lawFirms.length > 0 ? (
            <View style={styles.firmsListContainer}>
              <Text style={styles.firmsListTitle}>Connected Law Firms ({lawFirms.length})</Text>
              {lawFirms.map((firm) => (
                <View key={firm.id} style={styles.firmCard}>
                  <View style={styles.firmCardHeader}>
                    <View style={styles.firmCardIcon}>
                      <Text style={styles.firmCardIconText}>⚖️</Text>
                    </View>
                    <View style={styles.firmCardInfo}>
                      <Text style={styles.firmCardName}>{firm.firm_name || firm.email}</Text>
                      <Text style={styles.firmCardCode}>Code: {firm.firm_code}</Text>
                      <Text style={styles.firmCardMeta}>
                        {firm.client_count || 0} clients • Connected {new Date(firm.connected_date).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.removeFirmButton}
                    onPress={() => handleRemoveLawFirm(firm.id, firm.firm_name || firm.email)}
                  >
                    <Text style={styles.removeFirmButtonText}>✕ Remove</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateIcon}>🔗</Text>
              <Text style={styles.emptyStateTitle}>No Law Firm Connections</Text>
              <Text style={styles.emptyStateText}>
                Enter a law firm code above to connect with a law firm. Once connected, you'll be able to collaborate on patient cases and negotiate medical bills.
              </Text>
            </View>
          )}

          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Benefits of connecting with law firms:
              {'\n'}• Securely share patient medical records
              {'\n'}• Negotiate medical bills directly in the platform
              {'\n'}• Coordinate on patient care and case progress
              {'\n'}• Streamline communication and collaboration
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={medicalProviderTheme.colors.primary} />
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

      {stripeAccountStatus?.onboardingComplete && (
        <TouchableOpacity 
          style={styles.disbursementCTA} 
          onPress={handleNavigateToDisbursements}
        >
          <View style={styles.disbursementCTAContent}>
            <Text style={styles.disbursementCTAIcon}>💰</Text>
            <View style={styles.disbursementCTATextContainer}>
              <Text style={styles.disbursementCTATitle}>Settlement Disbursements</Text>
              <Text style={styles.disbursementCTASubtitle}>View your received payments & history</Text>
            </View>
            <Text style={styles.disbursementCTAArrow}>→</Text>
          </View>
        </TouchableOpacity>
      )}

      {!stripeAccountStatus?.onboardingComplete && (
        <View style={[styles.disbursementCTA, styles.disbursementCTADisabled]}>
          <View style={styles.disbursementCTAContent}>
            <Text style={styles.disbursementCTAIcon}>⚠️</Text>
            <View style={styles.disbursementCTATextContainer}>
              <Text style={styles.disbursementCTATitle}>Settlement Disbursements</Text>
              <Text style={styles.disbursementCTASubtitle}>Complete payment setup to receive disbursements</Text>
            </View>
            <TouchableOpacity onPress={handleNavigateToPaymentSetup}>
              <Text style={styles.disbursementSetupText}>Setup →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.tabBar}>
        {renderTabButton('patients', 'Patients', '👥')}
        {renderTabButton('analytics', 'Analytics', '📊')}
        {renderTabButton('notifications', 'Notifications', '🔔')}
        {renderTabButton('subscription', 'Subscription', '💳')}
        {renderTabButton('settings', 'Settings', '⚙️')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'patients' && renderPatientsTab()}
        {activeTab === 'analytics' && renderAnalyticsTab()}
        {activeTab === 'notifications' && renderNotificationsTab()}
        {activeTab === 'subscription' && <MedicalProviderSubscriptionScreen token={user.token} />}
        {activeTab === 'settings' && <SettingsScreen user={user} onBack={() => setActiveTab('patients')} />}
        {activeTab === 'connections' && renderConnectionsTab()}

        {activeTab !== 'connections' && (
          <TouchableOpacity 
            style={styles.connectionsButton} 
            onPress={() => setActiveTab('connections')}
          >
            <Text style={styles.connectionsButtonText}>🔗 Manage Law Firm Connections</Text>
          </TouchableOpacity>
        )}

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

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.textSecondary,
    fontSize: 16,
  },
  header: {
    backgroundColor: colors.primary,
    padding: 20,
    borderBottomWidth: 3,
    borderBottomColor: colors.primaryDark,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  providerName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  providerCode: {
    fontSize: 14,
    color: colors.silver,
    fontFamily: 'monospace',
  },
  inviteButton: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.silver,
  },
  inviteButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    borderBottomWidth: 2,
    borderBottomColor: colors.silver,
  },
  tab: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: colors.primary,
    backgroundColor: colors.offWhite,
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
    backgroundColor: '#e74c3c',
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
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    flex: 1,
    paddingBottom: 100,
  },
  tabContent: {
    padding: 16,
  },
  section: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.silver,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: colors.silver,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  notificationActionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: colors.silver,
  },
  notificationActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
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
    color: '#333',
    marginBottom: 4,
  },
  notificationActionDescription: {
    fontSize: 13,
    color: '#666',
  },
  notificationActionArrow: {
    fontSize: 24,
    color: colors.primary,
    fontWeight: 'bold',
  },
  hipaaActivityCard: {
    backgroundColor: '#E0F7FA',
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00BCD4',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hipaaActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hipaaActivityIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00BCD4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  hipaaActivityIconText: {
    fontSize: 28,
  },
  hipaaActivityContent: {
    flex: 1,
  },
  hipaaActivityTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#006B7D',
    marginBottom: 4,
  },
  hipaaActivityDescription: {
    fontSize: 14,
    color: '#37474F',
    lineHeight: 20,
  },
  hipaaActivityArrow: {
    fontSize: 24,
    color: '#00BCD4',
    marginLeft: 8,
  },
  templatesList: {
    gap: 12,
  },
  templateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  templateText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.offWhite,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.silver,
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
    color: colors.charcoal,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearButtonText: {
    fontSize: 18,
    color: colors.mediumGray,
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
    color: colors.textSecondary,
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.mediumGray,
    textAlign: 'center',
  },
  patientCard: {
    backgroundColor: colors.offWhite,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    color: colors.primary,
    flex: 1,
  },
  patientBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  patientEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  patientStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  patientStat: {
    fontSize: 13,
    color: colors.mediumGray,
  },
  patientDate: {
    fontSize: 12,
    color: colors.mediumGray,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    backgroundColor: colors.offWhite,
    padding: 16,
    borderRadius: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
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
    color: colors.primary,
  },
  phaseCount: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: colors.offWhite,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.mediumGray,
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
    backgroundColor: colors.offWhite,
    padding: 12,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
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
    color: colors.charcoal,
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  recordCard: {
    backgroundColor: colors.offWhite,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
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
    color: colors.primary,
  },
  recordBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.charcoal,
  },
  recordPatient: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: colors.mediumGray,
  },
  billingSummary: {
    gap: 12,
  },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.offWhite,
    borderRadius: 6,
  },
  billingLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  billingValue: {
    fontSize: 18,
    color: colors.primary,
    fontWeight: 'bold',
  },
  evidenceCard: {
    backgroundColor: colors.offWhite,
    padding: 15,
    borderRadius: 6,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primaryLight,
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
    color: colors.primary,
    marginBottom: 2,
  },
  evidencePatient: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  evidenceBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: '600',
    color: colors.charcoal,
  },
  evidenceDate: {
    fontSize: 12,
    color: colors.mediumGray,
    marginLeft: 36,
  },
  complianceCard: {
    backgroundColor: colors.offWhite,
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
    color: colors.textSecondary,
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
    color: colors.charcoal,
    paddingVertical: 6,
  },
  logoutButton: {
    backgroundColor: colors.primary,
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
  connectionsButton: {
    backgroundColor: colors.primaryLight,
    padding: 15,
    borderRadius: 8,
    margin: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.silver,
  },
  connectionsButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonContainer: {
    backgroundColor: colors.offWhite,
    padding: 30,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.silver,
    marginBottom: 20,
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: 15,
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  comingSoonText: {
    fontSize: 15,
    color: colors.charcoal,
    textAlign: 'center',
    marginBottom: 10,
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: colors.cardBackground,
    padding: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: colors.charcoal,
    lineHeight: 22,
  },
  // Litigation Progress Styles
  litigationSection: {
    backgroundColor: colors.offWhite,
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
    color: colors.textSecondary,
    fontWeight: '500',
  },
  litigationStage: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 16,
    backgroundColor: colors.background,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.silver,
    marginBottom: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primaryLight,
  },
  progressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  hipaaSection: {
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.silver,
  },
  hipaaDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 15,
    lineHeight: 20,
  },
  hipaaButton: {
    backgroundColor: colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  hipaaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  paymentBanner: {
    backgroundColor: colors.offWhite,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    marginHorizontal: 16,
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentBannerWarning: {
    backgroundColor: '#FFF3CD',
    borderWidth: 2,
    borderColor: '#FFC107',
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  paymentBannerSuccess: {
    backgroundColor: '#D4EDDA',
    borderWidth: 2,
    borderColor: '#28A745',
  },
  paymentBannerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  paymentBannerIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  paymentBannerTextContainer: {
    flex: 1,
  },
  paymentBannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
  },
  paymentBannerDescription: {
    fontSize: 13,
    color: colors.charcoal,
    lineHeight: 18,
  },
  paymentBannerButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
    marginTop: 12,
    alignItems: 'center',
  },
  paymentBannerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  paymentBannerText: {
    fontSize: 14,
    color: colors.charcoal,
    marginLeft: 10,
  },
  paymentBannerSuccessTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 3,
  },
  paymentBannerSuccessDescription: {
    fontSize: 13,
    color: colors.charcoal,
  },
  disbursementCTA: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: colors.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  disbursementCTADisabled: {
    backgroundColor: colors.mediumGray,
    borderColor: colors.textSecondary,
    opacity: 0.8,
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
    color: colors.cardBackground,
    marginBottom: 4,
  },
  disbursementCTASubtitle: {
    fontSize: 14,
    color: colors.offWhite,
    opacity: 0.9,
  },
  disbursementCTAArrow: {
    fontSize: 24,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  disbursementSetupText: {
    fontSize: 16,
    color: colors.primaryLight,
    fontWeight: 'bold',
  },
  quickActionsContainer: {
    marginVertical: 16,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.charcoal,
    textAlign: 'center',
  },
  addFirmContainer: {
    backgroundColor: colors.offWhite,
    padding: 16,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primaryLight,
    marginBottom: 20,
  },
  addFirmLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 10,
  },
  addFirmInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  firmCodeInput: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    borderWidth: 2,
    borderColor: colors.silver,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  addFirmButton: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.silver,
    justifyContent: 'center',
  },
  addFirmButtonDisabled: {
    opacity: 0.6,
  },
  addFirmButtonText: {
    color: colors.charcoal,
    fontSize: 14,
    fontWeight: '600',
  },
  firmsListContainer: {
    marginBottom: 20,
  },
  firmsListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 15,
  },
  firmCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.silver,
    padding: 16,
    marginBottom: 12,
  },
  firmCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  firmCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 2,
    borderColor: colors.silver,
  },
  firmCardIconText: {
    fontSize: 24,
  },
  firmCardInfo: {
    flex: 1,
  },
  firmCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  firmCardCode: {
    fontSize: 13,
    color: colors.textSecondary,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  firmCardMeta: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  removeFirmButton: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d32f2f',
    alignSelf: 'flex-start',
  },
  removeFirmButtonText: {
    color: '#d32f2f',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.offWhite,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.silver,
    marginBottom: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default MedicalProviderDashboardScreen;
