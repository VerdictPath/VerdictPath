import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { API_BASE_URL } from '../config/api';

export default function ClientEventRequestsScreen({ user, onBack }) {
  const [loading, setLoading] = useState(true);
  const [eventRequests, setEventRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [currentDateIndex, setCurrentDateIndex] = useState(null);
  const [currentTimeType, setCurrentTimeType] = useState('start'); // 'start' or 'end'
  
  // Proposed dates state (3 dates)
  const [proposedDates, setProposedDates] = useState([
    { startTime: null, endTime: null },
    { startTime: null, endTime: null },
    { startTime: null, endTime: null }
  ]);

  useEffect(() => {
    fetchEventRequests();
  }, []);

  const fetchEventRequests = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/event-requests`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      setEventRequests(data.eventRequests || []);
    } catch (error) {
      console.error('Error fetching event requests:', error);
      Alert.alert('Error', 'Failed to load event requests');
    } finally {
      setLoading(false);
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
        
        // If dates already submitted, populate them
        if (data.proposedDates && data.proposedDates.length === 3) {
          setProposedDates(data.proposedDates.map(d => ({
            startTime: new Date(d.proposedStartTime),
            endTime: new Date(d.proposedEndTime)
          })));
        } else {
          // Reset to empty dates
          setProposedDates([
            { startTime: null, endTime: null },
            { startTime: null, endTime: null },
            { startTime: null, endTime: null }
          ]);
        }
        
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error('Error fetching request details:', error);
      Alert.alert('Error', 'Failed to load request details');
    }
  };

  const handleDateTimeChange = (event, selectedDate) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      setShowTimePicker(false);
    }

    if (selectedDate && currentDateIndex !== null) {
      const newDates = [...proposedDates];
      
      if (currentTimeType === 'start') {
        newDates[currentDateIndex].startTime = selectedDate;
        
        // Auto-calculate end time based on duration
        if (selectedRequest?.eventRequest?.durationMinutes) {
          const endTime = new Date(selectedDate);
          endTime.setMinutes(endTime.getMinutes() + selectedRequest.eventRequest.durationMinutes);
          newDates[currentDateIndex].endTime = endTime;
        }
      } else {
        newDates[currentDateIndex].endTime = selectedDate;
      }
      
      setProposedDates(newDates);
    }
  };

  const openDateTimePicker = (index, timeType) => {
    setCurrentDateIndex(index);
    setCurrentTimeType(timeType);
    setShowDatePicker(true);
  };

  const handleSubmitDates = async () => {
    // Validate all dates are selected
    const allDatesValid = proposedDates.every(d => d.startTime && d.endTime);
    
    if (!allDatesValid) {
      Alert.alert('Error', 'Please select start and end times for all 3 dates');
      return;
    }

    // Validate end time is after start time for each date
    for (let i = 0; i < proposedDates.length; i++) {
      if (proposedDates[i].endTime <= proposedDates[i].startTime) {
        Alert.alert('Error', `Date ${i + 1}: End time must be after start time`);
        return;
      }
    }

    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/event-requests/${selectedRequest.eventRequest.id}/propose-dates`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            proposedDates: proposedDates.map(d => ({
              startTime: d.startTime.toISOString(),
              endTime: d.endTime.toISOString()
            }))
          })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Your available dates have been sent to your law firm');
        setShowDetailModal(false);
        fetchEventRequests();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to submit dates');
      }
    } catch (error) {
      console.error('Error submitting dates:', error);
      Alert.alert('Error', 'Failed to submit dates');
    }
  };

  const handleSelectOfferedDate = async (proposedDateId) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      const response = await fetch(
        `${API_BASE_URL}/event-requests/${selectedRequest.eventRequest.id}/select-date`,
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
        Alert.alert('Success', 'Date selected! The event has been added to your calendar.');
        setShowDetailModal(false);
        fetchEventRequests();
      } else {
        const error = await response.json();
        Alert.alert('Error', error.error || 'Failed to select date');
      }
    } catch (error) {
      console.error('Error selecting date:', error);
      Alert.alert('Error', 'Failed to select date');
    }
  };

  const formatDateUS = (dateString) => {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${month}/${day}/${year} at ${hours}:${minutes} ${ampm}`;
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
      case 'pending': return 'Action Required';
      case 'dates_offered': return 'Select a Date';
      case 'dates_submitted': return 'Awaiting Confirmation';
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
      </View>

      <ScrollView style={styles.content}>
        {eventRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No event requests</Text>
            <Text style={styles.emptySubtext}>
              Your law firm will send requests when they need to schedule meetings with you
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
              <Text style={styles.lawFirmName}>From: {request.lawFirmName}</Text>
              <Text style={styles.eventType}>{request.eventType.replace('_', ' ').toUpperCase()}</Text>
              {request.description && (
                <Text style={styles.description} numberOfLines={2}>
                  {request.description}
                </Text>
              )}
              <Text style={styles.requestDate}>
                Requested: {new Date(request.createdAt).toLocaleDateString()}
              </Text>
              {request.status === 'pending' && (
                <View style={styles.actionRequiredBanner}>
                  <Text style={styles.actionRequiredText}>📅 Please select 3 available dates</Text>
                </View>
              )}
              {request.status === 'dates_offered' && (
                <View style={[styles.actionRequiredBanner, { backgroundColor: '#1E90FF' }]}>
                  <Text style={styles.actionRequiredText}>📅 Choose one of the offered times</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

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
                <ScrollView style={styles.detailScroll}>
                  <Text style={styles.modalTitle}>{selectedRequest.eventRequest.title}</Text>
                  
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedRequest.eventRequest.status), marginBottom: 16 }]}>
                    <Text style={styles.statusText}>{getStatusLabel(selectedRequest.eventRequest.status)}</Text>
                  </View>

                  <Text style={styles.detailLabel}>Law Firm</Text>
                  <Text style={styles.detailValue}>{selectedRequest.eventRequest.lawFirmName}</Text>

                  <Text style={styles.detailLabel}>Event Type</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.eventRequest.eventType.replace('_', ' ').toUpperCase()}
                  </Text>

                  {selectedRequest.eventRequest.description && (
                    <>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.detailValue}>{selectedRequest.eventRequest.description}</Text>
                    </>
                  )}

                  {selectedRequest.eventRequest.location && (
                    <>
                      <Text style={styles.detailLabel}>Location</Text>
                      <Text style={styles.detailValue}>{selectedRequest.eventRequest.location}</Text>
                    </>
                  )}

                  <Text style={styles.detailLabel}>Expected Duration</Text>
                  <Text style={styles.detailValue}>
                    {selectedRequest.eventRequest.durationMinutes} minutes
                  </Text>

                  {selectedRequest.eventRequest.status === 'pending' && (
                    <>
                      <Text style={styles.sectionTitle}>Select 3 Available Dates</Text>
                      <Text style={styles.instructionText}>
                        Please provide 3 dates and times when you are available. Your law firm will select one.
                      </Text>

                      {proposedDates.map((date, index) => (
                        <View key={index} style={styles.dateCard}>
                          <Text style={styles.dateCardTitle}>Option {index + 1}</Text>
                          
                          <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => openDateTimePicker(index, 'start')}
                          >
                            <Text style={styles.dateButtonLabel}>Start Time</Text>
                            <Text style={styles.dateButtonValue}>
                              {date.startTime ? date.startTime.toLocaleString() : 'Tap to select'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.dateButton}
                            onPress={() => openDateTimePicker(index, 'end')}
                          >
                            <Text style={styles.dateButtonLabel}>End Time</Text>
                            <Text style={styles.dateButtonValue}>
                              {date.endTime ? date.endTime.toLocaleString() : 'Tap to select'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}

                  {selectedRequest.eventRequest.status === 'dates_offered' && (
                    <>
                      <Text style={styles.sectionTitle}>Select a Date</Text>
                      <Text style={styles.instructionText}>
                        Your law firm has offered the following times. Please select one that works for you.
                      </Text>
                      {selectedRequest.proposedDates && selectedRequest.proposedDates.map((date, index) => (
                        <View key={date.id} style={styles.offeredDateCard}>
                          <Text style={styles.offeredDateLabel}>Option {index + 1}</Text>
                          <Text style={styles.offeredDateTime}>
                            {formatDateUS(date.proposedStartTime)}
                          </Text>
                          <Text style={styles.offeredDateDuration}>
                            Duration: {selectedRequest.eventRequest.durationMinutes} minutes
                          </Text>
                          <TouchableOpacity
                            style={styles.selectDateButton}
                            onPress={() => handleSelectOfferedDate(date.id)}
                          >
                            <Text style={styles.selectDateButtonText}>Select This Time</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}

                  {selectedRequest.eventRequest.status === 'dates_submitted' && (
                    <>
                      <Text style={styles.sectionTitle}>Your Proposed Dates</Text>
                      {selectedRequest.proposedDates && selectedRequest.proposedDates.map((date, index) => (
                        <View key={date.id} style={styles.proposedDateCard}>
                          <Text style={styles.proposedDateLabel}>Option {index + 1}</Text>
                          <Text style={styles.proposedDateTime}>
                            {new Date(date.proposedStartTime).toLocaleString()}
                          </Text>
                          <Text style={styles.proposedDateDuration}>
                            to {new Date(date.proposedEndTime).toLocaleTimeString()}
                          </Text>
                          {date.isSelected && (
                            <View style={styles.selectedBadge}>
                              <Text style={styles.selectedBadgeText}>✓ Law Firm Selected This Date</Text>
                            </View>
                          )}
                        </View>
                      ))}
                      <Text style={styles.pendingMessage}>
                        Waiting for your law firm to confirm a date...
                      </Text>
                    </>
                  )}

                  {selectedRequest.eventRequest.status === 'confirmed' && (
                    <>
                      <Text style={styles.sectionTitle}>✓ Confirmed</Text>
                      <Text style={styles.confirmedMessage}>
                        This event has been confirmed and added to your calendar.
                      </Text>
                    </>
                  )}
                </ScrollView>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.closeButtonText}>Close</Text>
                  </TouchableOpacity>
                  
                  {selectedRequest.eventRequest.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.submitButton}
                      onPress={handleSubmitDates}
                    >
                      <Text style={styles.submitButtonText}>Submit Dates</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Date/Time Picker */}
      {(showDatePicker || showTimePicker) && (
        <DateTimePicker
          value={
            currentDateIndex !== null && proposedDates[currentDateIndex][currentTimeType === 'start' ? 'startTime' : 'endTime']
              ? proposedDates[currentDateIndex][currentTimeType === 'start' ? 'startTime' : 'endTime']
              : new Date()
          }
          mode={showDatePicker ? 'date' : 'time'}
          display="default"
          onChange={handleDateTimeChange}
          minimumDate={new Date()}
        />
      )}
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
  },
  backButton: {
    padding: 8,
    marginRight: 12,
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
  lawFirmName: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    fontWeight: '600',
  },
  eventType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#555',
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 12,
    color: '#999',
  },
  actionRequiredBanner: {
    backgroundColor: '#FFE4B5',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FFA500',
  },
  actionRequiredText: {
    color: '#8B4513',
    fontWeight: '600',
    textAlign: 'center',
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
    marginBottom: 12,
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
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  dateCard: {
    backgroundColor: '#F5E6D3',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#8B4513',
  },
  dateCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B4513',
    marginBottom: 8,
  },
  dateButton: {
    backgroundColor: '#FFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  dateButtonLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
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
  },
  offeredDateCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#1E90FF',
  },
  offeredDateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A5F',
    marginBottom: 6,
  },
  offeredDateTime: {
    fontSize: 17,
    color: '#1E3A5F',
    fontWeight: '700',
    marginBottom: 4,
  },
  offeredDateDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  selectDateButton: {
    backgroundColor: '#1E90FF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 4,
  },
  selectDateButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  selectedBadge: {
    backgroundColor: '#32CD32',
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
    marginTop: 12,
  },
  confirmedMessage: {
    fontSize: 14,
    color: '#32CD32',
    textAlign: 'center',
    padding: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 12,
  },
  closeButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#8B4513',
    alignItems: 'center',
  },
  closeButtonText: {
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
});
