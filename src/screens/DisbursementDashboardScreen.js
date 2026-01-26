import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

// Launch promotion: All subscribers get premium features during launch
const IS_LAUNCH_PROMO = true;

// Helper to sanitize currency input - removes commas, $, and other non-numeric characters
const sanitizeCurrencyInput = (value) => {
  if (!value) return '';
  // Remove $ signs, commas, and spaces, keep only digits and decimal point
  let sanitized = value.replace(/[$,\s]/g, '');
  // Only allow one decimal point
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  // Only allow digits and one decimal point
  sanitized = sanitized.replace(/[^0-9.]/g, '');
  return sanitized;
};

// Helper to parse currency safely
const parseCurrency = (value) => {
  const sanitized = sanitizeCurrencyInput(value);
  const parsed = parseFloat(sanitized);
  return isNaN(parsed) ? 0 : parsed;
};

const DisbursementDashboardScreen = ({ user, onBack, onNavigate }) => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [disbursementAmount, setDisbursementAmount] = useState('');
  const [medicalProviderPayments, setMedicalProviderPayments] = useState([]);
  const [totalMedicalPayments, setTotalMedicalPayments] = useState(0);
  const [showDisbursementModal, setShowDisbursementModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [disbursementHistory, setDisbursementHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('new'); // 'new' or 'history'
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  const [checkingStripeStatus, setCheckingStripeStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [subscription, setSubscription] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    loadSubscription();
    loadClients();
    loadDisbursementHistory();
    checkStripeAccountStatus();
  }, []);

  const loadSubscription = async () => {
    try {
      setLoadingSubscription(true);
      const response = await apiRequest(API_ENDPOINTS.SUBSCRIPTION.LAWFIRM_CURRENT, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      setSubscription(response.subscription);
    } catch (error) {
    } finally {
      setLoadingSubscription(false);
    }
  };

  const loadClients = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM.GET_CLIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      // Only show clients who haven't received final disbursement
      const eligibleClients = response.clients.filter(c => !c.disbursementCompleted);
      setClients(eligibleClients);
    } catch (error) {
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const loadDisbursementHistory = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DISBURSEMENTS.GET_HISTORY, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      setDisbursementHistory(response.disbursements || []);
    } catch (error) {
    }
  };

  const checkStripeAccountStatus = async () => {
    try {
      setCheckingStripeStatus(true);
      const response = await apiRequest(API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      setStripeAccountStatus(response);
    } catch (error) {
    } finally {
      setCheckingStripeStatus(false);
    }
  };

  const handleNavigateToStripeSetup = () => {
    if (onNavigate) {
      onNavigate('StripeConnectOnboarding');
    }
  };

  const loadClientMedicalProviders = async (clientId) => {
    try {
      const response = await apiRequest(
        `${API_ENDPOINTS.DISBURSEMENTS.GET_CLIENT_PROVIDERS}?clientId=${clientId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      return response.providers || [];
    } catch (error) {
      return [];
    }
  };

  const checkPremiumAccess = () => {
    // During launch promotion, all subscribers get premium features
    if (IS_LAUNCH_PROMO) {
      return true;
    }
    // Check if subscription is loaded and has premium plan
    if (!subscription || subscription.planType !== 'premium') {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  };

  const handleSelectClient = async (client) => {
    // Check premium access before allowing disbursement creation
    if (!checkPremiumAccess()) {
      return;
    }

    setSelectedClient(client);
    setDisbursementAmount('');
    setMedicalProviderPayments([]);
    setTotalMedicalPayments(0);
    
    // Load medical providers associated with this client
    const providers = await loadClientMedicalProviders(client.id);
    
    // Initialize payment amounts (law firm can edit these)
    const initialPayments = providers.map(provider => ({
      providerId: provider.id,
      providerName: provider.providerName,
      amount: '',
      email: provider.email
    }));
    
    setMedicalProviderPayments(initialPayments);
    setShowDisbursementModal(true);
  };

  const updateMedicalPayment = (index, amount) => {
    const updated = [...medicalProviderPayments];
    updated[index].amount = amount;
    setMedicalProviderPayments(updated);
    
    // Calculate total medical payments
    const total = updated.reduce((sum, payment) => {
      const amt = parseFloat(payment.amount) || 0;
      return sum + amt;
    }, 0);
    setTotalMedicalPayments(total);
  };

  const calculatePlatformFee = () => {
    // $200 per disbursement transaction
    return 200;
  };

  const calculateTotalDisbursement = () => {
    const clientAmount = parseCurrency(disbursementAmount);
    const medicalTotal = totalMedicalPayments;
    const platformFee = calculatePlatformFee();
    
    return clientAmount + medicalTotal + platformFee;
  };

  const validateDisbursement = () => {
    const clientAmount = parseCurrency(disbursementAmount);
    
    if (!clientAmount || clientAmount <= 0) {
      Alert.alert('Error', 'Please enter a valid client disbursement amount');
      return false;
    }

    // Validate medical provider payments
    for (let payment of medicalProviderPayments) {
      if (payment.amount && payment.amount.trim() !== '') {
        const amt = parseCurrency(payment.amount);
        if (amt <= 0) {
          Alert.alert('Error', `Invalid amount for ${payment.providerName}`);
          return false;
        }
      }
    }

    return true;
  };

  const handleProcessDisbursement = async () => {
    if (!validateDisbursement()) {
      return;
    }

    const clientAmount = parseCurrency(disbursementAmount);
    const totalAmount = calculateTotalDisbursement();

    Alert.alert(
      'Confirm Disbursement',
      `Client Payment: $${clientAmount.toFixed(2)}\n` +
      `Medical Providers: $${totalMedicalPayments.toFixed(2)}\n` +
      `Platform Fee: $${calculatePlatformFee().toFixed(2)}\n` +
      `Total to Charge: $${totalAmount.toFixed(2)}\n\n` +
      `Process this disbursement?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Process Payment',
          onPress: () => processDisbursement()
        }
      ]
    );
  };

  const processDisbursement = async () => {
    setProcessingPayment(true);

    try {
      // Filter out medical payments with no amount
      const validMedicalPayments = medicalProviderPayments
        .filter(p => p.amount && parseCurrency(p.amount) > 0)
        .map(p => ({
          providerId: p.providerId,
          providerName: p.providerName,
          amount: parseCurrency(p.amount),
          email: p.email
        }));

      const response = await apiRequest(API_ENDPOINTS.DISBURSEMENTS.PROCESS, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          clientAmount: parseCurrency(disbursementAmount),
          medicalPayments: validMedicalPayments,
          platformFee: calculatePlatformFee()
        })
      });

      if (response.success) {
        Alert.alert(
          '✅ Disbursement Successful',
          `Settlement proceeds have been disbursed!\n\n` +
          `Client: $${response.clientAmount.toFixed(2)}\n` +
          `Medical Providers: $${response.medicalTotal.toFixed(2)}\n` +
          `Transaction ID: ${response.transactionId}`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDisbursementModal(false);
                loadClients();
                loadDisbursementHistory();
                setActiveTab('history');
              }
            }
          ]
        );
      }
    } catch (error) {
      Alert.alert(
        'Payment Failed',
        error.message || 'Failed to process disbursement. Please try again.'
      );
    } finally {
      setProcessingPayment(false);
    }
  };

  const renderDisbursementModal = () => (
    <Modal
      visible={showDisbursementModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowDisbursementModal(false)}
    >
      <View style={styles.modalContainer}>
        <ScrollView style={styles.modalScroll}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Settlement Disbursement</Text>
            <Text style={styles.modalSubtitle}>
              {selectedClient?.firstName} {selectedClient?.lastName}
            </Text>
          </View>

          {/* Client Payment Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Client Payment</Text>
            <Text style={styles.inputLabel}>Amount to Client *</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={disbursementAmount}
              onChangeText={(text) => setDisbursementAmount(sanitizeCurrencyInput(text))}
            />
          </View>

          {/* Medical Provider Payments Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Medical Provider Payments</Text>
            <Text style={styles.helperText}>
              Enter amounts to pay to medical providers (optional)
            </Text>
            
            {medicalProviderPayments.length === 0 ? (
              <Text style={styles.noProvidersText}>
                No medical providers connected to this client
              </Text>
            ) : (
              medicalProviderPayments.map((payment, index) => (
                <View key={index} style={styles.providerPaymentRow}>
                  <View style={styles.providerInfo}>
                    <Text style={styles.providerName}>{payment.providerName}</Text>
                    <Text style={styles.providerEmail}>{payment.email}</Text>
                  </View>
                  <TextInput
                    style={styles.providerAmountInput}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    value={payment.amount}
                    onChangeText={(text) => updateMedicalPayment(index, sanitizeCurrencyInput(text))}
                  />
                </View>
              ))
            )}
          </View>

          {/* Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Client Payment:</Text>
              <Text style={styles.summaryValue}>
                ${parseCurrency(disbursementAmount).toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Medical Providers:</Text>
              <Text style={styles.summaryValue}>
                ${totalMedicalPayments.toFixed(2)}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Platform Fee:</Text>
              <Text style={styles.summaryValue}>
                ${calculatePlatformFee().toFixed(2)}
              </Text>
            </View>

            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total to Charge:</Text>
              <Text style={styles.totalValue}>
                ${calculateTotalDisbursement().toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowDisbursementModal(false)}
              disabled={processingPayment}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.processButton,
                processingPayment && styles.processingButton
              ]}
              onPress={handleProcessDisbursement}
              disabled={processingPayment}
            >
              {processingPayment ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.processButtonText}>Process Payment</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const getFilteredClients = () => {
    if (!searchQuery.trim()) {
      return clients;
    }

    const query = searchQuery.toLowerCase();
    return clients.filter(client => {
      const firstName = (client.firstName || '').toLowerCase();
      const lastName = (client.lastName || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const fullName = `${client.firstName || ''} ${client.lastName || ''}`.toLowerCase();
      
      return firstName.includes(query) ||
             lastName.includes(query) ||
             email.includes(query) ||
             fullName.includes(query);
    });
  };

  const renderNewDisbursements = () => {
    // Show loading state while checking subscription
    if (loadingSubscription) {
      return (
        <View style={styles.tabContent}>
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      );
    }

    // Show upgrade invitation for standard plan users (skip during launch promo)
    if (!IS_LAUNCH_PROMO && subscription && subscription.planType !== 'premium') {
      return (
        <View style={styles.tabContent}>
          <View style={styles.upgradeInvitationCard}>
            <View style={styles.upgradeIconContainer}>
              <Text style={styles.upgradeIcon}>⭐</Text>
            </View>
            <Text style={styles.upgradeInvitationTitle}>
              Unlock Settlement Disbursements
            </Text>
            <Text style={styles.upgradeInvitationMessage}>
              Settlement disbursements are a premium feature. Upgrade to Premium to process payments to clients and medical providers directly through the app.
            </Text>
            
            <View style={styles.upgradeFeatureList}>
              <Text style={styles.upgradeFeatureListTitle}>With Premium, you can:</Text>
              <View style={styles.upgradeFeatureItem}>
                <Text style={styles.upgradeFeatureIcon}>✓</Text>
                <Text style={styles.upgradeFeatureText}>Disburse settlement proceeds to clients</Text>
              </View>
              <View style={styles.upgradeFeatureItem}>
                <Text style={styles.upgradeFeatureIcon}>✓</Text>
                <Text style={styles.upgradeFeatureText}>Pay medical providers directly</Text>
              </View>
              <View style={styles.upgradeFeatureItem}>
                <Text style={styles.upgradeFeatureIcon}>✓</Text>
                <Text style={styles.upgradeFeatureText}>Track disbursement history</Text>
              </View>
              <View style={styles.upgradeFeatureItem}>
                <Text style={styles.upgradeFeatureIcon}>✓</Text>
                <Text style={styles.upgradeFeatureText}>Streamline your settlement process</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.upgradeInvitationButton}
              onPress={() => {
                if (onNavigate) {
                  onNavigate('LawFirmSubscription');
                }
              }}
            >
              <Text style={styles.upgradeInvitationButtonText}>
                Upgrade to Premium ⭐
              </Text>
            </TouchableOpacity>

            <Text style={styles.upgradeInvitationFooter}>
              Questions? Contact our support team for more information.
            </Text>
          </View>
        </View>
      );
    }

    const filteredClients = getFilteredClients();

    return (
      <View style={styles.tabContent}>
        <Text style={styles.headerText}>
          Select a client to disburse settlement proceeds
        </Text>

        {!loading && clients.length > 0 && (
          <View style={styles.searchContainer}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients by name or email..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity 
                style={styles.clearButton}
                onPress={() => setSearchQuery('')}
              >
                <Text style={styles.clearButtonText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.loader} />
        ) : clients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No clients available for disbursement
            </Text>
            <Text style={styles.emptyStateSubtext}>
              All eligible clients have received their final settlement
            </Text>
          </View>
        ) : filteredClients.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No clients found
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Try a different search term
            </Text>
          </View>
        ) : (
          <ScrollView style={styles.clientList}>
            {filteredClients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={styles.clientCard}
                onPress={() => handleSelectClient(client)}
              >
                <View style={styles.clientInfo}>
                  <Text style={styles.clientName}>
                    {client.firstName} {client.lastName}
                  </Text>
                  <Text style={styles.clientEmail}>{client.email}</Text>
                </View>
                <View style={styles.disbursementBadge}>
                  <Text style={styles.disbursementBadgeText}>Disburse →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderHistory = () => (
    <View style={styles.tabContent}>
      <Text style={styles.headerText}>
        Disbursement History
      </Text>

      {disbursementHistory.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No disbursements yet</Text>
          <Text style={styles.emptyStateSubtext}>
            Completed disbursements will appear here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.historyList}>
          {disbursementHistory.map((disbursement) => (
            <View key={disbursement.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyClientName}>
                  {disbursement.clientName}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(disbursement.createdAt).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.historyDetails}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Client Payment:</Text>
                  <Text style={styles.historyAmount}>
                    ${disbursement.clientAmount.toFixed(2)}
                  </Text>
                </View>

                {disbursement.medicalTotal > 0 && (
                  <View style={styles.historyRow}>
                    <Text style={styles.historyLabel}>Medical Providers:</Text>
                    <Text style={styles.historyAmount}>
                      ${disbursement.medicalTotal.toFixed(2)}
                    </Text>
                  </View>
                )}

                <View style={styles.historyRow}>
                  <Text style={styles.historyLabel}>Platform Fee:</Text>
                  <Text style={styles.historyAmount}>
                    ${disbursement.platformFee.toFixed(2)}
                  </Text>
                </View>

                <View style={[styles.historyRow, styles.historyTotalRow]}>
                  <Text style={styles.historyTotalLabel}>Total Charged:</Text>
                  <Text style={styles.historyTotalAmount}>
                    ${disbursement.totalAmount.toFixed(2)}
                  </Text>
                </View>
              </View>

              <View style={styles.historyFooter}>
                <Text style={styles.transactionId}>
                  Transaction: {disbursement.stripeTransferId?.slice(-12) || 'N/A'}
                </Text>
                <View style={[
                  styles.statusBadge,
                  disbursement.status === 'completed' && styles.statusSuccess
                ]}>
                  <Text style={styles.statusText}>
                    {disbursement.status === 'completed' ? '✓ Completed' : disbursement.status}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderStripeConnectBanner = () => {
    // Show loading state while checking subscription
    if (loadingSubscription) {
      return (
        <View style={styles.stripeConnectBanner}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.stripeConnectText}>Loading...</Text>
        </View>
      );
    }

    // Check if user is on standard plan - show upgrade notification
    if (subscription && subscription.planType !== 'premium') {
      return (
        <View style={[styles.stripeConnectBanner, styles.stripeConnectUpgrade]}>
          <View style={styles.stripeConnectContent}>
            <Text style={styles.stripeConnectIcon}>⭐</Text>
            <View style={styles.stripeConnectTextContainer}>
              <Text style={styles.stripeConnectTitle}>Premium Feature</Text>
              <Text style={styles.stripeConnectDescription}>
                Settlement disbursements require a Premium plan. Upgrade to unlock this feature.
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stripeConnectButtonUpgrade}
            onPress={() => onNavigate('LawFirmSubscription')}
          >
            <Text style={styles.stripeConnectButtonTextUpgrade}>Upgrade Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (checkingStripeStatus) {
      return (
        <View style={styles.stripeConnectBanner}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={styles.stripeConnectText}>Checking payment account...</Text>
        </View>
      );
    }

    if (!stripeAccountStatus?.hasAccount) {
      return (
        <View style={[styles.stripeConnectBanner, styles.stripeConnectWarning]}>
          <View style={styles.stripeConnectContent}>
            <Text style={styles.stripeConnectIcon}>⚠️</Text>
            <View style={styles.stripeConnectTextContainer}>
              <Text style={styles.stripeConnectTitle}>Payment Account Required</Text>
              <Text style={styles.stripeConnectDescription}>
                Set up your payment account to receive/send settlement disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stripeConnectButton}
            onPress={handleNavigateToStripeSetup}
          >
            <Text style={styles.stripeConnectButtonText}>Set Up Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.hasAccount && !stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.stripeConnectBanner, styles.stripeConnectWarning]}>
          <View style={styles.stripeConnectContent}>
            <Text style={styles.stripeConnectIcon}>⚠️</Text>
            <View style={styles.stripeConnectTextContainer}>
              <Text style={styles.stripeConnectTitle}>Complete Payment Setup</Text>
              <Text style={styles.stripeConnectDescription}>
                Finish your account setup to receive/send disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stripeConnectButton}
            onPress={handleNavigateToStripeSetup}
          >
            <Text style={styles.stripeConnectButtonText}>Resume Setup</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (stripeAccountStatus?.onboardingComplete) {
      return (
        <View style={[styles.stripeConnectBanner, styles.stripeConnectSuccess]}>
          <View style={styles.stripeConnectContent}>
            <Text style={styles.stripeConnectIcon}>✓</Text>
            <View style={styles.stripeConnectTextContainer}>
              <Text style={styles.stripeConnectTitle}>Payment Account Active</Text>
              <Text style={styles.stripeConnectDescription}>
                Ready to process disbursements
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.stripeConnectButtonSecondary}
            onPress={handleNavigateToStripeSetup}
          >
            <Text style={styles.stripeConnectButtonTextSecondary}>Manage</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settlement Disbursements</Text>
        </View>
      </View>

      {/* Stripe Connect Status Banner */}
      {renderStripeConnectBanner()}

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.activeTab]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>
            New Disbursement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'new' ? renderNewDisbursements() : renderHistory()}

      {/* Disbursement Modal */}
      {renderDisbursementModal()}

      {/* Upgrade Modal */}
      <Modal
        visible={showUpgradeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUpgradeModal(false)}
      >
        <View style={styles.upgradeModalOverlay}>
          <View style={styles.upgradeModalContent}>
            <Text style={styles.upgradeModalIcon}>⭐</Text>
            <Text style={styles.upgradeModalTitle}>Premium Feature</Text>
            <Text style={styles.upgradeModalMessage}>
              Settlement disbursements are only available with a Premium plan. 
              Upgrade your subscription to unlock this powerful feature and process 
              payments to clients and medical providers.
            </Text>
            <View style={styles.upgradeModalButtons}>
              <TouchableOpacity
                style={styles.upgradeButton}
                onPress={() => {
                  setShowUpgradeModal(false);
                  if (onBack) onBack();
                }}
              >
                <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.upgradeModalCancelButton}
                onPress={() => setShowUpgradeModal(false)}
              >
                <Text style={styles.upgradeModalCancelText}>Not Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  header: {
    backgroundColor: '#1E3A5F',
    padding: 16,
    paddingTop: 50,
    paddingBottom: 16
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  backButton: {
    padding: 8,
    marginRight: 12
  },
  backButtonText: {
    color: '#C0C0C0',
    fontSize: 22,
    fontWeight: '600'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  activeTab: {
    borderBottomColor: '#1E3A5F'
  },
  tabText: {
    fontSize: 16,
    color: '#64748B'
  },
  activeTabText: {
    color: '#1E3A5F',
    fontWeight: '600'
  },
  tabContent: {
    flex: 1,
    padding: 20
  },
  headerText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 20
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: 'rgba(30, 58, 95, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
    color: '#94A3B8'
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A5F',
    padding: 0
  },
  clearButton: {
    padding: 4,
    marginLeft: 8
  },
  clearButtonText: {
    fontSize: 20,
    color: '#94A3B8',
    fontWeight: '300'
  },
  loader: {
    marginTop: 50
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 16
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 8
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center'
  },
  clientList: {
    flex: 1
  },
  clientCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
    shadowColor: 'rgba(30, 58, 95, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3
  },
  clientInfo: {
    flex: 1
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 4
  },
  clientEmail: {
    fontSize: 14,
    color: '#64748B'
  },
  disbursementBadge: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20
  },
  disbursementBadgeText: {
    color: '#FFFFFF',
    fontWeight: '600'
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F5F7FA'
  },
  modalScroll: {
    flex: 1
  },
  modalHeader: {
    backgroundColor: '#1E3A5F',
    padding: 20,
    paddingTop: 60
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#C0C0C0',
    opacity: 0.9
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    backgroundColor: '#FFFFFF'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 8
  },
  amountInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 15,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E3A5F'
  },
  helperText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16
  },
  noProvidersText: {
    fontSize: 14,
    color: '#94A3B8',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20
  },
  providerPaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA'
  },
  providerInfo: {
    flex: 1,
    marginRight: 12
  },
  providerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E3A5F',
    marginBottom: 2
  },
  providerEmail: {
    fontSize: 12,
    color: '#64748B'
  },
  providerAmountInput: {
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    width: 120,
    textAlign: 'right',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    color: '#1E3A5F'
  },
  summarySection: {
    padding: 20,
    backgroundColor: '#EDF1F7'
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 16
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748B'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1E3A5F'
  },
  totalRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#C0C0C0'
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F'
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E3A5F'
  },
  modalActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    backgroundColor: '#FFFFFF'
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B'
  },
  processButton: {
    flex: 1,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center'
  },
  processingButton: {
    opacity: 0.7
  },
  processButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  historyList: {
    flex: 1
  },
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    borderLeftColor: '#1E3A5F',
    shadowColor: 'rgba(30, 58, 95, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA'
  },
  historyClientName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A5F'
  },
  historyDate: {
    fontSize: 14,
    color: '#94A3B8'
  },
  historyDetails: {
    marginBottom: 12
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  historyLabel: {
    fontSize: 14,
    color: '#64748B'
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E3A5F'
  },
  historyTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  historyTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A5F'
  },
  historyTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E3A5F'
  },
  historyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F7FA'
  },
  transactionId: {
    fontSize: 12,
    color: '#94A3B8'
  },
  statusBadge: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  statusSuccess: {
    backgroundColor: '#10B981'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF'
  },
  stripeConnectBanner: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  stripeConnectWarning: {
    backgroundColor: '#FFF3CD',
    borderBottomColor: '#FFA500'
  },
  stripeConnectSuccess: {
    backgroundColor: '#D4EDDA',
    borderBottomColor: '#4CAF50'
  },
  stripeConnectUpgrade: {
    backgroundColor: '#FFF9E6',
    borderBottomColor: theme.colors.warmGold
  },
  stripeConnectContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center'
  },
  stripeConnectIcon: {
    fontSize: 24,
    marginRight: 12
  },
  stripeConnectTextContainer: {
    flex: 1
  },
  stripeConnectTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  stripeConnectDescription: {
    fontSize: 13,
    color: '#666'
  },
  stripeConnectText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 12
  },
  stripeConnectButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 12
  },
  stripeConnectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  stripeConnectButtonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginLeft: 12
  },
  stripeConnectButtonTextSecondary: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600'
  },
  stripeConnectButtonUpgrade: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    marginLeft: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary
  },
  stripeConnectButtonTextUpgrade: {
    color: theme.colors.navy,
    fontSize: 14,
    fontWeight: 'bold'
  },
  upgradeInvitationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: theme.colors.warmGold
  },
  upgradeIconContainer: {
    backgroundColor: '#FFF9E6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: theme.colors.warmGold
  },
  upgradeIcon: {
    fontSize: 40
  },
  upgradeInvitationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 16,
    textAlign: 'center'
  },
  upgradeInvitationMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  upgradeFeatureList: {
    width: '100%',
    marginBottom: 24
  },
  upgradeFeatureListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 12
  },
  upgradeFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingLeft: 10
  },
  upgradeFeatureIcon: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginRight: 12,
    width: 20
  },
  upgradeFeatureText: {
    flex: 1,
    fontSize: 15,
    color: '#555',
    lineHeight: 22
  },
  upgradeInvitationButton: {
    backgroundColor: theme.colors.warmGold,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: theme.colors.secondary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3
  },
  upgradeInvitationButtonText: {
    color: theme.colors.navy,
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  upgradeInvitationFooter: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic'
  },
  upgradeModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  upgradeModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10
  },
  upgradeModalIcon: {
    fontSize: 60,
    marginBottom: 16
  },
  upgradeModalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 12,
    textAlign: 'center'
  },
  upgradeModalMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24
  },
  upgradeModalButtons: {
    width: '100%'
  },
  upgradeButton: {
    backgroundColor: theme.colors.warmGold,
    paddingVertical: 14,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: theme.colors.secondary
  },
  upgradeButtonText: {
    color: theme.colors.navy,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  upgradeModalCancelButton: {
    paddingVertical: 12
  },
  upgradeModalCancelText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center'
  }
});

export default DisbursementDashboardScreen;