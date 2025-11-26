import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Linking,
  Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';
import { 
  initializeFirebase, 
  subscribeToNegotiations, 
  authenticateWithBackend 
} from '../services/firebaseService';

// Cross-platform alert that works on both mobile and web
const showAlert = (title, message, buttons = [{ text: 'OK' }]) => {
  if (Platform.OS === 'web') {
    // On web, use window.confirm for confirmation dialogs, window.alert for info
    if (buttons.length > 1) {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed && buttons[1]?.onPress) {
        buttons[1].onPress();
      } else if (!confirmed && buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    } else {
      window.alert(`${title}\n\n${message}`);
      if (buttons[0]?.onPress) {
        buttons[0].onPress();
      }
    }
  } else {
    Alert.alert(title, message, buttons);
  }
};

const NegotiationsScreen = ({ user, onBack, hideHeader = false, bottomPadding = 0 }) => {
  const [loading, setLoading] = useState(true);
  const [negotiations, setNegotiations] = useState([]);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [showNewNegotiationModal, setShowNewNegotiationModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  
  // New negotiation form state
  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [medicalProviders, setMedicalProviders] = useState([]);
  const [selectedMedicalProviderId, setSelectedMedicalProviderId] = useState(null);
  const [billDescription, setBillDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [initialOffer, setInitialOffer] = useState('');
  const [notes, setNotes] = useState('');
  
  // Counter offer state
  const [counterOfferAmount, setCounterOfferAmount] = useState('');
  const [counterOfferNotes, setCounterOfferNotes] = useState('');
  
  // Call request state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callNotes, setCallNotes] = useState('');
  
  // Firebase real-time subscription refs
  const firebaseUnsubscribeRef = useRef(null);
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const isLawFirm = user?.type === 'LAW_FIRM' || user?.userType === 'lawfirm';
  const isMedicalProvider = user?.type === 'MEDICAL_PROVIDER' || user?.userType === 'medical_provider';

  // Setup Firebase real-time listeners for negotiations
  const setupFirebaseListeners = useCallback(async () => {
    if (!user?.token) return;
    
    try {
      console.log('🔥 Setting up Firebase real-time listeners for negotiations...');
      
      // Initialize Firebase
      initializeFirebase();
      
      // Authenticate with backend to get Firebase custom token
      const authResult = await authenticateWithBackend(user.token);
      if (!authResult || !authResult.success) {
        console.warn('⚠️ Firebase auth failed, falling back to polling');
        return;
      }
      
      // Determine user type and ID for subscription
      const userType = isLawFirm ? 'law_firm' : 'medical_provider';
      const userId = user.id;
      
      // Subscribe to negotiations updates
      const unsubscribe = await subscribeToNegotiations(userType, userId, (updatedNegotiations) => {
        console.log('🔔 Firebase negotiations update received:', updatedNegotiations?.length || 0);
        if (updatedNegotiations && Array.isArray(updatedNegotiations)) {
          // Merge Firebase updates with current state
          setNegotiations(prevNegotiations => {
            const negotiationMap = new Map(prevNegotiations.map(n => [n.id, n]));
            updatedNegotiations.forEach(updated => {
              if (updated && updated.id) {
                // Normalize Firebase data from snake_case to camelCase
                const normalized = {
                  ...negotiationMap.get(updated.id),
                  ...updated,
                  billAmount: parseFloat(updated.bill_amount || updated.billAmount || 0),
                  currentOffer: parseFloat(updated.current_offer || updated.currentOffer || 0),
                  billDescription: updated.bill_description || updated.billDescription,
                  clientId: updated.client_id || updated.clientId,
                  clientName: updated.client_name || updated.clientName,
                  lawFirmId: updated.law_firm_id || updated.lawFirmId,
                  firmName: updated.firm_name || updated.firmName,
                  lawFirmEmail: updated.law_firm_email || updated.lawFirmEmail,
                  medicalProviderId: updated.medical_provider_id || updated.medicalProviderId,
                  providerName: updated.provider_name || updated.providerName,
                  medicalProviderEmail: updated.medical_provider_email || updated.medicalProviderEmail,
                  initiatedBy: updated.initiated_by || updated.initiatedBy,
                  lastRespondedBy: updated.last_responded_by || updated.lastRespondedBy,
                  interactionCount: parseInt(updated.interaction_count || updated.interactionCount || 0),
                  createdAt: updated.created_at || updated.createdAt,
                  updatedAt: updated.updated_at || updated.updatedAt,
                  acceptedAt: updated.accepted_at || updated.acceptedAt,
                  callRequestPhone: updated.call_request_phone || updated.callRequestPhone,
                  callRequestNotes: updated.call_request_notes || updated.callRequestNotes,
                  callRequestBy: updated.call_request_by || updated.callRequestBy,
                  history: updated.history || []
                };
                negotiationMap.set(updated.id, normalized);
              }
            });
            // Sort by updatedAt descending (newest first) after merging updates
            const mergedList = Array.from(negotiationMap.values());
            mergedList.sort((a, b) => {
              const dateA = new Date(a.updatedAt || a.updated_at || a.synced_at || 0);
              const dateB = new Date(b.updatedAt || b.updated_at || b.synced_at || 0);
              return dateB - dateA;
            });
            return mergedList;
          });
          
          // Also update selected negotiation if it was updated
          if (selectedNegotiation) {
            const updatedSelected = updatedNegotiations.find(n => n.id === selectedNegotiation.id);
            if (updatedSelected) {
              setSelectedNegotiation(prev => ({
                ...prev,
                ...updatedSelected,
                billAmount: parseFloat(updatedSelected.bill_amount || updatedSelected.billAmount || 0),
                currentOffer: parseFloat(updatedSelected.current_offer || updatedSelected.currentOffer || 0),
                billDescription: updatedSelected.bill_description || updatedSelected.billDescription,
                clientId: updatedSelected.client_id || updatedSelected.clientId,
                clientName: updatedSelected.client_name || updatedSelected.clientName,
                lawFirmId: updatedSelected.law_firm_id || updatedSelected.lawFirmId,
                firmName: updatedSelected.firm_name || updatedSelected.firmName,
                medicalProviderId: updatedSelected.medical_provider_id || updatedSelected.medicalProviderId,
                providerName: updatedSelected.provider_name || updatedSelected.providerName,
                initiatedBy: updatedSelected.initiated_by || updatedSelected.initiatedBy,
                lastRespondedBy: updatedSelected.last_responded_by || updatedSelected.lastRespondedBy,
                interactionCount: parseInt(updatedSelected.interaction_count || updatedSelected.interactionCount || 0),
                callRequestPhone: updatedSelected.call_request_phone || updatedSelected.callRequestPhone,
                callRequestNotes: updatedSelected.call_request_notes || updatedSelected.callRequestNotes,
                callRequestBy: updatedSelected.call_request_by || updatedSelected.callRequestBy,
                history: updatedSelected.history || prev.history || []
              }));
            }
          }
        }
      });
      
      firebaseUnsubscribeRef.current = unsubscribe;
      setFirebaseConnected(true);
      console.log('✅ Firebase negotiations listeners active');
      
    } catch (error) {
      console.error('❌ Firebase negotiations setup failed:', error);
      setFirebaseConnected(false);
    }
  }, [user?.token, user?.id, isLawFirm, selectedNegotiation]);

  useEffect(() => {
    loadNegotiations();
    if (isLawFirm) {
      loadClients();
    } else if (isMedicalProvider) {
      loadPatients();
    }
    
    // Setup Firebase real-time listeners
    setupFirebaseListeners();
    
    // Cleanup on unmount
    return () => {
      if (firebaseUnsubscribeRef.current && typeof firebaseUnsubscribeRef.current === 'function') {
        console.log('🔥 Cleaning up Firebase negotiations listeners');
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, []);

  const loadNegotiations = async () => {
    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.LIST, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      
      // Normalize API response from snake_case to camelCase
      const normalizedNegotiations = (response.negotiations || []).map(neg => ({
        ...neg,
        billAmount: parseFloat(neg.bill_amount || 0),
        currentOffer: parseFloat(neg.current_offer || 0),
        billDescription: neg.bill_description,
        clientId: neg.client_id,
        lawFirmId: neg.law_firm_id,
        medicalProviderId: neg.medical_provider_id,
        initiatedBy: neg.initiated_by,
        lastRespondedBy: neg.last_responded_by,
        createdAt: neg.created_at,
        updatedAt: neg.updated_at,
        acceptedAt: neg.accepted_at,
        clientName: neg.client_name,
        firmName: neg.firm_name,
        lawFirmEmail: neg.law_firm_email,
        providerName: neg.provider_name,
        medicalProviderEmail: neg.medical_provider_email,
        interactionCount: parseInt(neg.interaction_count || 0),
        callRequestPhone: neg.call_request_phone,
        callRequestNotes: neg.call_request_notes
      }));
      
      // Sort by updatedAt descending (newest first)
      const sortedNegotiations = normalizedNegotiations.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.updated_at || 0);
        const dateB = new Date(b.updatedAt || b.updated_at || 0);
        return dateB - dateA;
      });
      setNegotiations(sortedNegotiations);
    } catch (error) {
      console.error('Error loading negotiations:', error);
      showAlert('Error', 'Failed to load negotiations');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM.CLIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setClients(response.clients || []);
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadPatients = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.PATIENTS, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setClients(response.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    }
  };

  const loadMedicalProvidersForClient = async (clientId) => {
    if (!clientId) {
      setMedicalProviders([]);
      return;
    }
    
    try {
      const response = await apiRequest(API_ENDPOINTS.CLIENT_RELATIONSHIPS.GET_CLIENT_PROVIDERS(clientId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      setMedicalProviders(response.providers || []);
      
      // Auto-select if only one provider
      if (response.providers && response.providers.length === 1) {
        setSelectedMedicalProviderId(response.providers[0].id);
      } else {
        setSelectedMedicalProviderId(null);
      }
    } catch (error) {
      console.error('Error loading medical providers:', error);
      setMedicalProviders([]);
    }
  };

  const handleInitiateNegotiation = async () => {
    if (!selectedClientId || !billDescription || !billAmount || !initialOffer) {
      showAlert('Error', 'Please fill in all required fields');
      return;
    }

    // Law firms must select a medical provider
    if (isLawFirm && !selectedMedicalProviderId) {
      showAlert('Error', 'Please select a medical provider');
      return;
    }

    const billAmountNum = parseFloat(billAmount);
    const initialOfferNum = parseFloat(initialOffer);

    if (isNaN(billAmountNum) || isNaN(initialOfferNum)) {
      showAlert('Error', 'Please enter valid amounts');
      return;
    }

    if (initialOfferNum >= billAmountNum) {
      showAlert('Error', 'Initial offer must be less than the bill amount');
      return;
    }

    try {
      setLoading(true);
      const requestBody = {
        clientId: selectedClientId,
        billDescription,
        billAmount: billAmountNum,
        initialOffer: initialOfferNum,
        notes,
        initiatedBy: isLawFirm ? 'law_firm' : 'medical_provider'
      };

      // Add medical provider ID if initiated by law firm
      if (isLawFirm) {
        requestBody.medicalProviderId = selectedMedicalProviderId;
      }

      console.log('📤 Sending negotiation request:', requestBody);

      const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.INITIATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Negotiation response:', response);

      showAlert(
        'Success',
        'Negotiation initiated! The other party has been notified.',
        [{ text: 'OK', onPress: () => {
          setShowNewNegotiationModal(false);
          resetNewNegotiationForm();
          loadNegotiations();
        }}]
      );
    } catch (error) {
      console.error('Error initiating negotiation:', error);
      showAlert('Error', error.message || 'Failed to initiate negotiation');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCounterOffer = async () => {
    if (!counterOfferAmount) {
      showAlert('Error', 'Please enter a counter offer amount');
      return;
    }

    const counterOfferNum = parseFloat(counterOfferAmount);
    if (isNaN(counterOfferNum)) {
      showAlert('Error', 'Please enter a valid amount');
      return;
    }

    const currentOffer = selectedNegotiation.currentOffer;
    const billAmount = selectedNegotiation.billAmount;

    // Validate counter offer logic
    // Law firms negotiate DOWN (pay less), Medical providers negotiate UP (get paid more)
    if (isLawFirm) {
      // Law firms try to pay less than current offer but more than zero
      if (counterOfferNum <= 0) {
        showAlert('Error', 'Counter offer must be greater than zero');
        return;
      }
      if (counterOfferNum >= currentOffer) {
        showAlert('Error', 'Counter offer should be less than the current offer of $' + (currentOffer || 0).toFixed(2));
        return;
      }
    } else {
      // Medical providers try to get paid more than current offer but less than bill amount
      if (counterOfferNum <= currentOffer) {
        showAlert('Error', 'Counter offer must be greater than the current offer of $' + (currentOffer || 0).toFixed(2));
        return;
      }
      if (counterOfferNum > billAmount) {
        showAlert('Error', 'Counter offer cannot exceed the bill amount of $' + (billAmount || 0).toFixed(2));
        return;
      }
    }

    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.COUNTER_OFFER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          negotiationId: selectedNegotiation.id,
          counterOffer: counterOfferNum,
          notes: counterOfferNotes
        })
      });

      showAlert(
        'Success',
        'Counter offer sent! The other party has been notified.',
        [{ text: 'OK', onPress: () => {
          setShowCounterOfferModal(false);
          setCounterOfferAmount('');
          setCounterOfferNotes('');
          loadNegotiations();
          setSelectedNegotiation(null);
        }}]
      );
    } catch (error) {
      console.error('Error sending counter offer:', error);
      showAlert('Error', error.message || 'Failed to send counter offer');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async (negotiationId) => {
    showAlert(
      'Accept Offer',
      'Are you sure you want to accept this offer? This will finalize the negotiation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept', 
          onPress: async () => {
            try {
              setLoading(true);
              const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.ACCEPT, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.token}`
                },
                body: JSON.stringify({
                  negotiationId
                })
              });

              showAlert(
                'Success',
                'Offer accepted! Both parties will receive a full negotiation log.',
                [{ text: 'OK', onPress: () => {
                  loadNegotiations();
                  setSelectedNegotiation(null);
                }}]
              );
            } catch (error) {
              console.error('Error accepting offer:', error);
              showAlert('Error', error.message || 'Failed to accept offer');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const handleRequestCall = async () => {
    console.log('📞 handleRequestCall called', { phoneNumber, callNotes, selectedNegotiation: selectedNegotiation?.id });
    
    if (!phoneNumber) {
      showAlert('Error', 'Please enter a phone number');
      return;
    }

    // Basic phone validation
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      showAlert('Error', 'Please enter a valid phone number');
      return;
    }

    try {
      setLoading(true);
      const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.REQUEST_CALL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({
          negotiationId: selectedNegotiation.id,
          phoneNumber,
          notes: callNotes
        })
      });

      showAlert(
        'Success',
        'Call request sent! The other party has been notified with your contact information.',
        [{ text: 'OK', onPress: () => {
          setShowCallRequestModal(false);
          setPhoneNumber('');
          setCallNotes('');
          loadNegotiations();
        }}]
      );
    } catch (error) {
      console.error('Error requesting call:', error);
      showAlert('Error', error.message || 'Failed to send call request');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLog = async (negotiationId) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.NEGOTIATIONS.LOG(negotiationId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });

      // In a real app, this would download a PDF or open a new screen
      showAlert(
        'Negotiation Log',
        JSON.stringify(response.log, null, 2),
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error downloading log:', error);
      showAlert('Error', 'Failed to download negotiation log');
    }
  };

  const resetNewNegotiationForm = () => {
    setSelectedClientId(null);
    setSelectedMedicalProviderId(null);
    setMedicalProviders([]);
    setBillDescription('');
    setBillAmount('');
    setInitialOffer('');
    setNotes('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'counter_offered': return '#1E90FF';
      case 'accepted': return '#28a745';
      case 'stalled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pending Response';
      case 'counter_offered': return 'Counter Offer Made';
      case 'accepted': return 'Accepted';
      case 'stalled': return 'Stalled - Call Requested';
      default: return status;
    }
  };

  const renderNegotiationCard = (negotiation) => {
    // Determine if it's this user's turn to respond
    // If lastRespondedBy is null, check who initiated - the OTHER party should respond first
    let isMyTurn = false;
    if (negotiation.lastRespondedBy === null) {
      // Initial state - the party who did NOT initiate should respond
      isMyTurn = (isLawFirm && negotiation.initiatedBy === 'medical_provider') ||
                 (isMedicalProvider && negotiation.initiatedBy === 'law_firm');
    } else {
      // After initial response - it's your turn if the other party last responded
      isMyTurn = (isLawFirm && negotiation.lastRespondedBy === 'medical_provider') ||
                 (isMedicalProvider && negotiation.lastRespondedBy === 'law_firm');
    }

    return (
      <TouchableOpacity
        key={negotiation.id}
        style={styles.negotiationCard}
        onPress={() => setSelectedNegotiation(negotiation)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.clientName}>
            {negotiation.clientName || `Client ID: ${negotiation.clientId}`}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(negotiation.status) }]}>
            <Text style={styles.statusText}>{getStatusText(negotiation.status)}</Text>
          </View>
        </View>

        <Text style={styles.billDescription}>{negotiation.billDescription}</Text>

        <View style={styles.amountRow}>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Bill Amount</Text>
            <Text style={styles.amountValue}>${(negotiation.billAmount || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.amountCol}>
            <Text style={styles.amountLabel}>Current Offer</Text>
            <Text style={styles.amountValue}>${(negotiation.currentOffer || 0).toFixed(2)}</Text>
          </View>
        </View>

        {isMyTurn && negotiation.status !== 'accepted' && (
          <View style={styles.yourTurnBadge}>
            <Text style={styles.yourTurnText}>🔔 Your Turn</Text>
          </View>
        )}

        <Text style={styles.dateText}>
          Initiated: {new Date(negotiation.createdAt).toLocaleDateString()}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderNegotiationDetail = () => {
    if (!selectedNegotiation) return null;

    // Determine if it's this user's turn to respond
    // If lastRespondedBy is null, check who initiated - the OTHER party should respond first
    let isMyTurn = false;
    if (selectedNegotiation.lastRespondedBy === null) {
      // Initial state - the party who did NOT initiate should respond
      isMyTurn = (isLawFirm && selectedNegotiation.initiatedBy === 'medical_provider') ||
                 (isMedicalProvider && selectedNegotiation.initiatedBy === 'law_firm');
    } else {
      // After initial response - it's your turn if the other party last responded
      isMyTurn = (isLawFirm && selectedNegotiation.lastRespondedBy === 'medical_provider') ||
                 (isMedicalProvider && selectedNegotiation.lastRespondedBy === 'law_firm');
    }

    // You can only accept when it's your turn (meaning the OTHER party made the last offer)
    // You cannot accept your own offer
    const canAccept = isMyTurn && 
                      (selectedNegotiation.status === 'counter_offered' || selectedNegotiation.status === 'pending') &&
                      selectedNegotiation.status !== 'accepted';
    const canCounterOffer = isMyTurn && selectedNegotiation.status !== 'accepted';

    return (
      <Modal
        visible={true}
        animationType="slide"
        onRequestClose={() => setSelectedNegotiation(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Negotiation Details</Text>
            <TouchableOpacity onPress={() => setSelectedNegotiation(null)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Client Information</Text>
              <Text style={styles.detailText}>
                {selectedNegotiation.clientName || `Client ID: ${selectedNegotiation.clientId}`}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Bill Description</Text>
              <Text style={styles.detailText}>{selectedNegotiation.billDescription}</Text>
            </View>

            <View style={styles.amountSection}>
              <View style={styles.amountDetailCol}>
                <Text style={styles.amountDetailLabel}>Original Bill</Text>
                <Text style={styles.amountDetailValue}>
                  ${(selectedNegotiation.billAmount || 0).toFixed(2)}
                </Text>
              </View>
              <View style={styles.amountDetailCol}>
                <Text style={styles.amountDetailLabel}>Current Offer</Text>
                <Text style={[styles.amountDetailValue, { color: theme.colors.primary }]}>
                  ${(selectedNegotiation.currentOffer || 0).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Status</Text>
              <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedNegotiation.status) }]}>
                <Text style={styles.statusTextLarge}>{getStatusText(selectedNegotiation.status)}</Text>
              </View>
            </View>

            {selectedNegotiation.history && selectedNegotiation.history.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.sectionTitle}>Negotiation History</Text>
                {selectedNegotiation.history.map((entry, index) => (
                  <View key={index} style={styles.historyEntry}>
                    <Text style={styles.historyDate}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </Text>
                    <Text style={styles.historyAction}>{entry.action}</Text>
                    <Text style={styles.historyAmount}>
                      Amount: ${(entry.amount || 0).toFixed(2)}
                    </Text>
                    {entry.notes && (
                      <Text style={styles.historyNotes}>Notes: {entry.notes}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {selectedNegotiation.status === 'accepted' && (
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownloadLog(selectedNegotiation.id)}
              >
                <Text style={styles.downloadButtonText}>📄 Download Full Log</Text>
              </TouchableOpacity>
            )}

            {/* Show call request details when status is stalled */}
            {selectedNegotiation.status === 'stalled' && selectedNegotiation.callRequestPhone && (
              <View style={styles.callRequestSection}>
                <Text style={styles.sectionTitle}>📞 Call Requested</Text>
                <View style={styles.callRequestDetails}>
                  <Text style={styles.callRequestLabel}>Phone Number:</Text>
                  <Text style={styles.callRequestValue}>{selectedNegotiation.callRequestPhone}</Text>
                  {selectedNegotiation.callRequestNotes && (
                    <>
                      <Text style={styles.callRequestLabel}>Message:</Text>
                      <Text style={styles.callRequestValue}>{selectedNegotiation.callRequestNotes}</Text>
                    </>
                  )}
                </View>
              </View>
            )}

            {selectedNegotiation.status !== 'accepted' && isMyTurn && (
              <View style={styles.actionSection}>
                {canAccept && (
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptOffer(selectedNegotiation.id)}
                  >
                    <Text style={styles.acceptButtonText}>✓ Accept Offer</Text>
                  </TouchableOpacity>
                )}

                {canCounterOffer && (
                  <TouchableOpacity
                    style={styles.counterButton}
                    onPress={() => setShowCounterOfferModal(true)}
                  >
                    <Text style={styles.counterButtonText}>↔ Send Counter Offer</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.callButton}
                  onPress={() => {
                    console.log('📞 Request Call button pressed');
                    setShowCallRequestModal(true);
                  }}
                >
                  <Text style={styles.callButtonText}>📞 Request Call</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Show waiting message when it's not your turn */}
            {selectedNegotiation.status !== 'accepted' && !isMyTurn && (
              <View style={styles.waitingSection}>
                <Text style={styles.waitingText}>⏳ Waiting for the other party to respond...</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const renderNewNegotiationModal = () => (
    <Modal
      visible={showNewNegotiationModal}
      animationType="slide"
      onRequestClose={() => setShowNewNegotiationModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>New Negotiation</Text>
          <TouchableOpacity onPress={() => setShowNewNegotiationModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.inputLabel}>
            Select {isLawFirm ? 'Client' : 'Patient'} *
          </Text>
          <View style={styles.pickerContainer}>
            {clients.map((client) => (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.clientOption,
                  selectedClientId === client.id && styles.clientOptionSelected
                ]}
                onPress={() => {
                  setSelectedClientId(client.id);
                  if (isLawFirm) {
                    loadMedicalProvidersForClient(client.id);
                  }
                }}
              >
                <Text style={[
                  styles.clientOptionText,
                  selectedClientId === client.id && styles.clientOptionTextSelected
                ]}>
                  {client.first_name || client.firstName} {client.last_name || client.lastName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Show medical provider selection for law firms */}
          {isLawFirm && selectedClientId && (
            <>
              <Text style={styles.inputLabel}>Select Medical Provider *</Text>
              {medicalProviders.length === 0 ? (
                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    ⚠️ No medical providers linked to this client.
                  </Text>
                  <Text style={styles.warningSubtext}>
                    Please link a medical provider to this client first.
                  </Text>
                </View>
              ) : (
                <View style={styles.pickerContainer}>
                  {medicalProviders.map((provider) => (
                    <TouchableOpacity
                      key={provider.id}
                      style={[
                        styles.clientOption,
                        selectedMedicalProviderId === provider.id && styles.clientOptionSelected
                      ]}
                      onPress={() => setSelectedMedicalProviderId(provider.id)}
                    >
                      <Text style={[
                        styles.clientOptionText,
                        selectedMedicalProviderId === provider.id && styles.clientOptionTextSelected
                      ]}>
                        {provider.name}
                        {provider.is_primary && ' (Primary)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </>
          )}

          <Text style={styles.inputLabel}>Bill Description *</Text>
          <TextInput
            style={styles.textArea}
            value={billDescription}
            onChangeText={setBillDescription}
            placeholder="e.g., Emergency Room Visit - 01/15/2025"
            multiline
            numberOfLines={3}
          />

          <Text style={styles.inputLabel}>Bill Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={billAmount}
            onChangeText={setBillAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>
            {isLawFirm ? 'Initial Offer ($) *' : 'Minimum Acceptable Amount ($) *'}
          </Text>
          <TextInput
            style={styles.input}
            value={initialOffer}
            onChangeText={setInitialOffer}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional context..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleInitiateNegotiation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Initiate Negotiation</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCounterOfferModal = () => (
    <Modal
      visible={showCounterOfferModal}
      animationType="slide"
      onRequestClose={() => setShowCounterOfferModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Counter Offer</Text>
          <TouchableOpacity onPress={() => setShowCounterOfferModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>Current Offer:</Text>
            <Text style={styles.infoValue}>
              ${(selectedNegotiation?.currentOffer || 0).toFixed(2)}
            </Text>
          </View>

          <Text style={styles.inputLabel}>Counter Offer Amount ($) *</Text>
          <TextInput
            style={styles.input}
            value={counterOfferAmount}
            onChangeText={setCounterOfferAmount}
            placeholder="0.00"
            keyboardType="decimal-pad"
          />

          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={counterOfferNotes}
            onChangeText={setCounterOfferNotes}
            placeholder="Explain your counter offer..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSendCounterOffer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Send Counter Offer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  const renderCallRequestModal = () => (
    <Modal
      visible={showCallRequestModal}
      animationType="slide"
      onRequestClose={() => setShowCallRequestModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Request Call</Text>
          <TouchableOpacity onPress={() => setShowCallRequestModal(false)}>
            <Text style={styles.closeButton}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          <Text style={styles.infoText}>
            Request a phone call to discuss this negotiation directly. The other party will receive your contact information.
          </Text>

          <Text style={styles.inputLabel}>Your Phone Number *</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+1 (555) 123-4567"
            keyboardType="phone-pad"
          />

          <Text style={styles.inputLabel}>Message (Optional)</Text>
          <TextInput
            style={styles.textArea}
            value={callNotes}
            onChangeText={setCallNotes}
            placeholder="Let them know when you're available..."
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRequestCall}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Send Call Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading && negotiations.length === 0) {
    return (
      <View style={styles.container}>
        {!hideHeader && (
          <View style={styles.header}>
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Bill Negotiations</Text>
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!hideHeader && (
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bill Negotiations</Text>
        </View>
      )}

      <View style={styles.content}>
        <TouchableOpacity
          style={styles.newNegotiationButton}
          onPress={() => setShowNewNegotiationModal(true)}
        >
          <Text style={styles.newNegotiationButtonText}>+ Start New Negotiation</Text>
        </TouchableOpacity>

        <ScrollView 
          style={styles.negotiationsList}
          contentContainerStyle={{ paddingBottom: bottomPadding || 20 }}
          showsVerticalScrollIndicator={true}
        >
          {negotiations.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No negotiations yet. Start one to begin negotiating medical bills!
              </Text>
            </View>
          ) : (
            negotiations.map(renderNegotiationCard)
          )}
        </ScrollView>
      </View>

      {selectedNegotiation && renderNegotiationDetail()}
      {showNewNegotiationModal && renderNewNegotiationModal()}
      {showCounterOfferModal && renderCounterOfferModal()}
      {showCallRequestModal && renderCallRequestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.primary,
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  newNegotiationButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  newNegotiationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  negotiationsList: {
    flex: 1,
  },
  negotiationCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  billDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 10,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  amountCol: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  yourTurnBadge: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  yourTurnText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 5,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: theme.colors.primary,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  amountDetailCol: {
    alignItems: 'center',
  },
  amountDetailLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  amountDetailValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  statusBadgeLarge: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  statusTextLarge: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  historyEntry: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.primary,
  },
  historyDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  historyAction: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 3,
  },
  historyAmount: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 3,
  },
  historyNotes: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  actionSection: {
    marginTop: 20,
  },
  callRequestSection: {
    backgroundColor: '#FFF3CD',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#FFD93D',
  },
  callRequestDetails: {
    marginTop: 10,
  },
  callRequestLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginTop: 8,
  },
  callRequestValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  waitingSection: {
    backgroundColor: '#E3F2FD',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: '#1565C0',
    fontWeight: '500',
    textAlign: 'center',
  },
  acceptButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  counterButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  counterButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  callButton: {
    backgroundColor: '#6c757d',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  downloadButton: {
    backgroundColor: '#17a2b8',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  downloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
  },
  textArea: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 15,
  },
  clientOption: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  clientOptionSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  clientOptionText: {
    fontSize: 16,
    color: '#000000',
  },
  clientOptionTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  infoBox: {
    backgroundColor: '#e7f3ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  infoValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  infoText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  warningBox: {
    backgroundColor: '#fff3cd',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 5,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#856404',
  },
});

export default NegotiationsScreen;