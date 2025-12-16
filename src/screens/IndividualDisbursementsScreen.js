import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Alert
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const IndividualDisbursementsScreen = ({ user, onBack }) => {
  const [disbursements, setDisbursements] = useState([]);
  const [bankInfo, setBankInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountHolder: '',
    routingNumber: '',
    accountNumber: '',
    accountType: 'checking'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([loadDisbursements(), loadBankInfo()]);
    } finally {
      setLoading(false);
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

  const loadBankInfo = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.BANK_INFO.GET, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setBankInfo(response.bankInfo);
    } catch (error) {
      console.error('Error loading bank info:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleSaveBankInfo = async () => {
    if (!bankForm.bankName || !bankForm.accountHolder || !bankForm.routingNumber || !bankForm.accountNumber) {
      Alert.alert('Missing Information', 'Please fill in all bank information fields.');
      return;
    }

    if (!/^\d{9}$/.test(bankForm.routingNumber)) {
      Alert.alert('Invalid Routing Number', 'Routing number must be exactly 9 digits.');
      return;
    }

    if (!/^\d{4,17}$/.test(bankForm.accountNumber)) {
      Alert.alert('Invalid Account Number', 'Account number must be between 4 and 17 digits.');
      return;
    }

    try {
      setSavingBank(true);
      const response = await apiRequest(API_ENDPOINTS.BANK_INFO.SAVE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(bankForm)
      });

      setBankInfo(response.bankInfo);
      setShowBankModal(false);
      setBankForm({ bankName: '', accountHolder: '', routingNumber: '', accountNumber: '', accountType: 'checking' });
      Alert.alert('Success', 'Bank information saved securely.');
    } catch (error) {
      console.error('Error saving bank info:', error);
      Alert.alert('Error', 'Failed to save bank information. Please try again.');
    } finally {
      setSavingBank(false);
    }
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

  const renderBankInfoSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Bank Information</Text>
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setShowBankModal(true)}
        >
          <Text style={styles.editButtonText}>{bankInfo ? 'Update' : 'Add'}</Text>
        </TouchableOpacity>
      </View>

      {bankInfo ? (
        <View style={styles.bankCard}>
          <View style={styles.bankCardHeader}>
            <Text style={styles.bankIcon}>🏦</Text>
            <View style={styles.bankCardTitle}>
              <Text style={styles.bankName}>{bankInfo.bankName}</Text>
              <Text style={styles.accountHolder}>{bankInfo.accountHolder}</Text>
            </View>
            {bankInfo.isVerified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>Verified</Text>
              </View>
            )}
          </View>

          <View style={styles.bankCardDivider} />

          <View style={styles.bankDetails}>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Routing Number</Text>
              <Text style={styles.bankDetailValue}>{bankInfo.routingNumberRedacted}</Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Number</Text>
              <Text style={styles.bankDetailValue}>{bankInfo.accountNumberRedacted}</Text>
            </View>
            <View style={styles.bankDetailRow}>
              <Text style={styles.bankDetailLabel}>Account Type</Text>
              <Text style={[styles.bankDetailValue, { textTransform: 'capitalize' }]}>
                {bankInfo.accountType}
              </Text>
            </View>
          </View>

          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>
              Your bank information is encrypted and securely stored. Only partial numbers are displayed for your protection.
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyBankCard}>
          <Text style={styles.emptyBankIcon}>🏦</Text>
          <Text style={styles.emptyBankTitle}>No Bank Information</Text>
          <Text style={styles.emptyBankText}>
            Add your bank account to receive settlement disbursements directly.
          </Text>
          <TouchableOpacity 
            style={styles.addBankButton}
            onPress={() => setShowBankModal(true)}
          >
            <Text style={styles.addBankButtonText}>Add Bank Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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

  const renderBankModal = () => (
    <Modal
      visible={showBankModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowBankModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {bankInfo ? 'Update Bank Information' : 'Add Bank Information'}
            </Text>
            <TouchableOpacity onPress={() => setShowBankModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bank Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter bank name"
                placeholderTextColor="#999"
                value={bankForm.bankName}
                onChangeText={(text) => setBankForm({ ...bankForm, bankName: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account Holder Name</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter account holder name"
                placeholderTextColor="#999"
                value={bankForm.accountHolder}
                onChangeText={(text) => setBankForm({ ...bankForm, accountHolder: text })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Routing Number (9 digits)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter routing number"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={9}
                value={bankForm.routingNumber}
                onChangeText={(text) => setBankForm({ ...bankForm, routingNumber: text.replace(/\D/g, '') })}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account Number</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Enter account number"
                placeholderTextColor="#999"
                keyboardType="numeric"
                maxLength={17}
                value={bankForm.accountNumber}
                onChangeText={(text) => setBankForm({ ...bankForm, accountNumber: text.replace(/\D/g, '') })}
                secureTextEntry={true}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Account Type</Text>
              <View style={styles.accountTypeButtons}>
                <TouchableOpacity 
                  style={[
                    styles.accountTypeButton, 
                    bankForm.accountType === 'checking' && styles.accountTypeButtonActive
                  ]}
                  onPress={() => setBankForm({ ...bankForm, accountType: 'checking' })}
                >
                  <Text style={[
                    styles.accountTypeButtonText,
                    bankForm.accountType === 'checking' && styles.accountTypeButtonTextActive
                  ]}>Checking</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.accountTypeButton, 
                    bankForm.accountType === 'savings' && styles.accountTypeButtonActive
                  ]}
                  onPress={() => setBankForm({ ...bankForm, accountType: 'savings' })}
                >
                  <Text style={[
                    styles.accountTypeButtonText,
                    bankForm.accountType === 'savings' && styles.accountTypeButtonTextActive
                  ]}>Savings</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.securityNote}>
              <Text style={styles.securityIcon}>🔒</Text>
              <Text style={styles.securityText}>
                Your bank information is encrypted using AES-256 encryption and stored securely. We never store your full account number in plain text.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowBankModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.saveButton, savingBank && styles.saveButtonDisabled]}
              onPress={handleSaveBankInfo}
              disabled={savingBank}
            >
              {savingBank ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Securely</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
        {renderBankInfoSection()}
        {renderDisbursementsSection()}
      </ScrollView>

      {renderBankModal()}
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
});

export default IndividualDisbursementsScreen;
