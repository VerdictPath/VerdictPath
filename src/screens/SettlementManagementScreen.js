import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  Platform
} from 'react-native';
import alert from '../utils/alert';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';

const sanitizeCurrency = (value) => {
  if (!value) return '';
  return value.replace(/[$,\s]/g, '').replace(/[^0-9.]/g, '');
};

const parseCurrency = (value) => {
  const parsed = parseFloat(sanitizeCurrency(value));
  return isNaN(parsed) ? 0 : parsed;
};

const STATUS_COLORS = {
  pending: { bg: '#F3F4F6', text: '#6B7280' },
  settled: { bg: '#DBEAFE', text: '#2563EB' },
  iolta_deposited: { bg: '#EDE9FE', text: '#7C3AED' },
  liens_processing: { bg: '#FFF7ED', text: '#EA580C' },
  ready_for_disbursement: { bg: '#DCFCE7', text: '#16A34A' },
  disbursed: { bg: '#D1FAE5', text: '#059669' },
  closed: { bg: '#E5E7EB', text: '#374151' },
};

const STATUS_LABELS = {
  pending: 'Pending',
  settled: 'Settled',
  iolta_deposited: 'IOLTA Deposited',
  liens_processing: 'Liens Processing',
  ready_for_disbursement: 'Ready for Disbursement',
  disbursed: 'Disbursed',
  closed: 'Closed',
};

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'settled', label: 'Settled' },
  { key: 'iolta_deposited', label: 'IOLTA' },
  { key: 'disbursed', label: 'Disbursed' },
];

