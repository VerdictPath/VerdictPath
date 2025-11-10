import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export default function LawFirmEventRequestsScreen({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [eventRequests, setEventRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Form state
  const [selectedClient, setSelectedClient] = useState(null);
  const [eventType, setEventType] = useState('deposition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      // Fetch event requests
      const requestsResponse = await fetch(`${API_BASE_URL}/event-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const requestsData = await requestsResponse.json();
      
      // Fetch clients
      const clientsResponse = await fetch(`${API_BASE_URL}/lawfirm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientsData = await clientsResponse.json();
      
      setEventRequests(requestsData.eventRequests || []);
      setClients(clientsData.clients || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      Alert.alert('Error', 'Failed to load event requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedClient || !title) {
      Alert.alert('Error', 'Please select a client and enter a title');
      return;
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/event-requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          eventType,
          title,
          description,
          location,
          durationMinutes: parseInt(durationMinutes) || 60,
          notes
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Event request sent to client');
        setShowCreateModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to create event request');
      }
    } catch (error) {
      console.error('Error creating event request:', error);
      Alert.alert('Error', 'Failed to create event request');
    }
  };

  const handleViewDetails = async (request) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/event-requests/${request.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    }
  };

  const handleConfirmDate = async (proposedDateId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/event-requests/${selectedRequest.eventRequest.id}/confirm`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ proposedDateId })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Event confirmed and added to calendar');
        setShowDetailModal(false);
        fetchData();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to confirm event');
      }
    } catch (error) {
      console.error('Error confirming date:', error);
      Alert.alert('Error', 'Failed to confirm event');
    }
  };

  const resetForm = () => {
    setSelectedClient(null);
    setEventType('deposition');
    setTitle('');
    setDescription('');
    setLocation('');
    setDurationMinutes('60');
    setNotes('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'dates_submitted': return '#4169E1';
      case 'confirmed': return '#32CD32';
      case 'cancelled': return '#DC143C';
      default: return '#808080';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Awaiting Response';
      case 'dates_submitted': return 'Dates Received';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Requests</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B4513" />
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
        <Text style={styles.headerTitle}>Event Requests</Text>
        <TouchableOpacity
          onPress={() => setShowCreateModal(true)}
          style={styles.createButton}
        >
          <Text style={styles.createButtonText}>+ New Request</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {eventRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No event requests yet</Text>
            <Text style={styles.emptySubtext}>
              Create a request to schedule depositions, mediations, or consultations with your clients
            </Text>
          </View>
        ) : (
          eventRequests.map((request) => (
            <TouchableOpacity
              key={request.id}
              style={styles.requestCard}
              onPress={() => handleViewDetails(request)}
            >
              <View style={styles.requestHeader}>
                <Text style={styles.requestTitle}>{request.title}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
                  <Text style={styles.statusText}>{getStatusLabel(request.status)}</Text>
                </View>
              </View>
              <Text style={styles.clientName}>Client: {request.clientName}</Text>
              <Text style={styles.eventType}>{request.eventType.replace('_', ' ').toUpperCase()}</Text>
              <Text style={styles.requestDate}>
                Created: {new Date(request.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Create Event Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Event Request</Text>
            
            <ScrollView style={styles.formScroll}>
              <Text style={styles.label}>Select Client *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientScroll}>
                {clients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={[
                      styles.clientChip,
                      selectedClient?.id === client.id && styles.clientChipSelected
                    ]}
                    onPress={() => setSelectedClient(client)}
                  >
                    <Text style={[
                      styles.clientChipText,
                      selectedClient?.id === client.id && styles.clientChipTextSelected
                    ]}>
                      {client.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Event Type *</Text>
              <View style={styles.typeButtonsRow}>
                {['deposition', 'mediation', 'consultation', 'court_date'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      eventType === type && styles.typeButtonSelected
                    ]}
                    onPress={() => setEventType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      eventType === type && styles.typeButtonTextSelected
                    ]}>
                      {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Medical Deposition - Dr. Smith"
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Additional details about the event"
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholder="Office, virtual, or other location"
              />

              <Text style={styles.label}>Duration (minutes)</Text>
              <TextInput
                style={styles.input}
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                placeholder="60"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Internal notes (not visible to client)"
                multiline
                numberOfLines={2}
              />
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateRequest}
              >
                <Text style={styles.submitButtonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Request Details Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowDetailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedRequest && (
              <>
                <Text style={styles.modalTitle}>{selectedRequest.eventRequest.title}</Text>
                <ScrollView style={styles.detailScroll}>
                  <Text style={styles.detailLabel}>Client</Text>
                  <Text style={styles.detailValue}>{selectedRequest.eventRequest.clientName}</Text>

                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.eventRequest.status) }]}>
                    <Text style={styles.statusText}>{getStatusLabel(selectedRequest.eventRequest.status)}</Text>
                  </View>

                  {selectedRequest.proposedDates && selectedRequest.proposedDates.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Client's Proposed Dates</Text>
                      {selectedRequest.proposedDates.map((date, index) => (
                        <View key={date.id} style={styles.proposedDateCard}>
                          <Text style={styles.proposedDateLabel}>Option {index + 1}</Text>
                          <Text style={styles.proposedDateTime}>
                            {new Date(date.proposedStartTime).toLocaleString()}
                          </Text>
                          <Text style={styles.proposedDateDuration}>
                            to {new Date(date.proposedEndTime).toLocaleTimeString()}
                          </Text>
                          {selectedRequest.eventRequest.status === 'dates_submitted' && !date.isSelected && (
                            <TouchableOpacity
                              style={styles.confirmDateButton}
                              onPress={() => handleConfirmDate(date.id)}
                            >
                              <Text style={styles.confirmDateButtonText}>Confirm This Date</Text>
                            </TouchableOpacity>
                          )}
                          {date.isSelected && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>✓ Selected</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </>
                  )}

                  {selectedRequest.eventRequest.status === 'pending' && (
                    <Text style={styles.pendingMessage}>
                      Waiting for client to propose available dates...
                    </Text>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowDetailModal(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  header: {
    backgroundColor: '#8B4513',
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    flex: 1,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#D4AF37',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  requestCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#8B4513',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  statusText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },
  clientName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#8B4513',
    marginBottom: 16,
  },
  formScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  clientScroll: {
    marginBottom: 8,
  },
  clientChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  clientChipSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#D4AF37',
  },
  clientChipText: {
    color: '#333',
    fontSize: 14,
  },
  clientChipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  typeButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeButtonSelected: {
    backgroundColor: '#8B4513',
    borderColor: '#D4AF37',
  },
  typeButtonText: {
    color: '#333',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  typeButtonTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B4513',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#8B4513',
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#8B4513',
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
  detailScroll: {
    maxHeight: 500,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#8B4513',
    marginTop: 20,
    marginBottom: 12,
  },
  proposedDateCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  proposedDateLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 4,
  },
  proposedDateTime: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  proposedDateDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  confirmDateButton: {
    backgroundColor: '#32CD32',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  confirmDateButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  selectedBadge: {
    backgroundColor: '#D4AF37',
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  selectedBadgeText: {
    color: '#FFF',
    fontWeight: '600',
  },
  pendingMessage: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    padding: 20,
  },
  closeButton: {
    backgroundColor: '#8B4513',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  closeButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 16,
  },
});
