import React, { useState, useEffect } from 'react';
import {
 View,
 Text,
 StyleSheet,
 ScrollView,
 TouchableOpacity,
 ActivityIndicator,
 RefreshControl } from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const IndividualDisbursementsScreen = ({ user, onBack, onNavigate }) => {
  const [disbursements, setDisbursements] = useState([]);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDisbursements()]);
      loadStripeStatus();
    } finally {
      setLoading(false);
    }
  };

  const loadStripeStatus = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.STRIPE_CONNECT.ACCOUNT_STATUS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setStripeAccountStatus(response);
    } catch (error) {
      console.error('Error loading Stripe account status:', error);
    }
  };

  const loadDisbursements = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DISBURSEMENTS.GET_RECEIVED, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setDisbursements(response.disbursements || []);
    } catch (error) {
      console.error('Error loading disbursements:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'pending': { bg: '#FFF3CD', text: '#856404', label: 'Pending' },
      'completed': { bg: '#D4EDDA', text: '#155724', label: 'Completed' },
      'failed': { bg: '#F8D7DA', text: '#721C24', label: 'Failed' }
    };
    const statusStyle = statusColors[status] || statusColors['pending'];
    return (
      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
        <Text style={[styles.statusText, { color: statusStyle.text }]}>
          {statusStyle.label}
        </Text>
      </View>
    );
  };

  const renderStripeConnectSection = () => {
    const hasAccount = stripeAccountStatus?.hasAccount;
    const isComplete = stripeAccountStatus?.onboardingComplete;

    if (hasAccount && isComplete) {
      return (
        <View style={styles.section}>
          <View style={[styles.stripeStatusBanner, styles.stripeStatusReady]}>
            <Text style={styles.stripeStatusIcon}>✓</Text>
            <View style={styles.stripeStatusContent}>
              <Text style={styles.stripeStatusTitle}>Payout Account Active</Text>
              <Text style={styles.stripeStatusText}>
                Your Stripe account is set up and ready to receive electronic disbursements.
              </Text>
            </View>
          </View>
          {onNavigate && (
            <TouchableOpacity
              style={styles.stripeManageButton}
              onPress={() => onNavigate('individual-payment-setup')}
            >
              <Text style={styles.stripeManageButtonText}>Manage Payout Account</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    if (hasAccount && !isComplete) {
      return (
        <View style={styles.section}>
          <View style={[styles.stripeStatusBanner, styles.stripeStatusPending]}>
            <Text style={styles.stripeStatusIcon}>⚠️</Text>
            <View style={styles.stripeStatusContent}>
              <Text style={styles.stripeStatusTitle}>Setup Incomplete</Text>
              <Text style={styles.stripeStatusText}>
                Your payout account setup is not finished. Complete it to receive electronic disbursements from your law firm.
              </Text>
            </View>
          </View>
          {onNavigate && (
            <TouchableOpacity
              style={styles.stripeSetupButton}
              onPress={() => onNavigate('individual-payment-setup')}
            >
              <Text style={styles.stripeSetupButtonText}>Complete Payout Setup</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.section}>
        <View style={[styles.stripeStatusBanner, styles.stripeStatusSetup]}>
          <Text style={styles.stripeStatusIcon}>💰</Text>
          <View style={styles.stripeStatusContent}>
            <Text style={styles.stripeStatusTitle}>Set Up Electronic Payouts</Text>
            <Text style={styles.stripeStatusText}>
              Connect your bank account through Stripe to receive settlement disbursements electronically. This is the fastest and most secure way to get paid.
            </Text>
          </View>
        </View>
        {onNavigate && (
          <TouchableOpacity
            style={styles.stripeSetupButton}
            onPress={() => onNavigate('individual-payment-setup')}
          >
            <Text style={styles.stripeSetupButtonText}>Set Up Payout Account</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderDisbursementsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Settlement Disbursements</Text>

      {disbursements.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>💰</Text>
          <Text style={styles.emptyStateTitle}>No Disbursements Yet</Text>
          <Text style={styles.emptyStateText}>
            When your law firm processes settlement disbursements, they will appear here.
          </Text>
        </View>
      ) : (
        disbursements.map((disbursement) => (
          <View key={disbursement.id} style={styles.disbursementCard}>
            <View style={styles.disbursementHeader}>
              <View style={styles.disbursementHeaderLeft}>
                <Text style={styles.disbursementIcon}>💰</Text>
                <View>
                  <Text style={styles.disbursementTitle}>Settlement Disbursement</Text>
                  <Text style={styles.disbursementSubtitle}>from {disbursement.lawFirmName}</Text>
                </View>
              </View>
              {getStatusBadge(disbursement.status)}
            </View>

            <View style={styles.disbursementDivider} />

            <View style={styles.disbursementBody}>
              <View style={styles.disbursementRow}>
                <Text style={styles.disbursementLabel}>Amount:</Text>
                <Text style={styles.disbursementAmount}>{formatCurrency(disbursement.amount)}</Text>
              </View>
              <View style={styles.disbursementRow}>
                <Text style={styles.disbursementLabel}>Date:</Text>
                <Text style={styles.disbursementValue}>{formatDate(disbursement.createdAt)}</Text>
              </View>
              {disbursement.stripeTransferId && (
                <View style={styles.disbursementRow}>
                  <Text style={styles.disbursementLabel}>Transaction ID:</Text>
                  <Text style={styles.disbursementValueSmall} numberOfLines={1} ellipsizeMode="middle">
                    {disbursement.stripeTransferId}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ))
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Disbursements</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading disbursements...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Disbursements</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderStripeConnectSection()}
        {renderDisbursementsSection()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.3)',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#D4AF37',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 60,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#D4AF37',
    marginTop: 16,
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  editButtonText: {
    color: '#D4AF37',
    fontSize: 14,
    fontWeight: '600',
  },
  bankCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.4)',
  },
  bankCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bankIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  bankCardTitle: {
    flex: 1,
  },
  bankName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  accountHolder: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 2,
  },
  verifiedBadge: {
    backgroundColor: '#28a745',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bankCardDivider: {
    height: 1,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
    marginVertical: 12,
  },
  bankDetails: {
    marginBottom: 12,
  },
  bankDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankDetailLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  bankDetailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(40, 167, 69, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    lineHeight: 18,
  },
  emptyBankCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.4)',
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyBankIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyBankTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyBankText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  addBankButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addBankButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyState: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.4)',
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
  },
  disbursementCard: {
    backgroundColor: 'rgba(30, 30, 30, 0.9)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.4)',
  },
  disbursementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  disbursementHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  disbursementIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  disbursementTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disbursementSubtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  disbursementDivider: {
    height: 1,
    backgroundColor: 'rgba(139, 115, 85, 0.3)',
    marginVertical: 12,
  },
  disbursementBody: {},
  disbursementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  disbursementLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
  },
  disbursementAmount: {
    color: '#28a745',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disbursementValue: {
    color: '#fff',
    fontSize: 14,
  },
  disbursementValueSmall: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    fontFamily: 'monospace',
    maxWidth: 150,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.4)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 115, 85, 0.3)',
  },
  modalTitle: {
    color: '#D4AF37',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalClose: {
    color: '#D4AF37',
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  formInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)',
  },
  accountTypeButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  accountTypeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)',
    alignItems: 'center',
  },
  accountTypeButtonActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderColor: '#D4AF37',
  },
  accountTypeButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  accountTypeButtonTextActive: {
    color: '#D4AF37',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(139, 115, 85, 0.3)',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 115, 85, 0.3)',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stripeStatusBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  stripeStatusReady: {
    backgroundColor: 'rgba(40, 167, 69, 0.15)',
    borderColor: 'rgba(40, 167, 69, 0.4)',
  },
  stripeStatusPending: {
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderColor: 'rgba(255, 193, 7, 0.4)',
  },
  stripeStatusSetup: {
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
    borderColor: 'rgba(212, 175, 55, 0.3)',
  },
  stripeStatusIcon: {
    fontSize: 24,
    marginRight: 12,
    marginTop: 2,
  },
  stripeStatusContent: {
    flex: 1,
  },
  stripeStatusTitle: {
    color: '#D4AF37',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stripeStatusText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    lineHeight: 20,
  },
  stripeSetupButton: {
    backgroundColor: '#D4AF37',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  stripeSetupButtonText: {
    color: '#1a1a2e',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stripeManageButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(40, 167, 69, 0.5)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  stripeManageButtonText: {
    color: '#28a745',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default IndividualDisbursementsScreen;
