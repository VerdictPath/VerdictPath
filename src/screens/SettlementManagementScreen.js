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
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const [disclaimerText, setDisclaimerText] = useState('');
  const [disclaimerLoading, setDisclaimerLoading] = useState(false);

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

  const [showAddLienModal, setShowAddLienModal] = useState(false);
  const [showSendStatementModal, setShowSendStatementModal] = useState(false);
  const [connectedProviders, setConnectedProviders] = useState([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [sendingStatement, setSendingStatement] = useState(false);
  const [lienProviderType, setLienProviderType] = useState('connected');

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
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

  const [lienForm, setLienForm] = useState({
    medicalProviderId: '',
    manualProviderName: '',
    manualProviderEmail: '',
    manualProviderPhone: '',
    originalBillAmount: '',
    lienAmount: '',
    lienReceivedDate: '',
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
    setIsEditing(false);
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

  const startEditing = () => {
    const settlement = detailData?.settlement;
    if (!settlement) return;
    setEditForm({
      caseName: settlement.caseName || '',
      caseNumber: settlement.caseNumber || '',
      insuranceCompanyName: settlement.insuranceCompanyName || '',
      insuranceClaimNumber: settlement.insuranceClaimNumber || '',
      insuranceAdjusterName: settlement.insuranceAdjusterName || '',
      insuranceAdjusterEmail: settlement.insuranceAdjusterEmail || '',
      insuranceAdjusterPhone: settlement.insuranceAdjusterPhone || '',
      grossSettlementAmount: settlement.grossSettlementAmount ? String(settlement.grossSettlementAmount) : '',
      attorneyFees: settlement.attorneyFees ? String(settlement.attorneyFees) : '',
      attorneyCosts: settlement.attorneyCosts ? String(settlement.attorneyCosts) : '',
      settlementDate: settlement.settlementDate ? new Date(settlement.settlementDate).toLocaleDateString('en-US') : '',
      notes: settlement.notes || '',
    });
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedSettlement) return;
    if (!editForm.insuranceCompanyName.trim()) {
      alert('Required Field', 'Please enter the insurance company name');
      return;
    }
    if (!editForm.grossSettlementAmount || parseCurrency(editForm.grossSettlementAmount) <= 0) {
      alert('Required Field', 'Please enter a valid gross settlement amount');
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        caseName: editForm.caseName.trim() || undefined,
        caseNumber: editForm.caseNumber.trim() || undefined,
        insuranceCompanyName: editForm.insuranceCompanyName.trim(),
        insuranceClaimNumber: editForm.insuranceClaimNumber.trim() || undefined,
        insuranceAdjusterName: editForm.insuranceAdjusterName.trim() || undefined,
        insuranceAdjusterEmail: editForm.insuranceAdjusterEmail.trim() || undefined,
        insuranceAdjusterPhone: editForm.insuranceAdjusterPhone.trim() || undefined,
        grossSettlementAmount: parseCurrency(editForm.grossSettlementAmount),
        attorneyFees: parseCurrency(editForm.attorneyFees) || 0,
        attorneyCosts: parseCurrency(editForm.attorneyCosts) || 0,
        settlementDate: editForm.settlementDate.trim() || undefined,
        notes: editForm.notes.trim() || undefined,
      };

      await apiRequest(API_ENDPOINTS.SETTLEMENTS.UPDATE(selectedSettlement.id), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(body)
      });

      alert('Success', 'Settlement updated successfully');
      setIsEditing(false);
      loadSettlementDetail(selectedSettlement.id);
    } catch (error) {
      alert('Error', error.message || 'Failed to update settlement');
    } finally {
      setSubmitting(false);
    }
  };

  const getEditNetToClient = () => {
    const gross = parseCurrency(editForm.grossSettlementAmount);
    const fees = parseCurrency(editForm.attorneyFees);
    const costs = parseCurrency(editForm.attorneyCosts);
    const totalLiens = detailData?.settlement?.totalMedicalLiens || 0;
    return gross - fees - costs - totalLiens;
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

  const loadConnectedProviders = async () => {
    try {
      setLoadingProviders(true);
      const response = await apiRequest(API_ENDPOINTS.SETTLEMENTS.CONNECTED_PROVIDERS, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      setConnectedProviders(response.providers || []);
    } catch (error) {
      setConnectedProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleOpenAddLien = () => {
    setLienForm({
      medicalProviderId: '',
      manualProviderName: '',
      manualProviderEmail: '',
      manualProviderPhone: '',
      originalBillAmount: '',
      lienAmount: '',
      lienReceivedDate: '',
      notes: '',
    });
    setLienProviderType('connected');
    loadConnectedProviders();
    setShowAddLienModal(true);
  };

  const handleAddLien = async () => {
    if (!selectedSettlement) return;

    if (lienProviderType === 'connected' && !lienForm.medicalProviderId) {
      alert('Required Field', 'Please select a medical provider');
      return;
    }
    if (lienProviderType === 'manual' && !lienForm.manualProviderName.trim()) {
      alert('Required Field', 'Please enter the provider name');
      return;
    }
    if (!lienForm.originalBillAmount || parseCurrency(lienForm.originalBillAmount) <= 0) {
      alert('Required Field', 'Please enter a valid original bill amount');
      return;
    }
    if (!lienForm.lienAmount || parseCurrency(lienForm.lienAmount) <= 0) {
      alert('Required Field', 'Please enter a valid lien amount');
      return;
    }

    try {
      setSubmitting(true);
      const body = {
        originalBillAmount: parseCurrency(lienForm.originalBillAmount),
        lienAmount: parseCurrency(lienForm.lienAmount),
        lienReceivedDate: lienForm.lienReceivedDate.trim() || undefined,
        notes: lienForm.notes.trim() || undefined,
      };

      if (lienProviderType === 'connected') {
        body.medicalProviderId = parseInt(lienForm.medicalProviderId);
      } else {
        body.manualProviderName = lienForm.manualProviderName.trim();
        body.manualProviderEmail = lienForm.manualProviderEmail.trim() || undefined;
        body.manualProviderPhone = lienForm.manualProviderPhone.trim() || undefined;
      }

      await apiRequest(API_ENDPOINTS.SETTLEMENTS.ADD_LIEN(selectedSettlement.id), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify(body),
      });

      alert('Success', 'Medical lien added successfully');
      setShowAddLienModal(false);
      loadSettlementDetail(selectedSettlement.id);
    } catch (error) {
      alert('Error', error.message || 'Failed to add medical lien');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendStatement = async (recipients) => {
    if (!selectedSettlement) return;
    
    try {
      setSendingStatement(true);
      const response = await apiRequest(API_ENDPOINTS.SETTLEMENTS.SEND_STATEMENT(selectedSettlement.id), {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}` },
        body: JSON.stringify({ recipients }),
      });

      const count = response.sentTo ? response.sentTo.length : 0;
      alert('Success', `Settlement statement sent to ${count} recipient(s)`);
      setShowSendStatementModal(false);
    } catch (error) {
      alert('Error', error.message || 'Failed to send settlement statement');
    } finally {
      setSendingStatement(false);
    }
  };

  const handlePrintStatement = () => {
    if (Platform.OS === 'web') {
      const settlement = detailData?.settlement;
      const liens = detailData?.liens || [];
      if (!settlement) return;

      const formatC = (val) => (parseFloat(val) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
      const formatD = (d) => d ? new Date(d).toLocaleDateString('en-US') : 'N/A';

      let liensRows = '';
      let totalOriginal = 0;
      let totalLien = 0;
      let totalSavings = 0;
      if (liens.length > 0) {
        liensRows = liens.map(l => {
          const orig = parseFloat(l.originalBillAmount) || 0;
          const lien = parseFloat(l.lienAmount) || 0;
          const savings = orig - lien;
          totalOriginal += orig;
          totalLien += lien;
          totalSavings += savings;
          return `
          <tr>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;font-weight:500;">${l.providerName || 'Unknown'}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;">$${formatC(orig)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:bold;">$${formatC(lien)}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:right;color:#16a34a;">${savings > 0 ? '$' + formatC(savings) : '-'}</td>
            <td style="padding:10px 8px;border-bottom:1px solid #e5e7eb;text-align:center;">${(l.status || '').toUpperCase()}</td>
          </tr>`;
        }).join('');
      }

      const printHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Settlement Statement - ${settlement.caseName || 'Case'}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
            h1 { color: #1e3a5f; border-bottom: 3px solid #ca8a04; padding-bottom: 10px; }
            h2 { color: #1e3a5f; margin-top: 30px; }
            .info-table { width: 100%; margin: 15px 0; }
            .info-table td { padding: 6px 0; }
            .info-table td:first-child { color: #6b7280; width: 200px; }
            .financial-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .financial-table td { padding: 8px 0; }
            .deduction { color: #dc2626; }
            .total-row { border-top: 2px solid #1e3a5f; font-weight: bold; font-size: 18px; }
            .total-amount { color: #16a34a; }
            .liens-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            .liens-table th { padding: 8px; text-align: left; border-bottom: 2px solid #d1d5db; background: #f3f4f6; }
            .liens-table td { padding: 8px; }
            .footer { margin-top: 40px; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Settlement Statement</h1>
          <h2>Case Information</h2>
          <table class="info-table">
            <tr><td>Case Name:</td><td><strong>${settlement.caseName || 'N/A'}</strong></td></tr>
            <tr><td>Case Number:</td><td>${settlement.caseNumber || 'N/A'}</td></tr>
            <tr><td>Client:</td><td>${settlement.clientName || 'N/A'}</td></tr>
            <tr><td>Insurance Company:</td><td>${settlement.insuranceCompanyName || 'N/A'}</td></tr>
            ${settlement.insuranceClaimNumber ? `<tr><td>Claim Number:</td><td>${settlement.insuranceClaimNumber}</td></tr>` : ''}
            <tr><td>Settlement Date:</td><td>${formatD(settlement.settlementDate)}</td></tr>
            <tr><td>Status:</td><td><strong>${(settlement.status || '').replace(/_/g, ' ').toUpperCase()}</strong></td></tr>
          </table>
          
          <h2>Financial Summary</h2>
          <table class="financial-table">
            <tr><td>Gross Settlement Amount:</td><td style="text-align:right;font-weight:bold;font-size:16px;">$${formatC(settlement.grossSettlementAmount)}</td></tr>
            <tr class="deduction"><td>Attorney Fees:</td><td style="text-align:right;">- $${formatC(settlement.attorneyFees)}</td></tr>
            <tr class="deduction"><td>Attorney Costs:</td><td style="text-align:right;">- $${formatC(settlement.attorneyCosts)}</td></tr>
            <tr class="deduction"><td>Medical Liens:</td><td style="text-align:right;">- $${formatC(settlement.totalMedicalLiens)}</td></tr>
            <tr class="total-row"><td>Net to Client:</td><td style="text-align:right;" class="total-amount">$${formatC(settlement.netToClient)}</td></tr>
          </table>
          
          ${settlement.ioltaDepositAmount ? `
          <h2>IOLTA Deposit</h2>
          <table class="info-table">
            <tr><td>Deposit Amount:</td><td><strong>$${formatC(settlement.ioltaDepositAmount)}</strong></td></tr>
            <tr><td>Reference Number:</td><td>${settlement.ioltaReferenceNumber || 'N/A'}</td></tr>
            <tr><td>Deposit Date:</td><td>${formatD(settlement.ioltaDepositDate)}</td></tr>
          </table>
          ` : ''}
          
          ${liens.length > 0 ? `
          <h2>Medical Provider Liens</h2>
          <p style="color:#6b7280;font-size:13px;margin-top:4px;">The following medical providers have liens on this settlement. The "Negotiated Amount" reflects the reduced amount owed after lien negotiation.</p>
          <table class="liens-table">
            <thead>
              <tr>
                <th>Medical Provider</th>
                <th style="text-align:right;">Original Bill</th>
                <th style="text-align:right;">Negotiated Amount</th>
                <th style="text-align:right;">Savings</th>
                <th style="text-align:center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${liensRows}
              <tr style="background:#f9fafb;font-weight:bold;">
                <td style="padding:10px 8px;border-top:2px solid #d1d5db;">Totals</td>
                <td style="padding:10px 8px;border-top:2px solid #d1d5db;text-align:right;">$${formatC(totalOriginal)}</td>
                <td style="padding:10px 8px;border-top:2px solid #d1d5db;text-align:right;">$${formatC(totalLien)}</td>
                <td style="padding:10px 8px;border-top:2px solid #d1d5db;text-align:right;color:#16a34a;">${totalSavings > 0 ? '$' + formatC(totalSavings) : '-'}</td>
                <td style="padding:10px 8px;border-top:2px solid #d1d5db;"></td>
              </tr>
            </tbody>
          </table>
          ` : ''}

          ${settlement.disclaimer ? `
          <div style="margin-top:25px;padding:15px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;">
            <h3 style="margin:0 0 8px 0;color:#92400e;font-size:13px;text-transform:uppercase;">Disclaimer</h3>
            <p style="margin:0;color:#78350f;font-size:12px;line-height:1.5;white-space:pre-wrap;">${settlement.disclaimer}</p>
          </div>
          ` : ''}
          
          <div class="footer">
            <p>This settlement statement was generated by Verdict Path on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            <p>If you have questions about this statement, please contact your attorney.</p>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHtml);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
    } else {
      alert('Print', 'To print or save the settlement statement, please use the "Send Statement" feature to email it, or access the web version for printing.');
    }
  };

  const loadDisclaimer = async () => {
    try {
      setDisclaimerLoading(true);
      const response = await apiRequest(API_ENDPOINTS.SETTLEMENTS.DISCLAIMER);
      setDisclaimerText(response.disclaimer || '');
    } catch (error) {
      console.error('Error loading disclaimer:', error);
    } finally {
      setDisclaimerLoading(false);
    }
  };

  const saveDisclaimer = async () => {
    try {
      setDisclaimerLoading(true);
      await apiRequest(API_ENDPOINTS.SETTLEMENTS.DISCLAIMER, {
        method: 'PUT',
        body: JSON.stringify({ disclaimer: disclaimerText }),
      });
      alert('Success', 'Disclaimer saved successfully. It will appear on all future settlement statements.');
      setShowDisclaimerModal(false);
    } catch (error) {
      console.error('Error saving disclaimer:', error);
      alert('Error', 'Failed to save disclaimer');
    } finally {
      setDisclaimerLoading(false);
    }
  };

  const openDisclaimerModal = () => {
    loadDisclaimer();
    setShowDisclaimerModal(true);
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
        {view === 'detail' ? 'Settlement Statement' : 'Settlements'}
      </Text>
      {view === 'list' && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.createButton, { backgroundColor: '#92400e' }]} onPress={openDisclaimerModal}>
            <Text style={styles.createButtonText}>Disclaimer</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.createButton} onPress={handleOpenCreateModal}>
            <Text style={styles.createButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      )}
      {view === 'detail' && detailData?.settlement && ['pending', 'settled'].includes(detailData.settlement.status) && !isEditing && (
        <TouchableOpacity style={styles.createButton} onPress={startEditing}>
          <Text style={styles.createButtonText}>Edit</Text>
        </TouchableOpacity>
      )}
      {view === 'detail' && (isEditing ? (
        <TouchableOpacity style={[styles.createButton, { backgroundColor: '#6B7280' }]} onPress={() => setIsEditing(false)}>
          <Text style={styles.createButtonText}>Cancel</Text>
        </TouchableOpacity>
      ) : (!detailData?.settlement || !['pending', 'settled'].includes(detailData.settlement.status)) ? (
        <View style={{ width: 70 }} />
      ) : null)}
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
            {isEditing ? (
              <View style={styles.detailCard}>
                <Text style={styles.sectionTitle}>Edit Settlement</Text>

                <Text style={styles.inputLabel}>Case Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Case name"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.caseName}
                  onChangeText={v => setEditForm(prev => ({ ...prev, caseName: v }))}
                />

                <Text style={styles.inputLabel}>Case Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.caseNumber}
                  onChangeText={v => setEditForm(prev => ({ ...prev, caseNumber: v }))}
                />

                <Text style={styles.inputLabel}>Insurance Company Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter insurance company"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.insuranceCompanyName}
                  onChangeText={v => setEditForm(prev => ({ ...prev, insuranceCompanyName: v }))}
                />

                <Text style={styles.inputLabel}>Claim Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.insuranceClaimNumber}
                  onChangeText={v => setEditForm(prev => ({ ...prev, insuranceClaimNumber: v }))}
                />

                <Text style={styles.inputLabel}>Adjuster Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.insuranceAdjusterName}
                  onChangeText={v => setEditForm(prev => ({ ...prev, insuranceAdjusterName: v }))}
                />

                <Text style={styles.inputLabel}>Adjuster Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  value={editForm.insuranceAdjusterEmail}
                  onChangeText={v => setEditForm(prev => ({ ...prev, insuranceAdjusterEmail: v }))}
                />

                <Text style={styles.inputLabel}>Adjuster Phone</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Optional"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  value={editForm.insuranceAdjusterPhone}
                  onChangeText={v => setEditForm(prev => ({ ...prev, insuranceAdjusterPhone: v }))}
                />

                <Text style={styles.inputLabel}>Gross Settlement Amount *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={editForm.grossSettlementAmount}
                  onChangeText={v => setEditForm(prev => ({ ...prev, grossSettlementAmount: sanitizeCurrency(v) }))}
                />

                <Text style={styles.inputLabel}>Attorney Fees</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={editForm.attorneyFees}
                  onChangeText={v => setEditForm(prev => ({ ...prev, attorneyFees: sanitizeCurrency(v) }))}
                />

                <Text style={styles.inputLabel}>Attorney Costs</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                  value={editForm.attorneyCosts}
                  onChangeText={v => setEditForm(prev => ({ ...prev, attorneyCosts: sanitizeCurrency(v) }))}
                />

                <View style={styles.netToClientBox}>
                  <Text style={styles.netToClientLabel}>Estimated Net to Client</Text>
                  <Text style={styles.netToClientValue}>${formatCurrency(getEditNetToClient())}</Text>
                </View>

                <Text style={styles.inputLabel}>Settlement Date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="MM/DD/YYYY (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={editForm.settlementDate}
                  onChangeText={v => setEditForm(prev => ({ ...prev, settlementDate: v }))}
                />

                <Text style={styles.inputLabel}>Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Optional notes"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                  value={editForm.notes}
                  onChangeText={v => setEditForm(prev => ({ ...prev, notes: v }))}
                />

                <TouchableOpacity
                  style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={handleSaveEdit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>

                <View style={{ height: 20 }} />
              </View>
            ) : (
              <>
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
                  {settlement.disclaimer && (
                    <View style={[styles.detailRow, { backgroundColor: '#fefce8', padding: 10, borderRadius: 8, marginTop: 8 }]}>
                      <Text style={[styles.detailLabel, { color: '#92400e' }]}>Disclaimer</Text>
                      <Text style={[styles.detailValue, { color: '#78350f', fontSize: 12 }]}>{settlement.disclaimer}</Text>
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

                <View style={styles.statementActionsRow}>
                  <TouchableOpacity
                    style={styles.statementActionButton}
                    onPress={() => setShowSendStatementModal(true)}
                  >
                    <Text style={styles.statementActionIcon}>📧</Text>
                    <Text style={styles.statementActionText}>Send Statement</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.statementActionButton}
                    onPress={handlePrintStatement}
                  >
                    <Text style={styles.statementActionIcon}>🖨️</Text>
                    <Text style={styles.statementActionText}>{Platform.OS === 'web' ? 'Print / Save' : 'Save / Share'}</Text>
                  </TouchableOpacity>
                </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Medical Provider Liens ({liens.length})</Text>
                <TouchableOpacity
                  style={styles.addLienButton}
                  onPress={handleOpenAddLien}
                >
                  <Text style={styles.addLienButtonText}>+ Add Lien</Text>
                </TouchableOpacity>
              </View>
              {liens.length > 0 ? (
                <>
                  {liens.map(lien => {
                    const orig = parseFloat(lien.originalBillAmount) || 0;
                    const lienAmt = parseFloat(lien.lienAmount) || 0;
                    const savings = orig - lienAmt;
                    return (
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
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.lienDetailText, { color: '#6B7280' }]}>Original Bill:</Text>
                            <Text style={styles.lienDetailText}>${formatCurrency(orig)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={[styles.lienDetailText, { color: '#1E3A5F', fontWeight: '700' }]}>Negotiated Amount:</Text>
                            <Text style={[styles.lienDetailText, { fontWeight: '700' }]}>${formatCurrency(lienAmt)}</Text>
                          </View>
                          {savings > 0 && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={[styles.lienDetailText, { color: '#16A34A' }]}>Savings:</Text>
                              <Text style={[styles.lienDetailText, { color: '#16A34A' }]}>${formatCurrency(savings)}</Text>
                            </View>
                          )}
                          {lien.finalPaymentAmount && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={[styles.lienDetailText, { color: '#7C3AED' }]}>Final Payment:</Text>
                              <Text style={[styles.lienDetailText, { color: '#7C3AED' }]}>${formatCurrency(lien.finalPaymentAmount)}</Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })}
                  {liens.length > 1 && (
                    <View style={{ backgroundColor: '#F9FAFB', padding: 12, borderRadius: 8, marginTop: 8, borderTopWidth: 2, borderTopColor: '#D1D5DB' }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A5F' }}>Total Original Bills:</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700' }}>${formatCurrency(liens.reduce((sum, l) => sum + (parseFloat(l.originalBillAmount) || 0), 0))}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E3A5F' }}>Total Negotiated:</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700' }}>${formatCurrency(liens.reduce((sum, l) => sum + (parseFloat(l.lienAmount) || 0), 0))}</Text>
                      </View>
                      {(() => {
                        const totalSav = liens.reduce((sum, l) => sum + ((parseFloat(l.originalBillAmount) || 0) - (parseFloat(l.lienAmount) || 0)), 0);
                        return totalSav > 0 ? (
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#16A34A' }}>Total Savings:</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#16A34A' }}>${formatCurrency(totalSav)}</Text>
                          </View>
                        ) : null;
                      })()}
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.emptyText}>No medical liens recorded. Tap "+ Add Lien" to add one.</Text>
              )}
            </View>

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
              </>
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

  const renderAddLienModal = () => (
    <Modal
      visible={showAddLienModal}
      animationType="slide"
      transparent={false}
      onRequestClose={() => setShowAddLienModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowAddLienModal(false)}>
            <Text style={styles.modalCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Add Medical Lien</Text>
          <View style={{ width: 60 }} />
        </View>
        <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalContent}>
          <Text style={styles.inputLabel}>Provider Type</Text>
          <View style={styles.providerTypeRow}>
            <TouchableOpacity
              style={[styles.providerTypeButton, lienProviderType === 'connected' && styles.providerTypeButtonActive]}
              onPress={() => setLienProviderType('connected')}
            >
              <Text style={[styles.providerTypeText, lienProviderType === 'connected' && styles.providerTypeTextActive]}>Connected Provider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.providerTypeButton, lienProviderType === 'manual' && styles.providerTypeButtonActive]}
              onPress={() => setLienProviderType('manual')}
            >
              <Text style={[styles.providerTypeText, lienProviderType === 'manual' && styles.providerTypeTextActive]}>Manual Entry</Text>
            </TouchableOpacity>
          </View>

          {lienProviderType === 'connected' ? (
            <>
              <Text style={styles.inputLabel}>Select Provider *</Text>
              {loadingProviders ? (
                <ActivityIndicator size="small" color="#1E3A5F" style={{ marginBottom: 16 }} />
              ) : (
                <View style={styles.clientSelector}>
                  {connectedProviders.map(provider => (
                    <TouchableOpacity
                      key={provider.id}
                      style={[
                        styles.clientOption,
                        lienForm.medicalProviderId === String(provider.id) && styles.clientOptionSelected
                      ]}
                      onPress={() => setLienForm(prev => ({ ...prev, medicalProviderId: String(provider.id) }))}
                    >
                      <Text style={[
                        styles.clientOptionText,
                        lienForm.medicalProviderId === String(provider.id) && styles.clientOptionTextSelected
                      ]}>
                        {provider.providerName || provider.name || provider.email}
                      </Text>
                      {lienForm.medicalProviderId === String(provider.id) && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                  {connectedProviders.length === 0 && (
                    <Text style={styles.noClientsText}>No connected providers. Use "Manual Entry" to add a provider.</Text>
                  )}
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Provider Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter provider name"
                placeholderTextColor="#9CA3AF"
                value={lienForm.manualProviderName}
                onChangeText={v => setLienForm(prev => ({ ...prev, manualProviderName: v }))}
              />
              <Text style={styles.inputLabel}>Provider Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor="#9CA3AF"
                value={lienForm.manualProviderEmail}
                onChangeText={v => setLienForm(prev => ({ ...prev, manualProviderEmail: v }))}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Text style={styles.inputLabel}>Provider Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional"
                placeholderTextColor="#9CA3AF"
                value={lienForm.manualProviderPhone}
                onChangeText={v => setLienForm(prev => ({ ...prev, manualProviderPhone: v }))}
                keyboardType="phone-pad"
              />
            </>
          )}

          <Text style={styles.inputLabel}>Original Bill Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="$0.00"
            placeholderTextColor="#9CA3AF"
            value={lienForm.originalBillAmount}
            onChangeText={v => setLienForm(prev => ({ ...prev, originalBillAmount: v }))}
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Lien Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="$0.00"
            placeholderTextColor="#9CA3AF"
            value={lienForm.lienAmount}
            onChangeText={v => setLienForm(prev => ({ ...prev, lienAmount: v }))}
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Lien Received Date</Text>
          <TextInput
            style={styles.input}
            placeholder="MM/DD/YYYY (optional)"
            placeholderTextColor="#9CA3AF"
            value={lienForm.lienReceivedDate}
            onChangeText={v => setLienForm(prev => ({ ...prev, lienReceivedDate: v }))}
          />

          <Text style={styles.inputLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Optional notes"
            placeholderTextColor="#9CA3AF"
            value={lienForm.notes}
            onChangeText={v => setLienForm(prev => ({ ...prev, notes: v }))}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleAddLien}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>Add Medical Lien</Text>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </Modal>
  );

  const renderSendStatementModal = () => (
    <Modal
      visible={showSendStatementModal}
      animationType="fade"
      transparent={true}
      onRequestClose={() => setShowSendStatementModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalCardTitle}>Send Settlement Statement</Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>
            Choose who should receive the settlement statement via email.
          </Text>

          <TouchableOpacity
            style={[styles.sendOptionButton, sendingStatement && styles.submitButtonDisabled]}
            onPress={() => handleSendStatement(['client'])}
            disabled={sendingStatement}
          >
            {sendingStatement ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.sendOptionIcon}>👤</Text>
                <Text style={styles.sendOptionText}>Send to Client Only</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendOptionButton, { backgroundColor: '#7C3AED' }, sendingStatement && styles.submitButtonDisabled]}
            onPress={() => handleSendStatement(['providers'])}
            disabled={sendingStatement}
          >
            {sendingStatement ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.sendOptionIcon}>🏥</Text>
                <Text style={styles.sendOptionText}>Send to Medical Providers Only</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sendOptionButton, { backgroundColor: '#16A34A' }, sendingStatement && styles.submitButtonDisabled]}
            onPress={() => handleSendStatement(['client', 'providers'])}
            disabled={sendingStatement}
          >
            {sendingStatement ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Text style={styles.sendOptionIcon}>📧</Text>
                <Text style={styles.sendOptionText}>Send to All (Client + Providers)</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowSendStatementModal(false)}
          >
            <Text style={[styles.modalCancelButtonText, { textAlign: 'center' }]}>Cancel</Text>
          </TouchableOpacity>
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
      {renderAddLienModal()}
      {renderSendStatementModal()}

      <Modal visible={showDisclaimerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Settlement Disclaimer</Text>
            <Text style={{ color: '#6B7280', fontSize: 13, marginBottom: 12 }}>
              This disclaimer will appear on all settlement statements (emails, print, and detail views).
            </Text>
            {disclaimerLoading ? (
              <ActivityIndicator size="large" color="#CA8A04" style={{ marginVertical: 20 }} />
            ) : (
              <TextInput
                style={[styles.input, { height: 150, textAlignVertical: 'top' }]}
                multiline
                placeholder="Enter your settlement disclaimer text..."
                placeholderTextColor="#9CA3AF"
                value={disclaimerText}
                onChangeText={setDisclaimerText}
              />
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDisclaimerModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={saveDisclaimer}
                disabled={disclaimerLoading}
              >
                <Text style={styles.submitButtonText}>
                  {disclaimerLoading ? 'Saving...' : 'Save Disclaimer'}
                </Text>
              </TouchableOpacity>
            </View>
            {disclaimerText ? (
              <TouchableOpacity
                style={{ marginTop: 10, alignSelf: 'center' }}
                onPress={() => {
                  setDisclaimerText('');
                }}
              >
                <Text style={{ color: '#DC2626', fontSize: 13 }}>Clear Disclaimer</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </Modal>
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
  statementActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statementActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    paddingVertical: 12,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statementActionIcon: {
    fontSize: 18,
  },
  statementActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addLienButton: {
    backgroundColor: '#CA8A04',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addLienButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  providerTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  providerTypeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  providerTypeButtonActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  providerTypeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  providerTypeTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  sendOptionButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sendOptionIcon: {
    fontSize: 18,
  },
  sendOptionText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SettlementManagementScreen;
