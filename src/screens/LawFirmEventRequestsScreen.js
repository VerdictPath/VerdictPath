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
  Modal,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config/api';

const formatDate = (date) => {
  if (!date) return '';
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
};

const formatTime = (date) => {
  if (!date) return '';
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours}:${minutes} ${ampm}`;
};

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
  const [clientSearchQuery, setClientSearchQuery] = useState('');

  // Date/time options state (4 options for client to choose from)
  const getDefaultDateTime = (daysFromNow, hour) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const [dateTimeOptions, setDateTimeOptions] = useState([
    { date: getDefaultDateTime(7, 10), startTime: getDefaultDateTime(7, 10) },
    { date: getDefaultDateTime(8, 14), startTime: getDefaultDateTime(8, 14) },
    { date: getDefaultDateTime(9, 10), startTime: getDefaultDateTime(9, 10) },
    { date: getDefaultDateTime(10, 14), startTime: getDefaultDateTime(10, 14) }
  ]);
  const [showDatePicker, setShowDatePicker] = useState({ visible: false, index: -1, type: 'date' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = user?.token || await AsyncStorage.getItem('authToken');
      
      // Fetch event requests
      const requestsResponse = await fetch(`${API_BASE_URL}/api/event-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const requestsData = await requestsResponse.json();
      console.log('[EventRequests] Requests response:', requestsData);
      
      // Fetch clients
      const clientsResponse = await fetch(`${API_BASE_URL}/api/lawfirm/clients`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const clientsData = await clientsResponse.json();
      console.log('[EventRequests] Clients response:', clientsData);
      
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

    // Validate all 4 date/time options are set
    const validOptions = dateTimeOptions.filter(opt => opt.date && opt.startTime);
    if (validOptions.length !== 4) {
      Alert.alert('Error', 'Please provide all 4 date/time options for the client to choose from');
      return;
    }

    try {
      const token = user?.token || await AsyncStorage.getItem('authToken');
      
      // Build proposed dates array with start and end times based on duration
      const duration = parseInt(durationMinutes) || 60;
      const proposedDates = dateTimeOptions.map(opt => {
        const startTime = new Date(opt.date);
        startTime.setHours(opt.startTime.getHours(), opt.startTime.getMinutes(), 0, 0);
        
        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + duration);
        
        return {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString()
        };
      });
      
      const response = await fetch(`${API_BASE_URL}/api/event-requests`, {
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
          durationMinutes: duration,
          notes,
          proposedDates
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Event request sent to client with 4 date options');
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
  
  const handleDateTimeChange = (event, selectedValue, index, type) => {
    if (event.type === 'dismissed') {
      setShowDatePicker({ visible: false, index: -1, type: 'date' });
      return;
    }
    
    if (selectedValue) {
      const newOptions = [...dateTimeOptions];
      if (type === 'date') {
        newOptions[index].date = selectedValue;
        newOptions[index].startTime = new Date(
          selectedValue.getFullYear(),
          selectedValue.getMonth(),
          selectedValue.getDate(),
          newOptions[index].startTime.getHours(),
          newOptions[index].startTime.getMinutes()
        );
      } else {
        newOptions[index].startTime = new Date(
          newOptions[index].date.getFullYear(),
          newOptions[index].date.getMonth(),
          newOptions[index].date.getDate(),
          selectedValue.getHours(),
          selectedValue.getMinutes()
        );
      }
      setDateTimeOptions(newOptions);
    }
    
    if (Platform.OS !== 'ios') {
      setShowDatePicker({ visible: false, index: -1, type: 'date' });
    }
  };

  const handleViewDetails = async (request) => {
    try {
      const token = user?.token || await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/event-requests/${request.id}`, {
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
      const token = user?.token || await AsyncStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/api/event-requests/${selectedRequest.eventRequest.id}/confirm`,
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
    setClientSearchQuery('');
    setDateTimeOptions([
      { date: getDefaultDateTime(7, 10), startTime: getDefaultDateTime(7, 10) },
      { date: getDefaultDateTime(8, 14), startTime: getDefaultDateTime(8, 14) },
      { date: getDefaultDateTime(9, 10), startTime: getDefaultDateTime(9, 10) },
      { date: getDefaultDateTime(10, 14), startTime: getDefaultDateTime(10, 14) }
    ]);
    setShowDatePicker({ visible: false, index: -1, type: 'date' });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'dates_offered': return '#1E90FF';
      case 'dates_submitted': return '#4169E1';
      case 'confirmed': return '#32CD32';
      case 'cancelled': return '#DC143C';
      default: return '#808080';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Awaiting Response';
      case 'dates_offered': return 'Awaiting Selection';
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
            
            <ScrollView 
              style={styles.formScroll}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Select Client *</Text>
              
              {/* Client Search Bar */}
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  value={clientSearchQuery}
                  onChangeText={setClientSearchQuery}
                  placeholder="Search clients by name or email..."
                  placeholderTextColor="#999"
                />
                {clientSearchQuery.length > 0 && (
                  <TouchableOpacity
                    style={styles.clearSearchButton}
                    onPress={() => setClientSearchQuery('')}
                  >
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Client List */}
              <ScrollView 
                style={styles.clientListContainer}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
              >
                {clients
                  .filter(client => {
                    if (!clientSearchQuery.trim()) return true;
                    const query = clientSearchQuery.toLowerCase();
                    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
                    const email = client.email?.toLowerCase() || '';
                    return fullName.includes(query) || email.includes(query);
                  })
                  .map((client) => (
                    <TouchableOpacity
                      key={client.id}
                      style={[
                        styles.clientCard,
                        selectedClient?.id === client.id && styles.clientCardSelected
                      ]}
                      onPress={() => setSelectedClient(client)}
                    >
                      <View style={styles.clientCardContent}>
                        <Text style={[
                          styles.clientName,
                          selectedClient?.id === client.id && styles.clientNameSelected
                        ]}>
                          {client.first_name} {client.last_name}
                        </Text>
                        {client.email && (
                          <Text style={styles.clientEmail}>{client.email}</Text>
                        )}
                      </View>
                      {selectedClient?.id === client.id && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))}
                {clients.filter(client => {
                  if (!clientSearchQuery.trim()) return true;
                  const query = clientSearchQuery.toLowerCase();
                  const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
                  const email = client.email?.toLowerCase() || '';
                  return fullName.includes(query) || email.includes(query);
                }).length === 0 && (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>No clients found</Text>
                  </View>
                )}
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

              <Text style={styles.sectionTitle}>Date/Time Options for Client *</Text>
              <Text style={styles.sectionSubtext}>Provide 4 options for the client to choose from</Text>

              {dateTimeOptions.map((option, index) => (
                <View key={index} style={styles.dateTimeOptionCard}>
                  <Text style={styles.dateTimeOptionLabel}>Option {index + 1}</Text>
                  <View style={styles.dateTimeRow}>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker({ visible: true, index, type: 'date' })}
                    >
                      <Text style={styles.datePickerLabel}>Date</Text>
                      <Text style={styles.datePickerValue}>{formatDate(option.date)}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowDatePicker({ visible: true, index, type: 'time' })}
                    >
                      <Text style={styles.datePickerLabel}>Time</Text>
                      <Text style={styles.datePickerValue}>{formatTime(option.startTime)}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              {showDatePicker.visible && (
                <DateTimePicker
                  value={showDatePicker.type === 'date' 
                    ? dateTimeOptions[showDatePicker.index].date 
                    : dateTimeOptions[showDatePicker.index].startTime}
                  mode={showDatePicker.type}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedValue) => 
                    handleDateTimeChange(event, selectedValue, showDatePicker.index, showDatePicker.type)
                  }
                  minimumDate={new Date()}
                />
              )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#666',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    padding: 0,
  },
  clearSearchButton: {
    padding: 4,
    marginLeft: 8,
  },
  clearSearchText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  clientListContainer: {
    maxHeight: 200,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  clientCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  clientCardSelected: {
    backgroundColor: '#e8f4f8',
    borderLeftWidth: 4,
    borderLeftColor: '#8B4513',
  },
  clientCardContent: {
    flex: 1,
  },
  clientNameSelected: {
    color: '#8B4513',
    fontWeight: 'bold',
  },
  clientEmail: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  checkmark: {
    fontSize: 20,
    color: '#8B4513',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
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
  sectionSubtext: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  dateTimeOptionCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#D4AF37',
  },
  dateTimeOptionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  dateTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCC',
    alignItems: 'center',
  },
  datePickerLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  datePickerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
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
