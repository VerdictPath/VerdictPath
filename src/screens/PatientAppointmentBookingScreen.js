import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';
import CalendarService from '../services/CalendarService';

const APPOINTMENT_TYPES = [
  { value: 'Initial Consultation', icon: 'account-search' },
  { value: 'Follow-up', icon: 'calendar-check' },
  { value: 'Treatment', icon: 'medical-bag' },
  { value: 'Evaluation', icon: 'clipboard-text' },
  { value: 'Therapy Session', icon: 'heart-pulse' },
  { value: 'Imaging/X-Ray', icon: 'radioactive' },
  { value: 'Other', icon: 'dots-horizontal' }
];

const EVENT_TYPES = [
  { value: 'court_date', label: 'Court Date', icon: 'gavel' },
  { value: 'appointment', label: 'Appointment', icon: 'calendar' },
  { value: 'deposition', label: 'Deposition', icon: 'file-document' },
  { value: 'deadline', label: 'Deadline', icon: 'clock-alert' },
  { value: 'reminder', label: 'Reminder', icon: 'bell' }
];

const EVENT_TYPE_COLORS = {
  court_date: '#e74c3c',
  appointment: '#3498db',
  deposition: '#9b59b6',
  deadline: '#f39c12',
  reminder: '#1abc9c'
};

