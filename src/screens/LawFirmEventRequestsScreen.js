import React, { useState, useEffect, useCallback } from 'react';
import {
 View,
 Text,
 StyleSheet,
 TouchableOpacity,
 ScrollView,
 TextInput,
 ActivityIndicator,
 Modal,
 Platform,
 useWindowDimensions
} from 'react-native';
import alert from '../utils/alert';
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

const EVENT_TYPES = [
  { value: 'deposition', label: 'Deposition', icon: '📝' },
  { value: 'mediation', label: 'Mediation', icon: '🤝' },
  { value: 'consultation', label: 'Consultation', icon: '💬' },
  { value: 'court_date', label: 'Court Date', icon: '⚖️' },
];

const DURATION_OPTIONS = [
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 hours' },
  { value: '120', label: '2 hours' },
  { value: '180', label: '3 hours' },
];

export default function LawFirmEventRequestsScreen({ user, onBack }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const isTablet = width >= 768 && width < 1024;

  const [loading, setLoading] = useState(true);
  const [eventRequests, setEventRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const [selectedClient, setSelectedClient] = useState(null);
  const [eventType, setEventType] = useState('deposition');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [notes, setNotes] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

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
      
      const [requestsResponse, clientsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/event-requests`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${API_BASE_URL}/api/lawfirm/clients`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const requestsData = await requestsResponse.json();
      const clientsData = await clientsResponse.json();
      
      setEventRequests(requestsData.eventRequests || []);
      const sortedClients = (clientsData.clients || []).sort((a, b) => {
        const nameA = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        const nameB = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
        return nameA.localeCompare(nameB);
      });
      setClients(sortedClients);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Error', 'Failed to load event requests');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async () => {
    if (!selectedClient) {
      alert('Missing Information', 'Please select a client');
      return;
    }
    if (!title.trim()) {
      alert('Missing Information', 'Please enter an event title');
      return;
    }

    const validOptions = dateTimeOptions.filter(opt => opt.date && opt.startTime);
    if (validOptions.length !== 4) {
      alert('Missing Information', 'Please provide all 4 date/time options for the client to choose from');
      return;
    }

    setSubmitting(true);
    try {
      const token = user?.token || await AsyncStorage.getItem('authToken');
      
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
        alert('Request Sent', 'Event request has been sent to the client with 4 date options to choose from.');
        setShowCreateModal(false);
        resetForm();
        fetchData();
      } else {
        const error = await response.json();
        alert('Error', error.error || 'Failed to create event request');
      }
    } catch (error) {
      console.error('Error creating event request:', error);
      alert('Error', 'Failed to create event request');
    } finally {
      setSubmitting(false);
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
      alert('Error', 'Failed to load request details');
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
        alert('Confirmed', 'Event confirmed and added to calendar');
        setShowDetailModal(false);
        fetchData();
      } else {
        const error = await response.json();
        alert('Error', error.error || 'Failed to confirm event');
      }
    } catch (error) {
      console.error('Error confirming date:', error);
      alert('Error', 'Failed to confirm event');
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
    setShowClientDropdown(false);
    setDateTimeOptions([
      { date: getDefaultDateTime(7, 10), startTime: getDefaultDateTime(7, 10) },
      { date: getDefaultDateTime(8, 14), startTime: getDefaultDateTime(8, 14) },
      { date: getDefaultDateTime(9, 10), startTime: getDefaultDateTime(9, 10) },
      { date: getDefaultDateTime(10, 14), startTime: getDefaultDateTime(10, 14) }
    ]);
    setShowDatePicker({ visible: false, index: -1, type: 'date' });
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': return { color: '#E67E22', bg: '#FFF3E0', label: 'Awaiting Response', icon: '⏳' };
      case 'dates_offered': return { color: '#2196F3', bg: '#E3F2FD', label: 'Awaiting Selection', icon: '📅' };
      case 'dates_submitted': return { color: '#7C3AED', bg: '#EDE9FE', label: 'Dates Received', icon: '📬' };
      case 'confirmed': return { color: '#16A34A', bg: '#DCFCE7', label: 'Confirmed', icon: '✅' };
      case 'cancelled': return { color: '#DC2626', bg: '#FEE2E2', label: 'Cancelled', icon: '❌' };
      default: return { color: '#6B7280', bg: '#F3F4F6', label: status, icon: '📋' };
    }
  };

  const getEventTypeIcon = (type) => {
    const found = EVENT_TYPES.find(e => e.value === type);
    return found ? found.icon : '📋';
  };

  const filteredClients = clients.filter(client => {
    if (!clientSearchQuery.trim()) return true;
    const query = clientSearchQuery.toLowerCase();
    const fullName = `${client.first_name || ''} ${client.last_name || ''}`.trim().toLowerCase();
    const email = (client.email || '').toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  const filteredRequests = eventRequests.filter(r => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return ['pending', 'dates_offered', 'dates_submitted'].includes(r.status);
    return r.status === activeFilter;
  });

  const statusCounts = {
    all: eventRequests.length,
    active: eventRequests.filter(r => ['pending', 'dates_offered', 'dates_submitted'].includes(r.status)).length,
    confirmed: eventRequests.filter(r => r.status === 'confirmed').length,
    cancelled: eventRequests.filter(r => r.status === 'cancelled').length,
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Requests</Text>
          <View style={{ width: 100 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E3A5F" />
          <Text style={styles.loadingText}>Loading event requests...</Text>
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

      <View style={styles.statsRow}>
        {[
          { key: 'all', label: 'All' },
          { key: 'active', label: 'Active' },
          { key: 'confirmed', label: 'Confirmed' },
          { key: 'cancelled', label: 'Cancelled' },
        ].map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[styles.filterTab, activeFilter === filter.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(filter.key)}
          >
            <Text style={[styles.filterTabText, activeFilter === filter.key && styles.filterTabTextActive]}>
              {filter.label}
            </Text>
            <View style={[styles.filterBadge, activeFilter === filter.key && styles.filterBadgeActive]}>
              <Text style={[styles.filterBadgeText, activeFilter === filter.key && styles.filterBadgeTextActive]}>
                {statusCounts[filter.key]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {filteredRequests.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No Event Requests Yet' : `No ${activeFilter} Requests`}
            </Text>
            <Text style={styles.emptySubtext}>
              {activeFilter === 'all'
                ? 'Create a request to schedule depositions, mediations, or consultations with your clients.'
                : 'No event requests match this filter.'}
            </Text>
            {activeFilter === 'all' && (
              <TouchableOpacity
                style={styles.emptyCreateButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyCreateButtonText}>+ Create First Request</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={isDesktop ? styles.cardsGrid : null}>
            {filteredRequests.map((request) => {
              const statusConfig = getStatusConfig(request.status);
              return (
                <TouchableOpacity
                  key={request.id}
                  style={[styles.requestCard, isDesktop && styles.requestCardDesktop]}
                  onPress={() => handleViewDetails(request)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardEventTypeTag}>
                      <Text style={styles.cardEventTypeText}>
                        {getEventTypeIcon(request.eventType)} {(request.eventType || '').replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: statusConfig.bg }]}>
                      <Text style={[styles.statusPillText, { color: statusConfig.color }]}>
                        {statusConfig.icon} {statusConfig.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{request.title}</Text>

                  <View style={styles.cardInfoRow}>
                    <Text style={styles.cardInfoIcon}>👤</Text>
                    <Text style={styles.cardInfoText}>{request.clientName}</Text>
                  </View>

                  {request.location && (
                    <View style={styles.cardInfoRow}>
                      <Text style={styles.cardInfoIcon}>📍</Text>
                      <Text style={styles.cardInfoText}>{request.location}</Text>
                    </View>
                  )}

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardDate}>
                      Created {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                    <Text style={styles.cardArrow}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Event Request Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => { setShowCreateModal(false); resetForm(); }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Event Request</Text>
              <TouchableOpacity onPress={() => { setShowCreateModal(false); resetForm(); }} style={styles.modalCloseBtn}>
                <Text style={styles.modalCloseBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formScroll}
              contentContainerStyle={styles.formScrollContent}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Client Selection */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Client</Text>
                <TouchableOpacity
                  style={styles.clientSelector}
                  onPress={() => setShowClientDropdown(!showClientDropdown)}
                >
                  {selectedClient ? (
                    <View style={styles.selectedClientDisplay}>
                      <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>
                          {(selectedClient.first_name || '?')[0]}{(selectedClient.last_name || '?')[0]}
                        </Text>
                      </View>
                      <View style={styles.selectedClientInfo}>
                        <Text style={styles.selectedClientName}>
                          {selectedClient.first_name} {selectedClient.last_name}
                        </Text>
                        {selectedClient.email && (
                          <Text style={styles.selectedClientEmail}>{selectedClient.email}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation && e.stopPropagation();
                          setSelectedClient(null);
                          setClientSearchQuery('');
                        }}
                        style={styles.clearClientBtn}
                      >
                        <Text style={styles.clearClientBtnText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.clientSelectorPlaceholder}>
                      <Text style={styles.clientSelectorPlaceholderIcon}>👤</Text>
                      <Text style={styles.clientSelectorPlaceholderText}>Select a client...</Text>
                      <Text style={styles.dropdownArrow}>{showClientDropdown ? '▲' : '▼'}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {showClientDropdown && (
                  <View style={styles.clientDropdown}>
                    <View style={styles.dropdownSearchRow}>
                      <TextInput
                        style={styles.dropdownSearchInput}
                        value={clientSearchQuery}
                        onChangeText={setClientSearchQuery}
                        placeholder="Search by name..."
                        placeholderTextColor="#9CA3AF"
                        autoFocus={true}
                      />
                      {clientSearchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setClientSearchQuery('')} style={styles.dropdownClearBtn}>
                          <Text style={styles.dropdownClearBtnText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                      {filteredClients.length === 0 ? (
                        <View style={styles.dropdownEmpty}>
                          <Text style={styles.dropdownEmptyText}>No clients found</Text>
                        </View>
                      ) : (
                        filteredClients.map(client => (
                          <TouchableOpacity
                            key={client.id}
                            style={[styles.dropdownItem, selectedClient?.id === client.id && styles.dropdownItemSelected]}
                            onPress={() => {
                              setSelectedClient(client);
                              setShowClientDropdown(false);
                              setClientSearchQuery('');
                            }}
                          >
                            <View style={[styles.dropdownAvatar, selectedClient?.id === client.id && styles.dropdownAvatarSelected]}>
                              <Text style={[styles.dropdownAvatarText, selectedClient?.id === client.id && styles.dropdownAvatarTextSelected]}>
                                {(client.first_name || '?')[0]}{(client.last_name || '?')[0]}
                              </Text>
                            </View>
                            <View style={styles.dropdownItemInfo}>
                              <Text style={[styles.dropdownItemName, selectedClient?.id === client.id && styles.dropdownItemNameSelected]}>
                                {client.first_name} {client.last_name}
                              </Text>
                              {client.email && (
                                <Text style={styles.dropdownItemEmail}>{client.email}</Text>
                              )}
                            </View>
                            {selectedClient?.id === client.id && (
                              <Text style={styles.dropdownCheckmark}>✓</Text>
                            )}
                          </TouchableOpacity>
                        ))
                      )}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Event Type */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Event Type</Text>
                <View style={styles.eventTypeGrid}>
                  {EVENT_TYPES.map((type) => (
                    <TouchableOpacity
                      key={type.value}
                      style={[styles.eventTypeCard, eventType === type.value && styles.eventTypeCardSelected]}
                      onPress={() => setEventType(type.value)}
                    >
                      <Text style={styles.eventTypeIcon}>{type.icon}</Text>
                      <Text style={[styles.eventTypeLabel, eventType === type.value && styles.eventTypeLabelSelected]}>
                        {type.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Event Details */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Event Details</Text>
                
                <Text style={styles.fieldLabel}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g., Medical Deposition - Dr. Smith"
                  placeholderTextColor="#9CA3AF"
                />

                <Text style={styles.fieldLabel}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Additional details about the event..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />

                <View style={isDesktop ? styles.twoColRow : null}>
                  <View style={isDesktop ? styles.halfCol : null}>
                    <Text style={styles.fieldLabel}>Location</Text>
                    <TextInput
                      style={styles.input}
                      value={location}
                      onChangeText={setLocation}
                      placeholder="Office, virtual, courthouse..."
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={isDesktop ? styles.halfCol : null}>
                    <Text style={styles.fieldLabel}>Duration</Text>
                    <View style={styles.durationRow}>
                      {DURATION_OPTIONS.map(opt => (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.durationChip, durationMinutes === opt.value && styles.durationChipSelected]}
                          onPress={() => setDurationMinutes(opt.value)}
                        >
                          <Text style={[styles.durationChipText, durationMinutes === opt.value && styles.durationChipTextSelected]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>

                <Text style={styles.fieldLabel}>Internal Notes</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Notes visible only to your firm..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={2}
                />
              </View>

              {/* Date/Time Options */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Proposed Date & Time Options</Text>
                <Text style={styles.formSectionSubtext}>
                  Provide 4 options for the client to choose from
                </Text>

                <View style={isDesktop ? styles.dateOptionsGrid : null}>
                  {dateTimeOptions.map((option, index) => (
                    <View key={index} style={[styles.dateOptionCard, isDesktop && styles.dateOptionCardDesktop]}>
                      <View style={styles.dateOptionHeader}>
                        <View style={styles.dateOptionBadge}>
                          <Text style={styles.dateOptionBadgeText}>Option {index + 1}</Text>
                        </View>
                      </View>
                      <View style={styles.dateTimePickerRow}>
                        <TouchableOpacity
                          style={styles.dateTimePickerBtn}
                          onPress={() => setShowDatePicker({ visible: true, index, type: 'date' })}
                        >
                          <Text style={styles.dateTimePickerIcon}>📅</Text>
                          <View>
                            <Text style={styles.dateTimePickerLabel}>Date</Text>
                            <Text style={styles.dateTimePickerValue}>{formatDate(option.date)}</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.dateTimePickerBtn}
                          onPress={() => setShowDatePicker({ visible: true, index, type: 'time' })}
                        >
                          <Text style={styles.dateTimePickerIcon}>🕐</Text>
                          <View>
                            <Text style={styles.dateTimePickerLabel}>Time</Text>
                            <Text style={styles.dateTimePickerValue}>{formatTime(option.startTime)}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>

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
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => { setShowCreateModal(false); resetForm(); }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleCreateRequest}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Send Request</Text>
                )}
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
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            {selectedRequest && (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>{selectedRequest.eventRequest.title}</Text>
                  <TouchableOpacity onPress={() => setShowDetailModal(false)} style={styles.modalCloseBtn}>
                    <Text style={styles.modalCloseBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailScrollContent}>
                  <View style={styles.detailTopSection}>
                    {(() => {
                      const sc = getStatusConfig(selectedRequest.eventRequest.status);
                      return (
                        <View style={[styles.detailStatusBanner, { backgroundColor: sc.bg }]}>
                          <Text style={[styles.detailStatusText, { color: sc.color }]}>
                            {sc.icon} {sc.label}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>

                  <View style={styles.detailInfoGrid}>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>Client</Text>
                      <Text style={styles.detailInfoValue}>{selectedRequest.eventRequest.clientName}</Text>
                    </View>
                    <View style={styles.detailInfoItem}>
                      <Text style={styles.detailInfoLabel}>Event Type</Text>
                      <Text style={styles.detailInfoValue}>
                        {getEventTypeIcon(selectedRequest.eventRequest.eventType)} {(selectedRequest.eventRequest.eventType || '').replace('_', ' ')}
                      </Text>
                    </View>
                    {selectedRequest.eventRequest.location && (
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>Location</Text>
                        <Text style={styles.detailInfoValue}>{selectedRequest.eventRequest.location}</Text>
                      </View>
                    )}
                    {selectedRequest.eventRequest.durationMinutes && (
                      <View style={styles.detailInfoItem}>
                        <Text style={styles.detailInfoLabel}>Duration</Text>
                        <Text style={styles.detailInfoValue}>{selectedRequest.eventRequest.durationMinutes} minutes</Text>
                      </View>
                    )}
                  </View>

                  {selectedRequest.eventRequest.description && (
                    <View style={styles.detailDescriptionSection}>
                      <Text style={styles.detailInfoLabel}>Description</Text>
                      <Text style={styles.detailDescriptionText}>{selectedRequest.eventRequest.description}</Text>
                    </View>
                  )}

                  {selectedRequest.proposedDates && selectedRequest.proposedDates.length > 0 && (
                    <View style={styles.proposedDatesSection}>
                      <Text style={styles.proposedDatesTitle}>
                        {selectedRequest.eventRequest.status === 'dates_submitted'
                          ? "Client's Selected Dates"
                          : 'Proposed Dates'}
                      </Text>
                      {selectedRequest.proposedDates.map((date, index) => (
                        <View key={date.id} style={[
                          styles.proposedDateCard,
                          date.isSelected && styles.proposedDateCardSelected
                        ]}>
                          <View style={styles.proposedDateRow}>
                            <View style={styles.proposedDateBadge}>
                              <Text style={styles.proposedDateBadgeText}>Option {index + 1}</Text>
                            </View>
                            {date.isSelected && (
                              <View style={styles.selectedTag}>
                                <Text style={styles.selectedTagText}>Client's Choice</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.proposedDateDetails}>
                            <Text style={styles.proposedDateDay}>
                              📅 {new Date(date.proposedStartTime).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                            </Text>
                            <Text style={styles.proposedDateTimeRange}>
                              🕐 {new Date(date.proposedStartTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} — {new Date(date.proposedEndTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </Text>
                          </View>
                          {selectedRequest.eventRequest.status === 'dates_submitted' && !date.isSelected && (
                            <TouchableOpacity
                              style={styles.confirmDateBtn}
                              onPress={() => handleConfirmDate(date.id)}
                            >
                              <Text style={styles.confirmDateBtnText}>Confirm This Date</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {selectedRequest.eventRequest.status === 'pending' && (
                    <View style={styles.pendingNotice}>
                      <Text style={styles.pendingNoticeIcon}>⏳</Text>
                      <Text style={styles.pendingNoticeText}>
                        Waiting for the client to review and respond with their preferred dates.
                      </Text>
                    </View>
                  )}

                  {selectedRequest.eventRequest.status === 'confirmed' && (
                    <View style={styles.confirmedNotice}>
                      <Text style={styles.confirmedNoticeIcon}>✅</Text>
                      <Text style={styles.confirmedNoticeText}>
                        This event has been confirmed and added to the calendar.
                      </Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={styles.closeDetailBtn}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <Text style={styles.closeDetailBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
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
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1E3A5F',
    borderBottomWidth: 1,
    borderBottomColor: '#16304D',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  createButton: {
    backgroundColor: '#D4A843',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  createButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginHorizontal: 3,
    gap: 6,
  },
  filterTabActive: {
    backgroundColor: '#1E3A5F',
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },

  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 340,
  },
  emptyCreateButton: {
    marginTop: 24,
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  emptyCreateButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'box-shadow 0.2s ease',
      },
      default: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      }
    }),
  },
  requestCardDesktop: {
    width: '48%',
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEventTypeTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  cardEventTypeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
    letterSpacing: 0.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardInfoIcon: {
    fontSize: 14,
  },
  cardInfoText: {
    fontSize: 14,
    color: '#4B5563',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  cardArrow: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E3A5F',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  modalContentDesktop: {
    maxWidth: 680,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  modalCloseBtnText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFBFC',
  },

  formScroll: {
    flex: 1,
  },
  formScrollContent: {
    padding: 24,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  formSectionSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: -8,
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#111827',
    backgroundColor: '#fff',
    marginBottom: 12,
  },
  textArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCol: {
    flex: 1,
  },

  clientSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  selectedClientDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  clientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E3A5F',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clientAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  selectedClientInfo: {
    flex: 1,
  },
  selectedClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  selectedClientEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  clearClientBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearClientBtnText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  clientSelectorPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  clientSelectorPlaceholderIcon: {
    fontSize: 18,
  },
  clientSelectorPlaceholderText: {
    flex: 1,
    fontSize: 15,
    color: '#9CA3AF',
  },
  dropdownArrow: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  clientDropdown: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#fff',
    overflow: 'hidden',
    maxHeight: 260,
  },
  dropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  dropdownSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  dropdownClearBtn: {
    padding: 6,
  },
  dropdownClearBtnText: {
    color: '#9CA3AF',
    fontWeight: '600',
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  dropdownEmptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemSelected: {
    backgroundColor: '#EBF5FF',
  },
  dropdownAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownAvatarSelected: {
    backgroundColor: '#1E3A5F',
  },
  dropdownAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  dropdownAvatarTextSelected: {
    color: '#fff',
  },
  dropdownItemInfo: {
    flex: 1,
  },
  dropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  dropdownItemNameSelected: {
    color: '#1E3A5F',
  },
  dropdownItemEmail: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  dropdownCheckmark: {
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '700',
  },

  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  eventTypeCard: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  eventTypeCardSelected: {
    borderColor: '#1E3A5F',
    backgroundColor: '#EBF5FF',
  },
  eventTypeIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  eventTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
  eventTypeLabelSelected: {
    color: '#1E3A5F',
    fontWeight: '700',
  },

  durationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#fff',
  },
  durationChipSelected: {
    backgroundColor: '#1E3A5F',
    borderColor: '#1E3A5F',
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  durationChipTextSelected: {
    color: '#fff',
  },

  dateOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  dateOptionCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateOptionCardDesktop: {
    width: '48%',
  },
  dateOptionHeader: {
    marginBottom: 10,
  },
  dateOptionBadge: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  dateOptionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  dateTimePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateTimePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dateTimePickerIcon: {
    fontSize: 18,
  },
  dateTimePickerLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateTimePickerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E3A5F',
    marginTop: 2,
  },

  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B5563',
  },
  submitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#1E3A5F',
    minWidth: 140,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  detailScroll: {
    flex: 1,
  },
  detailScrollContent: {
    padding: 24,
  },
  detailTopSection: {
    marginBottom: 20,
  },
  detailStatusBanner: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  detailStatusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  detailInfoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 20,
  },
  detailInfoItem: {
    minWidth: '40%',
    flex: 1,
  },
  detailInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailInfoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    textTransform: 'capitalize',
  },
  detailDescriptionSection: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  detailDescriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginTop: 4,
  },

  proposedDatesSection: {
    marginTop: 8,
  },
  proposedDatesTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 14,
  },
  proposedDateCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  proposedDateCardSelected: {
    backgroundColor: '#FFFBEB',
    borderColor: '#D4A843',
  },
  proposedDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proposedDateBadge: {
    backgroundColor: '#1E3A5F',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  proposedDateBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  selectedTag: {
    backgroundColor: '#D4A843',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  proposedDateDetails: {
    gap: 4,
  },
  proposedDateDay: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  proposedDateTimeRange: {
    fontSize: 14,
    color: '#4B5563',
  },
  confirmDateBtn: {
    backgroundColor: '#16A34A',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  confirmDateBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  pendingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  pendingNoticeIcon: {
    fontSize: 24,
  },
  pendingNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  confirmedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
    gap: 12,
  },
  confirmedNoticeIcon: {
    fontSize: 24,
  },
  confirmedNoticeText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  closeDetailBtn: {
    backgroundColor: '#1E3A5F',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeDetailBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
