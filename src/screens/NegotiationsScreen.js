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
import { theme } from '../styles/theme';
import { apiRequest, API_ENDPOINTS } from '../config/api';
import alert from '../utils/alert';

const NegotiationsScreen = ({ user, onBack }) => {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active'); // 'active', 'completed', 'new'
  const [showInitiateModal, setShowInitiateModal] = useState(false);
  const [showCounterOfferModal, setShowCounterOfferModal] = useState(false);
  const [showCallRequestModal, setShowCallRequestModal] = useState(false);
  const [selectedNegotiation, setSelectedNegotiation] = useState(null);
  const [clients, setClients] = useState([]);
  const [medicalProviders, setMedicalProviders] = useState([]);
  
  // New negotiation form fields
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [billDescription, setBillDescription] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [initialOffer, setInitialOffer] = useState('');
  const [notes, setNotes] = useState('');
  
  // Counter offer fields
  const [counterOffer, setCounterOffer] = useState('');
  const [counterNotes, setCounterNotes] = useState('');
  
  // Call request fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callNotes, setCallNotes] = useState('');
  
  const [processing, setProcessing] = useState(false);

  const isLawFirm = user?.userType === 'lawfirm';
  const isMedicalProvider = user?.userType === 'medical_provider';

  useEffect(() => {
    loadNegotiations();
    if (isLawFirm) {
      loadClients();
    } else if (isMedicalProvider) {
      loadPatients();
    }
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

      setNegotiations(response.negotiations || []);
    } catch (error) {
      console.error('Error loading negotiations:', error);
      alert('Error', 'Failed to load negotiations');
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await apiRequest(API_ENDPOINTS.LAWFIRM.GET_CLIENTS, {
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
      const response = await apiRequest(API_ENDPOINTS.MEDICALPROVIDER.GET_PATIENTS, {
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
    try {
      const response = await apiRequest(
        API_ENDPOINTS.CLIENT_RELATIONSHIPS.GET_CLIENT_PROVIDERS(clientId),
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${user.token}`
          }
        }
      );

      setMedicalProviders(response.providers || []);
    } catch (error) {
      console.error('Error loading medical providers:', error);
      setMedicalProviders([]);
    }
  };

  const handleInitiateNegotiation = async () => {
    if (!billDescription.trim() || !billAmount || !initialOffer) {
      alert('Error', 'Please fill in all required fields');
      return;
    }

    if (parseFloat(initialOffer) > parseFloat(billAmount)) {
      alert('Error', 'Initial offer must be less than or equal to bill amount');
      return;
    }

    if (!selectedClient) {
      alert('Error', isLawFirm ? 'Please select a client' : 'Please select a patient');
      return;
    }

    if (isLawFirm && !selectedProvider) {
      alert('Error', 'Please select a medical provider');
      return;
    }

    try {
      setProcessing(true);
      
      const body = {
        clientId: selectedClient?.id,
        billDescription,
        billAmount: parseFloat(billAmount),
        initialOffer: parseFloat(initialOffer),
        notes: notes.trim() || null
      };

      if (isLawFirm) {
        body.medicalProviderId = selectedProvider?.id;
      }

      await apiRequest(API_ENDPOINTS.NEGOTIATIONS.INITIATE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      alert('Success', 'Negotiation initiated successfully');
      setShowInitiateModal(false);
      resetForm();
      loadNegotiations();
    } catch (error) {
      console.error('Error initiating negotiation:', error);
      alert('Error', error.message || 'Failed to initiate negotiation');
    } finally {
      setProcessing(false);
    }
  };

  const handleCounterOffer = async () => {
    if (!counterOffer) {
      alert('Error', 'Please enter a counter offer amount');
      return;
    }

    if (parseFloat(counterOffer) > parseFloat(selectedNegotiation.bill_amount)) {
      alert('Error', 'Counter offer cannot exceed the bill amount');
      return;
    }

    try {
      setProcessing(true);
      await apiRequest(API_ENDPOINTS.NEGOTIATIONS.COUNTER_OFFER, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          negotiationId: selectedNegotiation.id,
          counterOffer: parseFloat(counterOffer),
          notes: counterNotes.trim() || null
        })
      });

      alert('Success', 'Counter offer sent successfully');
      setShowCounterOfferModal(false);
      setCounterOffer('');
      setCounterNotes('');
      setSelectedNegotiation(null);
      loadNegotiations();
    } catch (error) {
      console.error('Error sending counter offer:', error);
      alert('Error', error.message || 'Failed to send counter offer');
    } finally {
      setProcessing(false);
    }
  };

  const handleAcceptOffer = async (negotiation) => {
    alert(
      'Accept Offer',
      `Accept the current offer of $${parseFloat(negotiation.current_offer).toFixed(2)} for ${negotiation.bill_description}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              setProcessing(true);
              await apiRequest(API_ENDPOINTS.NEGOTIATIONS.ACCEPT, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${user.token}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  negotiationId: negotiation.id
                })
              });

              alert('Success', 'Offer accepted! Negotiation complete.');
              loadNegotiations();
            } catch (error) {
              console.error('Error accepting offer:', error);
              alert('Error', error.message || 'Failed to accept offer');
            } finally {
              setProcessing(false);
            }
          }
        }
      ]
    );
  };

  const handleRequestCall = async () => {
    if (!phoneNumber.trim()) {
      alert('Error', 'Please enter a phone number');
      return;
    }

    try {
      setProcessing(true);
      await apiRequest(API_ENDPOINTS.NEGOTIATIONS.REQUEST_CALL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          negotiationId: selectedNegotiation.id,
          phoneNumber: phoneNumber.trim(),
          notes: callNotes.trim() || null
        })
      });

      alert('Success', 'Call request sent successfully');
      setShowCallRequestModal(false);
      setPhoneNumber('');
      setCallNotes('');
      setSelectedNegotiation(null);
      loadNegotiations();
    } catch (error) {
      console.error('Error requesting call:', error);
      alert('Error', error.message || 'Failed to send call request');
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setSelectedProvider(null);
    setBillDescription('');
    setBillAmount('');
    setInitialOffer('');
    setNotes('');
    setMedicalProviders([]);
  };

  const filteredNegotiations = negotiations.filter(neg => {
    if (activeTab === 'active') {
      return neg.status !== 'accepted';
    } else if (activeTab === 'completed') {
      return neg.status === 'accepted';
    }
    return false;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { text: 'Pending', color: theme.colors.warmGold },
      counter_offered: { text: 'Counter Offered', color: '#3498db' },
      accepted: { text: 'Accepted', color: '#27ae60' },
      stalled: { text: 'Call Requested', color: '#e74c3c' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <View style={[styles.statusBadge, { backgroundColor: config.color }]}>
        <Text style={styles.statusBadgeText}>{config.text}</Text>
      </View>
    );
  };

  const renderNegotiationCard = (negotiation) => {
    const savingsAmount = parseFloat(negotiation.bill_amount) - parseFloat(negotiation.current_offer);
    const savingsPercentage = (savingsAmount / parseFloat(negotiation.bill_amount) * 100).toFixed(1);
    const otherParty = isLawFirm ? negotiation.provider_name : negotiation.firm_name;

    return (
      <View key={negotiation.id} style={styles.negotiationCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.clientName}>{negotiation.client_name}</Text>
          {getStatusBadge(negotiation.status)}
        </View>

        <Text style={styles.billDescription}>{negotiation.bill_description}</Text>
        <Text style={styles.otherParty}>{isLawFirm ? 'Medical Provider' : 'Law Firm'}: {otherParty}</Text>

        <View style={styles.amountsRow}>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Original Bill</Text>
            <Text style={styles.amountValue}>${parseFloat(negotiation.bill_amount).toFixed(2)}</Text>
          </View>
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Current Offer</Text>
            <Text style={[styles.amountValue, { color: theme.colors.warmGold }]}>
              ${parseFloat(negotiation.current_offer).toFixed(2)}
            </Text>
          </View>
        </View>

        {savingsAmount > 0 && (
          <View style={styles.savingsRow}>
            <Text style={styles.savingsText}>
              Potential Savings: ${savingsAmount.toFixed(2)} ({savingsPercentage}%)
            </Text>
          </View>
        )}

        {negotiation.history && negotiation.history.length > 0 && (
          <Text style={styles.interactionText}>
            {negotiation.interaction_count} interaction{negotiation.interaction_count !== 1 ? 's' : ''}
          </Text>
        )}

        {negotiation.status !== 'accepted' && (
          <View style={styles.cardActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.counterButton]}
              onPress={() => {
                setSelectedNegotiation(negotiation);
                setCounterOffer(negotiation.current_offer);
                setShowCounterOfferModal(true);
              }}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Counter Offer</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.acceptButton]}
              onPress={() => handleAcceptOffer(negotiation)}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={() => {
                setSelectedNegotiation(negotiation);
                setShowCallRequestModal(true);
              }}
              disabled={processing}
            >
              <Text style={styles.actionButtonText}>📞</Text>
            </TouchableOpacity>
          </View>
        )}

        {negotiation.status === 'accepted' && (
          <View style={styles.completedBanner}>
            <Text style={styles.completedText}>✅ Agreement reached</Text>
            <Text style={styles.finalAmountText}>
              Final Amount: ${parseFloat(negotiation.current_offer).toFixed(2)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderInitiateModal = () => (
    <Modal
      visible={showInitiateModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowInitiateModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView>
            <Text style={styles.modalTitle}>Start New Negotiation</Text>

            {isLawFirm && (
              <>
                <Text style={styles.inputLabel}>Select Client *</Text>
                <ScrollView style={styles.clientPickerContainer}>
                  {clients.map(client => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.clientOption,
                        selectedClient?.id === client.id && styles.selectedOption
                      ]}
                      onPress={() => {
                        setSelectedClient(client);
                        loadMedicalProvidersForClient(client.id);
                      }}
                    >
                      <Text style={styles.clientOptionText}>{client.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {selectedClient && medicalProviders.length > 0 && (
                  <>
                    <Text style={styles.inputLabel}>Select Medical Provider *</Text>
                    <ScrollView style={styles.clientPickerContainer}>
                      {medicalProviders.map(provider => (
                        <TouchableOpacity
                          key={provider.id}
                          style={[
                            styles.clientOption,
                            selectedProvider?.id === provider.id && styles.selectedOption
                          ]}
                          onPress={() => setSelectedProvider(provider)}
                        >
                          <Text style={styles.clientOptionText}>{provider.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </>
                )}
              </>
            )}

            {isMedicalProvider && (
              <>
                <Text style={styles.inputLabel}>Select Patient *</Text>
                <ScrollView style={styles.clientPickerContainer}>
                  {clients.map(patient => (
                    <TouchableOpacity
                      key={patient.id}
                      style={[
                        styles.clientOption,
                        selectedClient?.id === patient.id && styles.selectedOption
                      ]}
                      onPress={() => setSelectedClient(patient)}
                    >
                      <Text style={styles.clientOptionText}>{patient.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={styles.inputLabel}>Bill Description *</Text>
            <TextInput
              style={styles.textInput}
              value={billDescription}
              onChangeText={setBillDescription}
              placeholder="e.g., Emergency Room Visit - March 2024"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Bill Amount *</Text>
            <TextInput
              style={styles.textInput}
              value={billAmount}
              onChangeText={setBillAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Initial Offer *</Text>
            <TextInput
              style={styles.textInput}
              value={initialOffer}
              onChangeText={setInitialOffer}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
            />

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Additional details or justification..."
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowInitiateModal(false);
                  resetForm();
                }}
                disabled={processing}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.submitButton]}
                onPress={handleInitiateNegotiation}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.modalButtonText}>Initiate</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCounterOfferModal = () => (
    <Modal
      visible={showCounterOfferModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCounterOfferModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Submit Counter Offer</Text>

          {selectedNegotiation && (
            <>
              <Text style={styles.negotiationInfo}>
                {selectedNegotiation.bill_description}
              </Text>
              <Text style={styles.currentOfferInfo}>
                Current Offer: ${parseFloat(selectedNegotiation.current_offer).toFixed(2)}
              </Text>
            </>
          )}

          <Text style={styles.inputLabel}>Counter Offer Amount *</Text>
          <TextInput
            style={styles.textInput}
            value={counterOffer}
            onChangeText={setCounterOffer}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />

          <Text style={styles.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={counterNotes}
            onChangeText={setCounterNotes}
            placeholder="Explain your counter offer..."
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCounterOfferModal(false);
                setCounterOffer('');
                setCounterNotes('');
                setSelectedNegotiation(null);
              }}
              disabled={processing}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleCounterOffer}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalButtonText}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderCallRequestModal = () => (
    <Modal
      visible={showCallRequestModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowCallRequestModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Request Phone Call</Text>

          {selectedNegotiation && (
            <Text style={styles.negotiationInfo}>
              {selectedNegotiation.bill_description}
            </Text>
          )}

          <Text style={styles.inputLabel}>Your Phone Number *</Text>
          <TextInput
            style={styles.textInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="(555) 123-4567"
            keyboardType="phone-pad"
            placeholderTextColor="#999"
          />

          <Text style={styles.inputLabel}>Message (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={callNotes}
            onChangeText={setCallNotes}
            placeholder="Best time to call, additional notes..."
            multiline
            numberOfLines={4}
            placeholderTextColor="#999"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={() => {
                setShowCallRequestModal(false);
                setPhoneNumber('');
                setCallNotes('');
                setSelectedNegotiation(null);
              }}
              disabled={processing}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton]}
              onPress={handleRequestCall}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.modalButtonText}>Send Request</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.warmGold} />
        <Text style={styles.loadingText}>Loading negotiations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bill Negotiations</Text>
        {isLawFirm && (
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowInitiateModal(true)}
          >
            <Text style={styles.addButtonText}>+ New</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'active' && styles.activeTab]}
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>
            Active
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'completed' && styles.activeTab]}
          onPress={() => setActiveTab('completed')}
        >
          <Text style={[styles.tabText, activeTab === 'completed' && styles.activeTabText]}>
            Completed
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.listContainer}>
        {filteredNegotiations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>💰</Text>
            <Text style={styles.emptyStateText}>
              {activeTab === 'active' 
                ? 'No active negotiations' 
                : 'No completed negotiations'}
            </Text>
            {activeTab === 'active' && isLawFirm && (
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={() => setShowInitiateModal(true)}
              >
                <Text style={styles.emptyStateButtonText}>Start a Negotiation</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredNegotiations.map(renderNegotiationCard)
        )}
      </ScrollView>

      {renderInitiateModal()}
      {renderCounterOfferModal()}
      {renderCallRequestModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.mahogany,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: theme.colors.warmGold,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: theme.colors.mahogany,
    fontWeight: '600',
  },
  listContainer: {
    flex: 1,
  },
  negotiationCard: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
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
    marginBottom: 12,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  billDescription: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  otherParty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  amountsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  amountBox: {
    flex: 1,
    marginHorizontal: 4,
  },
  amountLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
  },
  savingsRow: {
    backgroundColor: '#E8F5E9',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  savingsText: {
    fontSize: 14,
    color: '#2E7D32',
    fontWeight: '600',
  },
  interactionText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 12,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  counterButton: {
    backgroundColor: '#3498db',
  },
  acceptButton: {
    backgroundColor: '#27ae60',
  },
  callButton: {
    backgroundColor: '#e74c3c',
    flex: 0.5,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  completedBanner: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  finalAmountText: {
    fontSize: 14,
    color: '#2E7D32',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: theme.colors.warmGold,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.mahogany,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  clientPickerContainer: {
    maxHeight: 150,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 8,
  },
  clientOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  selectedOption: {
    backgroundColor: theme.colors.warmGold + '20',
  },
  clientOptionText: {
    fontSize: 16,
    color: '#333',
  },
  negotiationInfo: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  currentOfferInfo: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    marginHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95a5a6',
  },
  submitButton: {
    backgroundColor: theme.colors.warmGold,
  },
  modalButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NegotiationsScreen;