const PatientAppointmentBookingScreen = ({ user, onNavigate, onBack }) => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointmentType, setAppointmentType] = useState('');
  const [notes, setNotes] = useState('');
  const [markedDates, setMarkedDates] = useState({});
  const [booking, setBooking] = useState(false);
  const [activeTab, setActiveTab] = useState('book');

  const [personalEvents, setPersonalEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventFilter, setEventFilter] = useState('all');
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventType: 'reminder',
    startTime: '',
    endTime: '',
    allDay: false,
    reminderEnabled: true,
    reminderMinutesBefore: 60
  });

  const patientId = user?.id;

  useEffect(() => {
    loadConnectedProviders();
    loadMyAppointments();
    loadPersonalEvents();
  }, []);

  useEffect(() => {
    if (activeTab === 'events') {
      loadPersonalEvents();
    }
  }, [eventFilter, activeTab]);

  useEffect(() => {
    if (selectedProvider && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedProvider, selectedDate]);

  useEffect(() => {
    updateMarkedDates();
  }, [myAppointments, personalEvents, activeTab]);

  const loadConnectedProviders = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/patients/${patientId}/connected-providers`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setProviders(data.providers || []);
      }
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMyAppointments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/patients/${patientId}/appointments`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        const appointments = data.appointments || [];
        setMyAppointments(appointments);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
  };

  const loadPersonalEvents = async () => {
    try {
      setLoadingEvents(true);
      const options = {};
      if (eventFilter !== 'all') {
        options.eventType = eventFilter;
      }
      const fetchedEvents = await CalendarService.fetchEvents(user.token, options);
      setPersonalEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading personal events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const updateMarkedDates = () => {
    const marked = {};

    myAppointments.forEach(appt => {
      const date = appt.appointment_date;
      const dotColor = appt.status === 'confirmed' ? '#10b981' : '#f59e0b';
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      marked[date].dots.push({ key: `appt-${appt.id}`, color: dotColor });
    });

    personalEvents.forEach(event => {
      const eventDate = moment(event.start_time).format('YYYY-MM-DD');
      const color = EVENT_TYPE_COLORS[event.event_type] || '#FFD700';
      if (!marked[eventDate]) {
        marked[eventDate] = { dots: [] };
      }
      marked[eventDate].dots.push({ key: `event-${event.id}`, color });
    });

    Object.keys(marked).forEach(date => {
      marked[date].marked = true;
    });

    setMarkedDates(marked);
  };

  const loadAvailableSlots = async () => {
    if (!selectedProvider) return;
    
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${selectedProvider.id}/available-slots?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load available slots');
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleSlotSelect = (slot) => {
    setBookingSlot(slot);
    setShowBookingModal(true);
  };

  const handleBookAppointment = async () => {
    if (!appointmentType.trim()) {
      Alert.alert('Required', 'Please select an appointment type');
      return;
    }

    setBooking(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/appointments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            providerId: selectedProvider.id,
            appointmentDate: selectedDate,
            startTime: bookingSlot.startTime,
            endTime: bookingSlot.endTime,
            appointmentType,
            patientNotes: notes
          })
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success!',
          'Your appointment has been requested. You\'ll receive a confirmation once the provider confirms.',
          [
            {
              text: 'Great!',
              onPress: () => {
                setShowBookingModal(false);
                setBookingSlot(null);
                setAppointmentType('');
                setNotes('');
                loadMyAppointments();
                loadAvailableSlots();
              }
            }
          ]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCancelAppointment = (appointmentId) => {
    Alert.alert(
      'Cancel Appointment',
      'Are you sure you want to cancel this appointment?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/medical-calendar/appointments/${appointmentId}/cancel`,
                {
                  method: 'PATCH',
                  headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ reason: 'Cancelled by patient' })
                }
              );
              if (response.ok) {
                Alert.alert('Success', 'Appointment cancelled');
                loadMyAppointments();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
  };

  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const parsed = moment(dateTimeStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:MM', moment.ISO_8601], true);
    if (parsed.isValid()) {
      return parsed.toISOString();
    }
    return null;
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime) {
      Alert.alert('Required', 'Please provide a title and start date/time');
      return;
    }

    const parsedStartTime = parseDateTime(newEvent.startTime);
    if (!parsedStartTime) {
      Alert.alert('Invalid Date', 'Please enter a valid date in format YYYY-MM-DD HH:MM (e.g., 2025-12-15 14:00)');
      return;
    }

    const parsedEndTime = newEvent.endTime ? parseDateTime(newEvent.endTime) : null;
    if (newEvent.endTime && !parsedEndTime) {
      Alert.alert('Invalid End Date', 'Please enter a valid end date in format YYYY-MM-DD HH:MM');
      return;
    }

    try {
      const eventData = {
        title: newEvent.title,
        description: newEvent.description,
        location: newEvent.location,
        event_type: newEvent.eventType,
        start_time: parsedStartTime,
        end_time: parsedEndTime,
        all_day: newEvent.allDay,
        reminder_enabled: newEvent.reminderEnabled,
        reminder_minutes_before: newEvent.reminderMinutesBefore
      };

      await CalendarService.createEventInBackend(eventData, user.token);
      
      setShowAddEventModal(false);
      resetNewEvent();
      loadPersonalEvents();
      
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', error.message || 'Failed to create event. Please try again.');
    }
  };

  const handleSyncToDevice = async (event) => {
    try {
      const hasPermission = await CalendarService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Calendar permission is required to sync events to your device calendar'
        );
        return;
      }

      await CalendarService.syncEventToDevice(event, user.token);
      
      setPersonalEvents(prev => 
        prev.map(e => 
          e.id === event.id 
            ? { ...e, synced_to_device: true }
            : e
        )
      );
      
      Alert.alert('Success', 'Event synced to your device calendar!');
      loadPersonalEvents();
    } catch (error) {
      console.error('Error syncing event:', error);
      Alert.alert('Error', 'Failed to sync event to device calendar');
    }
  };

  const handleUnsyncFromDevice = async (event) => {
    try {
      await CalendarService.unsyncEventFromDevice(event, user.token);
      
      setPersonalEvents(prev => 
        prev.map(e => 
          e.id === event.id 
            ? { ...e, synced_to_device: false, device_event_id: null }
            : e
        )
      );
      
      Alert.alert('Success', 'Event removed from device calendar');
      loadPersonalEvents();
    } catch (error) {
      console.error('Error unsyncing event:', error);
      Alert.alert('Error', 'Failed to remove event from device calendar');
    }
  };

  const handleDeleteEvent = (event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (event.synced_to_device) {
                await CalendarService.unsyncEventFromDevice(event, user.token);
              }
              
              await CalendarService.deleteEventFromBackend(event.id, user.token);
              setPersonalEvents(prev => prev.filter(e => e.id !== event.id));
              Alert.alert('Success', 'Event deleted');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      location: '',
      eventType: 'reminder',
      startTime: '',
      endTime: '',
      allDay: false,
      reminderEnabled: true,
      reminderMinutesBefore: 60
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'completed': return '#6366f1';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'cancelled': return 'close-circle';
      case 'completed': return 'check-all';
      default: return 'help-circle';
    }
  };

  const getEventTypeIcon = (type) => {
    const eventType = EVENT_TYPES.find(t => t.value === type);
    return eventType ? eventType.icon : 'calendar';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Icon name="arrow-left" size={24} color="#FFD700" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Icon name="calendar-month" size={28} color="#FFD700" />
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>
      {activeTab === 'events' ? (
        <TouchableOpacity 
          style={styles.addEventButton} 
          onPress={() => setShowAddEventModal(true)}
        >
          <Icon name="plus" size={24} color="#FFD700" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40 }} />
      )}
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'book' && styles.activeTab]}
        onPress={() => setActiveTab('book')}
      >
        <Icon name="calendar-plus" size={18} color={activeTab === 'book' ? '#FFD700' : '#a0aec0'} />
        <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>Book</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
        onPress={() => setActiveTab('appointments')}
      >
        <Icon name="calendar-star" size={18} color={activeTab === 'appointments' ? '#FFD700' : '#a0aec0'} />
        <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>Appointments</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'events' && styles.activeTab]}
        onPress={() => setActiveTab('events')}
      >
        <Icon name="bell-outline" size={18} color={activeTab === 'events' ? '#FFD700' : '#a0aec0'} />
        <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Personal</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProviderSelection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Icon name="doctor" size={24} color="#FFD700" />
        <Text style={styles.sectionTitle}>Select Provider</Text>
      </View>
      
      {providers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-off" size={48} color="#666" />
          <Text style={styles.emptyText}>No connected providers</Text>
          <Text style={styles.emptySubtext}>Connect with a medical provider first</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {providers.map((provider) => (
            <TouchableOpacity
              key={provider.id}
              style={[
                styles.providerCard,
                selectedProvider?.id === provider.id && styles.providerCardSelected
              ]}
              onPress={() => {
                setSelectedProvider(provider);
                setAvailableSlots([]);
              }}
            >
              <View style={styles.providerIconContainer}>
                <Icon name="doctor" size={32} color="#FFD700" />
              </View>
              <Text style={styles.providerName} numberOfLines={1}>
                {provider.provider_name}
              </Text>
              <Text style={styles.providerSpecialty} numberOfLines={1}>
                {provider.specialty || 'Medical Provider'}
              </Text>
              {selectedProvider?.id === provider.id && (
                <Icon name="check-circle" size={20} color="#10b981" style={styles.providerCheck} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderCalendar = () => {
    if (!selectedProvider) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-month" size={24} color="#FFD700" />
          <Text style={styles.sectionTitle}>Select a Date</Text>
        </View>
        
        <View style={styles.calendarContainer}>
          <Calendar
            current={selectedDate}
            minDate={moment().format('YYYY-MM-DD')}
            maxDate={moment().add(3, 'months').format('YYYY-MM-DD')}
            onDayPress={(day) => setSelectedDate(day.dateString)}
            markingType="multi-dot"
            markedDates={{
              ...markedDates,
              [selectedDate]: {
                ...(markedDates[selectedDate] || {}),
                selected: true,
                selectedColor: '#1a5490',
                dots: markedDates[selectedDate]?.dots || []
              }
            }}
            theme={{
              backgroundColor: 'transparent',
              calendarBackground: 'transparent',
              textSectionTitleColor: '#FFD700',
              selectedDayBackgroundColor: '#1a5490',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#FFD700',
              dayTextColor: '#ffffff',
              textDisabledColor: '#666',
              monthTextColor: '#FFD700',
              arrowColor: '#FFD700',
            }}
          />
        </View>
      </View>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedProvider || !selectedDate) return null;

    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="clock-outline" size={24} color="#FFD700" />
          <Text style={styles.sectionTitle}>
            Available Times - {moment(selectedDate).format('MMMM Do')}
          </Text>
        </View>

        {loadingSlots ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Finding available slots...</Text>
          </View>
        ) : availableSlots.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="skull-crossbones" size={48} color="#666" />
            <Text style={styles.emptyText}>No available slots for this date</Text>
            <Text style={styles.emptySubtext}>Try selecting a different date, matey!</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {availableSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.slotButton}
                onPress={() => handleSlotSelect(slot)}
              >
                <Icon name="clock-time-four-outline" size={20} color="#FFD700" />
                <Text style={styles.slotTime}>
                  {moment(slot.startTime, 'HH:mm').format('h:mm A')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderMyAppointments = () => {
    const upcomingAppointments = myAppointments
      .filter(a => moment(a.appointment_date).isSameOrAfter(moment(), 'day') && a.status !== 'cancelled')
      .sort((a, b) => moment(a.appointment_date).diff(moment(b.appointment_date)));

    const pastAppointments = myAppointments
      .filter(a => moment(a.appointment_date).isBefore(moment(), 'day') || a.status === 'cancelled')
      .sort((a, b) => moment(b.appointment_date).diff(moment(a.appointment_date)));

    return (
      <View style={styles.appointmentsContainer}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-star" size={24} color="#FFD700" />
          <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        </View>

        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank" size={48} color="#666" />
            <Text style={styles.emptyText}>No upcoming appointments</Text>
            <Text style={styles.emptySubtext}>Book an appointment to get started!</Text>
          </View>
        ) : (
          <View style={styles.appointmentsList}>
            {upcomingAppointments.slice(0, 10).map((appointment) => (
              <View key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <View style={styles.appointmentDateBadge}>
                    <Text style={styles.appointmentMonth}>
                      {moment(appointment.appointment_date).format('MMM')}
                    </Text>
                    <Text style={styles.appointmentDay}>
                      {moment(appointment.appointment_date).format('DD')}
                    </Text>
                  </View>

                  <View style={styles.appointmentDetails}>
                    <Text style={styles.appointmentProviderName}>
                      {appointment.provider_name}
                    </Text>
                    <Text style={styles.appointmentTime}>
                      {moment(appointment.start_time, 'HH:mm:ss').format('h:mm A')}
                    </Text>
                    <Text style={styles.appointmentTypeText}>
                      {appointment.appointment_type || 'Medical Appointment'}
                    </Text>
                  </View>

                  <View style={styles.appointmentStatus}>
                    <Icon
                      name={getStatusIcon(appointment.status)}
                      size={24}
                      color={getStatusColor(appointment.status)}
                    />
                    <Text style={[styles.appointmentStatusText, { color: getStatusColor(appointment.status) }]}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </Text>
                  </View>
                </View>

                {['pending', 'confirmed'].includes(appointment.status) && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelAppointment(appointment.id)}
                  >
                    <Icon name="close-circle-outline" size={16} color="#ef4444" />
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {pastAppointments.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Icon name="history" size={24} color="#FFD700" />
              <Text style={styles.sectionTitle}>Past Appointments</Text>
            </View>
            <View style={styles.appointmentsList}>
              {pastAppointments.slice(0, 5).map((appointment) => (
                <View key={appointment.id} style={[styles.appointmentCard, styles.pastAppointmentCard]}>
                  <View style={styles.appointmentHeader}>
                    <View style={styles.appointmentDateBadge}>
                      <Text style={styles.appointmentMonth}>
                        {moment(appointment.appointment_date).format('MMM')}
                      </Text>
                      <Text style={styles.appointmentDay}>
                        {moment(appointment.appointment_date).format('DD')}
                      </Text>
                    </View>

                    <View style={styles.appointmentDetails}>
                      <Text style={styles.appointmentProviderName}>
                        {appointment.provider_name}
                      </Text>
                      <Text style={styles.appointmentTypeText}>
                        {appointment.appointment_type || 'Medical Appointment'}
                      </Text>
                    </View>

                    <View style={styles.appointmentStatus}>
                      <Icon
                        name={getStatusIcon(appointment.status)}
                        size={20}
                        color={getStatusColor(appointment.status)}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderPersonalEvents = () => {
    return (
      <View style={styles.appointmentsContainer}>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[{ value: 'all', label: 'All Events' }, ...EVENT_TYPES].map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.filterChip,
                  eventFilter === type.value && styles.filterChipActive
                ]}
                onPress={() => setEventFilter(type.value)}
              >
                {type.value !== 'all' && (
                  <Icon 
                    name={getEventTypeIcon(type.value)} 
                    size={14} 
                    color={eventFilter === type.value ? '#0d2f54' : '#a0aec0'} 
                    style={{ marginRight: 4 }}
                  />
                )}
                <Text style={[
                  styles.filterChipText,
                  eventFilter === type.value && styles.filterChipTextActive
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {loadingEvents ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFD700" />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : personalEvents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="calendar-blank-outline" size={64} color="#666" />
            <Text style={styles.emptyText}>No personal events</Text>
            <Text style={styles.emptySubtext}>Tap the + button to add your first event</Text>
          </View>
        ) : (
          <View style={styles.eventsList}>
            {personalEvents.map(event => renderEventCard(event))}
          </View>
        )}
      </View>
    );
  };

  const renderEventCard = (event) => {
    const formattedEvent = CalendarService.formatEventForDisplay(event);
    const typeColor = EVENT_TYPE_COLORS[event.event_type] || '#FFD700';
    
    return (
      <View key={event.id} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <View style={[styles.eventTypeBadge, { backgroundColor: typeColor }]}>
            <Icon name={getEventTypeIcon(event.event_type)} size={20} color="#fff" />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventTypeLabel}>
              {event.event_type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {event.synced_to_device && (
            <View style={styles.syncedBadge}>
              <Icon name="check" size={12} color="#fff" />
              <Text style={styles.syncedBadgeText}>Synced</Text>
            </View>
          )}
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventDetailRow}>
            <Icon name="calendar" size={16} color="#FFD700" />
            <Text style={styles.eventDetailText}>
              {formattedEvent.displayDate} at {formattedEvent.displayTime}
            </Text>
          </View>
          
          {event.location && (
            <View style={styles.eventDetailRow}>
              <Icon name="map-marker" size={16} color="#FFD700" />
              <Text style={styles.eventDetailText}>{event.location}</Text>
            </View>
          )}

          {event.description && (
            <Text style={styles.eventDescription}>{event.description}</Text>
          )}
        </View>

        <View style={styles.eventActions}>
          {!event.synced_to_device ? (
            <TouchableOpacity
              style={[styles.eventActionButton, styles.syncButton]}
              onPress={() => handleSyncToDevice(event)}
            >
              <Icon name="cellphone-link" size={16} color="#fff" />
              <Text style={styles.eventActionText}>Sync to Device</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.eventActionButton, styles.unsyncButton]}
              onPress={() => handleUnsyncFromDevice(event)}
            >
              <Icon name="cellphone-off" size={16} color="#fff" />
              <Text style={styles.eventActionText}>Unsync</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.eventActionButton, styles.deleteEventButton]}
            onPress={() => handleDeleteEvent(event)}
          >
            <Icon name="delete" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderBookingModal = () => (
    <Modal
      visible={showBookingModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowBookingModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Icon name="anchor" size={24} color="#FFD700" />
            <Text style={styles.modalTitle}>Book Appointment</Text>
            <TouchableOpacity onPress={() => setShowBookingModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.selectedTimeCard}>
              <Icon name="calendar-check" size={32} color="#FFD700" />
              <View style={styles.selectedTimeInfo}>
                <Text style={styles.selectedDate}>
                  {moment(selectedDate).format('dddd, MMMM Do, YYYY')}
                </Text>
                <Text style={styles.selectedTime}>
                  {bookingSlot && moment(bookingSlot.startTime, 'HH:mm').format('h:mm A')} - 
                  {bookingSlot && moment(bookingSlot.endTime, 'HH:mm').format('h:mm A')}
                </Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>Type of Appointment</Text>
            <View style={styles.appointmentTypesGrid}>
              {APPOINTMENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.appointmentTypeButton,
                    appointmentType === type.value && styles.appointmentTypeButtonActive
                  ]}
                  onPress={() => setAppointmentType(type.value)}
                >
                  <Icon
                    name={type.icon}
                    size={24}
                    color={appointmentType === type.value ? '#FFD700' : '#fff'}
                  />
                  <Text
                    style={[
                      styles.appointmentTypeButtonText,
                      appointmentType === type.value && styles.appointmentTypeButtonTextActive
                    ]}
                  >
                    {type.value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any specific concerns or information for the provider..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
            />

            <View style={styles.infoBox}>
              <Icon name="information" size={20} color="#FFD700" />
              <Text style={styles.infoText}>
                You'll receive a confirmation via email and text message once the provider accepts your appointment request.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.bookButton, booking && styles.bookButtonDisabled]}
              onPress={handleBookAppointment}
              disabled={booking}
            >
              {booking ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="anchor" size={20} color="#fff" />
                  <Text style={styles.bookButtonText}>Request Appointment</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAddEventModal = () => (
    <Modal
      visible={showAddEventModal}
      animationType="slide"
      transparent
      onRequestClose={() => setShowAddEventModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Icon name="calendar-plus" size={24} color="#FFD700" />
            <Text style={styles.modalTitle}>Add Event</Text>
            <TouchableOpacity onPress={() => { setShowAddEventModal(false); resetNewEvent(); }}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Event Type</Text>
            <View style={styles.eventTypesGrid}>
              {EVENT_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.eventTypeButton,
                    newEvent.eventType === type.value && styles.eventTypeButtonActive,
                    { borderColor: EVENT_TYPE_COLORS[type.value] }
                  ]}
                  onPress={() => setNewEvent({ ...newEvent, eventType: type.value })}
                >
                  <Icon
                    name={type.icon}
                    size={20}
                    color={newEvent.eventType === type.value ? '#fff' : EVENT_TYPE_COLORS[type.value]}
                  />
                  <Text
                    style={[
                      styles.eventTypeButtonText,
                      newEvent.eventType === type.value && styles.eventTypeButtonTextActive
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              placeholder="e.g., Court Hearing"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.textArea]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              placeholder="Event details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Location</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              placeholder="e.g., Courthouse Room 101"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Start Date & Time *</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.startTime}
              onChangeText={(text) => setNewEvent({ ...newEvent, startTime: text })}
              placeholder="YYYY-MM-DD HH:MM (e.g., 2025-12-15 14:00)"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Date & Time (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.endTime}
              onChangeText={(text) => setNewEvent({ ...newEvent, endTime: text })}
              placeholder="YYYY-MM-DD HH:MM"
              placeholderTextColor="#999"
            />

            <View style={styles.infoBox}>
              <Icon name="information" size={20} color="#FFD700" />
              <Text style={styles.infoText}>
                Use format YYYY-MM-DD HH:MM (e.g., 2025-12-15 14:00). You can sync events to your device calendar after creating them.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleAddEvent}
            >
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Create Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.fullLoadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderTabs()}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {activeTab === 'book' ? (
          <>
            {renderProviderSelection()}
            {renderCalendar()}
            {renderTimeSlots()}
          </>
        ) : activeTab === 'appointments' ? (
          renderMyAppointments()
        ) : (
          renderPersonalEvents()
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderBookingModal()}
      {renderAddEventModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628'
  },
  fullLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0d2f54',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
      },
      android: {
        elevation: 8
      }
    })
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addEventButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d2f54',
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 8
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  activeTab: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  tabText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '500'
  },
  activeTabText: {
    color: '#FFD700',
    fontWeight: 'bold'
  },
  scrollView: {
    flex: 1
  },
  section: {
    margin: 16,
    marginBottom: 8
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  providerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  providerCardSelected: {
    borderColor: '#FFD700',
    backgroundColor: 'rgba(255, 215, 0, 0.1)'
  },
  providerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  providerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center'
  },
  providerSpecialty: {
    color: '#a0aec0',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2
  },
  providerCheck: {
    position: 'absolute',
    top: 8,
    right: 8
  },
  calendarContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    padding: 8
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center'
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center'
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center'
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  slotButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: '30%'
  },
  slotTime: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  appointmentsContainer: {
    padding: 16
  },
  appointmentsList: {
    gap: 12
  },
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  pastAppointmentCard: {
    opacity: 0.7
  },
  appointmentHeader: {
    flexDirection: 'row',
    gap: 12
  },
  appointmentDateBadge: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.5)',
    borderWidth: 1,
    borderColor: '#FFD700',
    alignItems: 'center',
    justifyContent: 'center'
  },
  appointmentMonth: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  appointmentDay: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold'
  },
  appointmentDetails: {
    flex: 1
  },
  appointmentProviderName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  appointmentTime: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2
  },
  appointmentTypeText: {
    color: '#a0aec0',
    fontSize: 13
  },
  appointmentStatus: {
    alignItems: 'center'
  },
  appointmentStatusText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase'
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)'
  },
  cancelButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600'
  },
  filterContainer: {
    marginBottom: 16
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  filterChipActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700'
  },
  filterChipText: {
    fontSize: 13,
    color: '#a0aec0'
  },
  filterChipTextActive: {
    color: '#0d2f54',
    fontWeight: '600'
  },
  eventsList: {
    gap: 12
  },
  eventCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12
  },
  eventTypeBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  eventInfo: {
    flex: 1
  },
  eventTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  eventTypeLabel: {
    color: '#a0aec0',
    fontSize: 11,
    fontWeight: '500'
  },
  syncedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  syncedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600'
  },
  eventDetails: {
    marginBottom: 12
  },
  eventDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4
  },
  eventDetailText: {
    color: '#fff',
    fontSize: 14
  },
  eventDescription: {
    color: '#a0aec0',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8
  },
  eventActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8
  },
  syncButton: {
    backgroundColor: '#1a5490'
  },
  unsyncButton: {
    backgroundColor: '#6b7280'
  },
  deleteEventButton: {
    backgroundColor: '#ef4444',
    flex: 0,
    paddingHorizontal: 16
  },
  eventActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end'
  },
  modalContainer: {
    backgroundColor: '#0d2f54',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%'
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  modalContent: {
    padding: 20
  },
  selectedTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 20
  },
  selectedTimeInfo: {
    flex: 1
  },
  selectedDate: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  selectedTime: {
    color: '#fff',
    fontSize: 14
  },
  modalLabel: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 16
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  appointmentTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  appointmentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  appointmentTypeButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderColor: '#FFD700'
  },
  appointmentTypeButtonText: {
    color: '#fff',
    fontSize: 13
  },
  appointmentTypeButtonTextActive: {
    color: '#FFD700',
    fontWeight: '600'
  },
  eventTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20
  },
  eventTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1
  },
  eventTypeButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.3)'
  },
  eventTypeButtonText: {
    color: '#fff',
    fontSize: 12
  },
  eventTypeButtonTextActive: {
    color: '#fff',
    fontWeight: '600'
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    marginBottom: 20
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 13,
    lineHeight: 18
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#1a5490'
  },
  bookButtonDisabled: {
    opacity: 0.6
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  bottomPadding: {
    height: 100
  }
});

export default PatientAppointmentBookingScreen;