const SettlementManagementScreen = ({ user, onBack, onNavigate }) => {
  const [view, setView] = useState('list');
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMarkSettledModal, setShowMarkSettledModal] = useState(false);
  const [showIOLTAModal, setShowIOLTAModal] = useState(false);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    clientId: '',
    caseName: '',
    caseNumber: '',
    insuranceCompanyName: '',
    insuranceClaimNumber: '',
    insuranceAdjusterName: '',
    insuranceAdjusterEmail: '',
    insuranceAdjusterPhone: '',
    grossSettlementAmount: '',
    attorneyFees: '',
    attorneyCosts: '',
    settlementDate: '',
    notes: '',
  });

  const [markSettledForm, setMarkSettledForm] = useState({
    settlementDate: '',
    notes: '',
  });

  const [ioltaForm, setIOLTAForm] = useState({
    ioltaDepositAmount: '',
    ioltaReferenceNumber: '',
    ioltaDepositDate: '',
    notes: '',
  });

  useEffect(() => {
    loadSettlements();
  }, []);

  const loadSettlements = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.SETTLEMENTS.LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setSettlements(response.settlements || []);
    } catch (error) {
      alert('Error', error.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM.CLIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setClients(response.clients || []);
    } catch (error) {
      alert('Error', 'Failed to load clients');
    } finally {
      setLoadingClients(false);
    }
  };

  const loadSettlementDetail = async (id) => {
    try {
      setDetailLoading(true);
      const response = await apiRequest(API_ENDPOINTS.SETTLEMENTS.GET(id), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setDetailData(response);
    } catch (error) {
      alert('Error', error.message || 'Failed to load settlement details');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDetail = (settlement) => {
    setSelectedSettlement(settlement);
    setView('detail');
    loadSettlementDetail(settlement.id);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedSettlement(null);
    setDetailData(null);
    loadSettlements();
  };

  const handleOpenCreateModal = () => {
    setCreateForm({
      clientId: '',
      caseName: '',
      caseNumber: '',
      insuranceCompanyName: '',
      insuranceClaimNumber: '',
      insuranceAdjusterName: '',
      insuranceAdjusterEmail: '',
      insuranceAdjusterPhone: '',
      grossSettlementAmount: '',
      attorneyFees: '',
      attorneyCosts: '',
      settlementDate: '',
      notes: '',
    });
    loadClients();
    setShowCreateModal(true);
  };

  const handleCreateSettlement = async () => {
    if (!createForm.clientId) {
      alert('Required Field', 'Please select a client');
      return;
    }
    if (!createForm.insuranceCompanyName.trim()) {
      alert('Required Field', 'Please enter the insurance company name');
      return;
    }
    if (!createForm.grossSettlementAmount || parseCurrency(createForm.grossSettlementAmount) <= 0) {
      alert('Required Field', 'Please enter a valid gross settlement amount');
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        clientId: parseInt(createForm.clientId),
        caseName: createForm.caseName.trim() || undefined,
        caseNumber: createForm.caseNumber.trim() || undefined,
        insuranceCompanyName: createForm.insuranceCompanyName.trim(),
        insuranceClaimNumber: createForm.insuranceClaimNumber.trim() || undefined,
        insuranceAdjusterName: createForm.insuranceAdjusterName.trim() || undefined,
        insuranceAdjusterEmail: createForm.insuranceAdjusterEmail.trim() || undefined,
        insuranceAdjusterPhone: createForm.insuranceAdjusterPhone.trim() || undefined,
        grossSettlementAmount: parseCurrency(createForm.grossSettlementAmount),
        attorneyFees: parseCurrency(createForm.attorneyFees) || 0,
        attorneyCosts: parseCurrency(createForm.attorneyCosts) || 0,
        settlementDate: createForm.settlementDate.trim() || undefined,
        notes: createForm.notes.trim() || undefined,
      };

      await apiRequest(API_ENDPOINTS.SETTLEMENTS.CREATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(body)
      });

      alert('Success', 'Settlement created successfully');
      setShowCreateModal(false);
      loadSettlements();
    } catch (error) {
      alert('Error', error.message || 'Failed to create settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkSettled = async () => {
    if (!selectedSettlement) return;

    try {
      setSubmitting(true);
      await apiRequest(`${API_ENDPOINTS.SETTLEMENTS.GET(selectedSettlement.id)}/mark-settled`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          settlementDate: markSettledForm.settlementDate.trim() || undefined,
          notes: markSettledForm.notes.trim() || undefined,
        })
      });

      alert('Success', 'Settlement marked as settled');
      setShowMarkSettledModal(false);
      setMarkSettledForm({ settlementDate: '', notes: '' });
      loadSettlementDetail(selectedSettlement.id);
    } catch (error) {
      alert('Error', error.message || 'Failed to mark settlement as settled');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordIOLTA = async () => {
    if (!selectedSettlement) return;

    if (!ioltaForm.ioltaDepositAmount || parseCurrency(ioltaForm.ioltaDepositAmount) <= 0) {
      alert('Required Field', 'Please enter a valid deposit amount');
      return;
    }

    try {
      setSubmitting(true);
      await apiRequest(`${API_ENDPOINTS.SETTLEMENTS.GET(selectedSettlement.id)}/record-iolta-deposit`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          ioltaDepositAmount: parseCurrency(ioltaForm.ioltaDepositAmount),
          ioltaReferenceNumber: ioltaForm.ioltaReferenceNumber.trim() || undefined,
          ioltaDepositDate: ioltaForm.ioltaDepositDate.trim() || undefined,
          notes: ioltaForm.notes.trim() || undefined,
        })
      });

      alert('Success', 'IOLTA deposit recorded successfully');
      setShowIOLTAModal(false);
      setIOLTAForm({ ioltaDepositAmount: '', ioltaReferenceNumber: '', ioltaDepositDate: '', notes: '' });
      loadSettlementDetail(selectedSettlement.id);
    } catch (error) {
      alert('Error', error.message || 'Failed to record IOLTA deposit');
    } finally {
      setSubmitting(false);
    }
  };

  const getFilteredSettlements = () => {
    if (filterStatus === 'all') return settlements;
    return settlements.filter(s => s.status === filterStatus);
  };

  const formatCurrency = (amount) => {
    return (amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US');
  };

  const getStatusBadge = (status) => {
    const colors = STATUS_COLORS[status] || STATUS_COLORS.pending;
    const label = STATUS_LABELS[status] || status;
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusBadgeText, { color: colors.text }]}>
          {label}
        </Text>
      </View>
    );
  };

  const getNetToClient = () => {
    const gross = parseCurrency(createForm.grossSettlementAmount);
    const fees = parseCurrency(createForm.attorneyFees);
    const costs = parseCurrency(createForm.attorneyCosts);
    return Math.max(0, gross - fees - costs);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={view === 'detail' ? handleBackToList : onBack}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.headerTitle}>
        {view === 'detail' ? 'Settlement Details' : 'Settlements'}
      </Text>
      {view === 'list' && (
        <TouchableOpacity style={styles.createButton} onPress={handleOpenCreateModal}>
          <Text style={styles.createButtonText}>+ New</Text>
        </TouchableOpacity>
      )}
      {view === 'detail' && <View style={{ width: 70 }} />}
    </View>
  );

  const renderFilterTabs = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
      {FILTER_TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[styles.filterTab, filterStatus === tab.key && styles.filterTabActive]}
          onPress={() => setFilterStatus(tab.key)}
        >
          <Text style={[styles.filterTabText, filterStatus === tab.key && styles.filterTabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderSettlementCard = (settlement) => (
    <TouchableOpacity
      key={settlement.id}
      style={styles.card}
      onPress={() => handleViewDetail(settlement)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardCaseName} numberOfLines={1}>
          {settlement.caseName || 'Untitled Settlement'}
        </Text>
        {getStatusBadge(settlement.status)}
      </View>
      <Text style={styles.cardClientName}>{settlement.clientName}</Text>
      <Text style={styles.cardInsurance}>{settlement.insuranceCompanyName}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardAmount}>${formatCurrency(settlement.grossSettlementAmount)}</Text>
        <Text style={styles.cardDate}>{formatDate(settlement.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>⚓</Text>
      <Text style={styles.emptyStateTitle}>No Settlements Found</Text>
      <Text style={styles.emptyStateText}>
        {filterStatus === 'all'
          ? 'Create your first settlement to get started.'
          : `No settlements with status "${STATUS_LABELS[filterStatus] || filterStatus}".`}
      </Text>
    </View>
  );

  const renderListView = () => {
    const filtered = getFilteredSettlements();

    return (
      <View style={styles.container}>
        {renderHeader()}
        {renderFilterTabs()}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A5F" />
            <Text style={styles.loadingText}>Loading settlements...</Text>
          </View>
        ) : (
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
            {filtered.length === 0 ? renderEmptyState() : filtered.map(renderSettlementCard)}
          </ScrollView>
        )}
      </View>
    );
  };

  const renderDetailView = () => {
    const settlement = detailData?.settlement;
    const liens = detailData?.liens || [];
    const disbursements = detailData?.disbursements || [];

    return (
      <View style={styles.container}>
        {renderHeader()}
        {detailLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E3A5F" />
            <Text style={styles.loadingText}>Loading details...</Text>
          </View>
        ) : settlement ? (
          <ScrollView style={styles.listScroll} contentContainerStyle={styles.listContent}>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Case Name</Text>
                <Text style={styles.detailValue}>{settlement.caseName || 'N/A'}</Text>
              </View>
              {settlement.caseNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Case Number</Text>
                  <Text style={styles.detailValue}>{settlement.caseNumber}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Client</Text>
                <Text style={styles.detailValue}>{settlement.clientName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Insurance Company</Text>
                <Text style={styles.detailValue}>{settlement.insuranceCompanyName}</Text>
              </View>
              {settlement.insuranceClaimNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Claim Number</Text>
                  <Text style={styles.detailValue}>{settlement.insuranceClaimNumber}</Text>
                </View>
              )}
              {settlement.insuranceAdjusterName && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Adjuster</Text>
                  <Text style={styles.detailValue}>{settlement.insuranceAdjusterName}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                {getStatusBadge(settlement.status)}
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Settlement Date</Text>
                <Text style={styles.detailValue}>{formatDate(settlement.settlementDate)}</Text>
              </View>
              {settlement.notes && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Notes</Text>
                  <Text style={styles.detailValue}>{settlement.notes}</Text>
                </View>
              )}
            </View>

            <View style={styles.financialCard}>
              <Text style={styles.sectionTitle}>Financial Breakdown</Text>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Gross Settlement</Text>
                <Text style={styles.financialValue}>${formatCurrency(settlement.grossSettlementAmount)}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Attorney Fees</Text>
                <Text style={styles.financialDeduction}>- ${formatCurrency(settlement.attorneyFees)}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Attorney Costs</Text>
                <Text style={styles.financialDeduction}>- ${formatCurrency(settlement.attorneyCosts)}</Text>
              </View>
              <View style={styles.financialRow}>
                <Text style={styles.financialLabel}>Medical Liens</Text>
                <Text style={styles.financialDeduction}>- ${formatCurrency(settlement.totalMedicalLiens)}</Text>
              </View>
              <View style={styles.financialDivider} />
              <View style={styles.financialRow}>
                <Text style={styles.financialTotalLabel}>Net to Client</Text>
                <Text style={styles.financialTotalValue}>${formatCurrency(settlement.netToClient)}</Text>
              </View>
              {settlement.ioltaDepositAmount && (
                <>
                  <View style={styles.financialDivider} />
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>IOLTA Deposit</Text>
                    <Text style={styles.financialValue}>${formatCurrency(settlement.ioltaDepositAmount)}</Text>
                  </View>
                  {settlement.ioltaReferenceNumber && (
                    <View style={styles.financialRow}>
                      <Text style={styles.financialLabel}>Reference #</Text>
                      <Text style={styles.financialValue}>{settlement.ioltaReferenceNumber}</Text>
                    </View>
                  )}
                  <View style={styles.financialRow}>
                    <Text style={styles.financialLabel}>Deposit Date</Text>
                    <Text style={styles.financialValue}>{formatDate(settlement.ioltaDepositDate)}</Text>
                  </View>
                </>
              )}
            </View>

            {settlement.status === 'pending' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => {
                  setMarkSettledForm({ settlementDate: '', notes: '' });
                  setShowMarkSettledModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>Mark as Settled</Text>
              </TouchableOpacity>
            )}

            {settlement.status === 'settled' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#7C3AED' }]}
                onPress={() => {
                  setIOLTAForm({ ioltaDepositAmount: '', ioltaReferenceNumber: '', ioltaDepositDate: '', notes: '' });
                  setShowIOLTAModal(true);
                }}
              >
                <Text style={styles.actionButtonText}>Record IOLTA Deposit</Text>
              </TouchableOpacity>
            )}

            {settlement.status === 'iolta_deposited' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#16A34A' }]}
                onPress={() => onNavigate && onNavigate('lawfirm-disbursements')}
              >
                <Text style={styles.actionButtonText}>Process Disbursement</Text>
              </TouchableOpacity>
            )}

            {liens.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Medical Liens ({liens.length})</Text>
                {liens.map(lien => (
                  <View key={lien.id} style={styles.lienItem}>
                    <View style={styles.lienHeader}>
                      <Text style={styles.lienProvider}>{lien.providerName}</Text>
                      <View style={[styles.statusBadge, {
                        backgroundColor: lien.status === 'paid' ? '#D1FAE5' : '#F3F4F6'
                      }]}>
                        <Text style={[styles.statusBadgeText, {
                          color: lien.status === 'paid' ? '#059669' : '#6B7280'
                        }]}>
                          {(lien.status || '').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.lienDetails}>
                      <Text style={styles.lienDetailText}>Original: ${formatCurrency(lien.originalBillAmount)}</Text>
                      <Text style={styles.lienDetailText}>Lien: ${formatCurrency(lien.lienAmount)}</Text>
                      {lien.negotiatedAmount && (
                        <Text style={styles.lienDetailText}>Negotiated: ${formatCurrency(lien.negotiatedAmount)}</Text>
                      )}
                      {lien.finalPaymentAmount && (
                        <Text style={styles.lienDetailText}>Final: ${formatCurrency(lien.finalPaymentAmount)}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {liens.length === 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Medical Liens</Text>
                <Text style={styles.emptyText}>No medical liens recorded</Text>
              </View>
            )}

            {disbursements.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Disbursement History ({disbursements.length})</Text>
                {disbursements.map(d => (
                  <View key={d.id} style={styles.disbursementItem}>
                    <View style={styles.disbursementRow}>
                      <Text style={styles.disbursementLabel}>Client Amount</Text>
                      <Text style={styles.disbursementValue}>${formatCurrency(d.clientAmount)}</Text>
                    </View>
                    <View style={styles.disbursementRow}>
                      <Text style={styles.disbursementLabel}>Medical Total</Text>
                      <Text style={styles.disbursementValue}>${formatCurrency(d.medicalTotal)}</Text>
                    </View>
                    <View style={styles.disbursementRow}>
                      <Text style={styles.disbursementLabel}>Total</Text>
                      <Text style={[styles.disbursementValue, { fontWeight: '700' }]}>${formatCurrency(d.totalAmount)}</Text>
                    </View>
                    <View style={styles.disbursementRow}>
                      <Text style={styles.disbursementLabel}>Method</Text>
                      <Text style={styles.disbursementValue}>{(d.disbursementMethod || '').replace(/_/g, ' ')}</Text>
                    </View>
                    <Text style={styles.disbursementDate}>{formatDate(d.createdAt)}</Text>
                  </View>
                ))}
              </View>
            )}

            {disbursements.length === 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Disbursement History</Text>
                <Text style={styles.emptyText}>No disbursements processed yet</Text>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Settlement not found</Text>
          </View>
        )}
      </View>
    );
  };

  const renderCreateModal = () => (
    <Modal
      visible={showCreateModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowCreateModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowCreateModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>New Settlement</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.inputLabel}>Client *</Text>
          {loadingClients ? (
            <ActivityIndicator size="small" color="#1E3A5F" style={{ marginBottom: 16 }} />
          ) : (
            <View style={styles.clientSelector}>
              {clients.map(client => (
                <TouchableOpacity
                  key={client.id}
                  style={[
                    styles.clientOption,
                    createForm.clientId === String(client.id) && styles.clientOptionSelected
                  ]}
                  onPress={() => setCreateForm(prev => ({ ...prev, clientId: String(client.id) }))}
                >
                  <Text style={[
                    styles.clientOptionText,
                    createForm.clientId === String(client.id) && styles.clientOptionTextSelected
                  ]}>
                    {client.firstName} {client.lastName}
                  </Text>
                  {createForm.clientId === String(client.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
              {clients.length === 0 && (
                <Text style={styles.noClientsText}>No clients available</Text>
              )}
            </View>
          )}

          <Text style={styles.inputLabel}>Case Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter case name"
            placeholderTextColor="#9CA3AF"
            value={createForm.caseName}
            onChangeText={v => setCreateForm(prev => ({ ...prev, caseName: v }))}
          />

          <Text style={styles.inputLabel}>Case Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            value={createForm.caseNumber}
            onChangeText={v => setCreateForm(prev => ({ ...prev, caseNumber: v }))}
          />

          <Text style={styles.inputLabel}>Insurance Company Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter insurance company"
            placeholderTextColor="#9CA3AF"
            value={createForm.insuranceCompanyName}
            onChangeText={v => setCreateForm(prev => ({ ...prev, insuranceCompanyName: v }))}
          />

          <Text style={styles.inputLabel}>Claim Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            value={createForm.insuranceClaimNumber}
            onChangeText={v => setCreateForm(prev => ({ ...prev, insuranceClaimNumber: v }))}
          />

          <Text style={styles.inputLabel}>Adjuster Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            value={createForm.insuranceAdjusterName}
            onChangeText={v => setCreateForm(prev => ({ ...prev, insuranceAdjusterName: v }))}
          />

          <Text style={styles.inputLabel}>Adjuster Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            keyboardType="email-address"
            value={createForm.insuranceAdjusterEmail}
            onChangeText={v => setCreateForm(prev => ({ ...prev, insuranceAdjusterEmail: v }))}
          />

          <Text style={styles.inputLabel}>Adjuster Phone</Text>
          <TextInput
            style={styles.input}
            placeholder="Optional"
            placeholderTextColor="#9CA3AF"
            keyboardType="phone-pad"
            value={createForm.insuranceAdjusterPhone}
            onChangeText={v => setCreateForm(prev => ({ ...prev, insuranceAdjusterPhone: v }))}
          />

          <Text style={styles.inputLabel}>Gross Settlement Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={createForm.grossSettlementAmount}
            onChangeText={v => setCreateForm(prev => ({ ...prev, grossSettlementAmount: sanitizeCurrency(v) }))}
          />

          <Text style={styles.inputLabel}>Attorney Fees</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={createForm.attorneyFees}
            onChangeText={v => setCreateForm(prev => ({ ...prev, attorneyFees: sanitizeCurrency(v) }))}
          />

          <Text style={styles.inputLabel}>Attorney Costs</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={createForm.attorneyCosts}
            onChangeText={v => setCreateForm(prev => ({ ...prev, attorneyCosts: sanitizeCurrency(v) }))}
          />

          <View style={styles.netToClientBox}>
            <Text style={styles.netToClientLabel}>Estimated Net to Client</Text>
            <Text style={styles.netToClientValue}>${formatCurrency(getNetToClient())}</Text>
          </View>

          <Text style={styles.inputLabel}>Settlement Date</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY (optional)"
            placeholderTextColor="#9CA3AF"
            value={createForm.settlementDate}
            onChangeText={v => setCreateForm(prev => ({ ...prev, settlementDate: v }))}
          />

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={createForm.notes}
            onChangeText={v => setCreateForm(prev => ({ ...prev, notes: v }))}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleCreateSettlement}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>Create Settlement</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  const renderMarkSettledModal = () => (
    <Modal
      visible={showMarkSettledModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowMarkSettledModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalCardTitle}>Mark as Settled</Text>

          <Text style={styles.inputLabel}>Settlement Date</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#9CA3AF"
            value={markSettledForm.settlementDate}
            onChangeText={v => setMarkSettledForm(prev => ({ ...prev, settlementDate: v }))}
          />

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={markSettledForm.notes}
            onChangeText={v => setMarkSettledForm(prev => ({ ...prev, notes: v }))}
          />

          <View style={styles.modalCardActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowMarkSettledModal(false)}
              disabled={submitting}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, submitting && styles.submitButtonDisabled]}
              onPress={handleMarkSettled}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>Confirm</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderIOLTAModal = () => (
    <Modal
      visible={showIOLTAModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowIOLTAModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalCardTitle}>Record IOLTA Deposit</Text>

          <Text style={styles.inputLabel}>Deposit Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor="#9CA3AF"
            keyboardType="decimal-pad"
            value={ioltaForm.ioltaDepositAmount}
            onChangeText={v => setIOLTAForm(prev => ({ ...prev, ioltaDepositAmount: sanitizeCurrency(v) }))}
          />

          <Text style={styles.inputLabel}>Reference Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter reference number"
            placeholderTextColor="#9CA3AF"
            value={ioltaForm.ioltaReferenceNumber}
            onChangeText={v => setIOLTAForm(prev => ({ ...prev, ioltaReferenceNumber: v }))}
          />

          <Text style={styles.inputLabel}>Deposit Date</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY"
            placeholderTextColor="#9CA3AF"
            value={ioltaForm.ioltaDepositDate}
            onChangeText={v => setIOLTAForm(prev => ({ ...prev, ioltaDepositDate: v }))}
          />

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={ioltaForm.notes}
            onChangeText={v => setIOLTAForm(prev => ({ ...prev, notes: v }))}
          />

          <View style={styles.modalCardActions}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowIOLTAModal(false)}
              disabled={submitting}
            >
              <Text style={styles.modalCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSubmitButton, { backgroundColor: '#7C3AED' }, submitting && styles.submitButtonDisabled]}
              onPress={handleRecordIOLTA}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.modalSubmitButtonText}>Record Deposit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.screenContainer}>
      {view === 'list' ? renderListView() : renderDetailView()}
      {renderCreateModal()}
      {renderMarkSettledModal()}
      {renderIOLTAModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A5F',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 70,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  createButton: {
    backgroundColor: '#CA8A04',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    width: 70,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  filterContainer: {
    backgroundColor: '#F5F0E8',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFF',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: '#FFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#CA8A04',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardCaseName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E3A5F',
    flex: 1,
    marginRight: 8,
  },
  cardClientName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  cardInsurance: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#CA8A04',
  },
  cardDate: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  detailCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 15,
    color: '#1E3A5F',
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  financialCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 12,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  financialLabel: {
    fontSize: 15,
    color: '#374151',
  },
  financialValue: {
    fontSize: 15,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  financialDeduction: {
    fontSize: 15,
    color: '#DC2626',
    fontWeight: '600',
  },
  financialDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  financialTotalLabel: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '700',
  },
  financialTotalValue: {
    fontSize: 18,
    color: '#CA8A04',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lienItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
  },
  lienHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  lienProvider: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E3A5F',
    flex: 1,
  },
  lienDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  lienDetailText: {
    fontSize: 13,
    color: '#6B7280',
  },
  disbursementItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 10,
  },
  disbursementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  disbursementLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  disbursementValue: {
    fontSize: 14,
    color: '#1E3A5F',
    fontWeight: '600',
  },
  disbursementDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFF8F0',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E3A5F',
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  modalCancelText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#1E3A5F',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  clientSelector: {
    marginBottom: 8,
  },
  clientOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 6,
  },
  clientOptionSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  clientOptionText: {
    fontSize: 15,
    color: '#374151',
  },
  clientOptionTextSelected: {
    color: '#1E3A5F',
    fontWeight: '600',
  },
  checkmark: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '700',
  },
  noClientsText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    padding: 10,
  },
  netToClientBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  netToClientLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#166534',
  },
  netToClientValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#16A34A',
  },
  submitButton: {
    backgroundColor: '#1E3A5F',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  modalCardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A5F',
    marginBottom: 4,
  },
  modalCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 20,
  },
  modalCancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalCancelButtonText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalSubmitButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modalSubmitButtonText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '700',
  },
});

export default SettlementManagementScreen;
