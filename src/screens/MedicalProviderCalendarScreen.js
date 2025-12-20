import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, Modal, Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { medicalProviderTheme as theme } from '../styles/medicalProviderTheme';
import { API_BASE_URL } from '../config/api';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const APPOINTMENT_TYPES = ['consultation', 'follow_up', 'treatment', 'evaluation', 'imaging'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
  no_show: '#6b7280'
};

const MedicalProviderCalendarScreen = ({ user, onNavigate, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [viewMode, setViewMode] = useState('month');
  const [availability, setAvailability] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [settings, setSettings] = useState(null);
  
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventType: 'appointment',
    startDate: moment().format('MM/DD/YYYY'),
    startTimeValue: '09:00',
    duration: 60,
    reminderEnabled: true,
    selectedPatientId: ''
  });

  const DURATION_OPTIONS = [
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hr', value: 60 },
    { label: '2 hr', value: 120 },
    { label: '3 hr', value: 180 },
    { label: '4 hr', value: 240 }
  ];

  const EVENT_TYPES = [
    { value: 'appointment', label: 'Appointment', emoji: '📅' },
    { value: 'surgery', label: 'Surgery', emoji: '🏥' },
    { value: 'consultation', label: 'Consultation', emoji: '👥' },
    { value: 'follow_up', label: 'Follow-up', emoji: '🔄' },
    { value: 'reminder', label: 'Reminder', emoji: '🔔' }
  ];

  const EVENT_TYPE_COLORS = {
    appointment: '#3498db',
    surgery: '#e74c3c',
    consultation: '#9b59b6',
    follow_up: '#f39c12',
    reminder: '#1abc9c'
  };
  
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    bufferMinutes: 15
  });
  
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [bulkMode, setBulkMode] = useState(true);
  
  const [newBlockedTime, setNewBlockedTime] = useState({
    startDate: moment().format('MM/DD/YYYY'),
    endDate: moment().format('MM/DD/YYYY'),
    reason: '',
    blockType: 'personal',
    isAllDay: true
  });

  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  const providerId = user?.medicalProviderId || user?.id;

  const filteredPatients = patients.filter(patient => {
    if (!patientSearchQuery) return true;
    const fullName = `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`.toLowerCase();
    const displayName = (patient.displayName || '').toLowerCase();
    const email = (patient.email || '').toLowerCase();
    const query = patientSearchQuery.toLowerCase();
    return fullName.includes(query) || displayName.includes(query) || email.includes(query);
  });

  useEffect(() => {
    fetchAllData();
  }, [selectedDate]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAvailability(),
        fetchBlockedTimes(),
        fetchAppointments(),
        fetchSettings(),
        fetchPatients()
      ]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medicalprovider/patients`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setPatients(data.patients || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/availability`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailability(data.availability || []);
      }
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const fetchBlockedTimes = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/blocked-times`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setBlockedTimes(data.blockedTimes || []);
        updateMarkedDates(appointments, data.blockedTimes || []);
      }
    } catch (error) {
      console.error('Error fetching blocked times:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const startDate = moment(selectedDate).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(selectedDate).endOf('month').format('YYYY-MM-DD');
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/appointments?startDate=${startDate}&endDate=${endDate}`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
        updateMarkedDates(data.appointments || [], blockedTimes);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/calendar-settings`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/calendar-settings`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newSettings)
        }
      );
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
        Alert.alert('Success', 'Settings updated successfully!');
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to update settings');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update settings');
    }
  };

  const updateMarkedDates = (appts, blocked) => {
    const marked = {};
    
    appts.forEach(appt => {
      const date = appt.appointment_date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      const color = appt.status === 'confirmed' ? '#10b981' : 
                    appt.status === 'pending' ? '#f59e0b' : '#6b7280';
      marked[date].dots.push({ key: `appt-${appt.id}`, color });
    });

    blocked.forEach(block => {
      const startDate = moment(block.start_datetime).format('YYYY-MM-DD');
      const endDate = moment(block.end_datetime).format('YYYY-MM-DD');
      let current = moment(startDate);
      while (current.isSameOrBefore(endDate)) {
        const date = current.format('YYYY-MM-DD');
        if (!marked[date]) {
          marked[date] = { dots: [] };
        }
        marked[date].dots.push({ key: `block-${block.id}-${date}`, color: '#ef4444' });
        current.add(1, 'day');
      }
    });

    setMarkedDates(marked);
  };

  const handleAddAvailability = async () => {
    try {
      const daysToAdd = bulkMode ? selectedDays : [newAvailability.dayOfWeek];
      
      if (daysToAdd.length === 0) {
        Alert.alert('Error', 'Please select at least one day');
        return;
      }
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const dayOfWeek of daysToAdd) {
        const availabilityData = {
          ...newAvailability,
          dayOfWeek,
          isRecurring
        };
        
        const response = await fetch(
          `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/availability`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${user.token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(availabilityData)
          }
        );
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      if (successCount > 0) {
        Alert.alert('Success', `Availability set for ${successCount} day(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
        setShowAvailabilityModal(false);
        fetchAvailability();
        setNewAvailability({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '17:00',
          slotDuration: 30,
          bufferMinutes: 15
        });
      } else {
        Alert.alert('Error', 'Failed to add availability for any days');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add availability');
    }
  };

  const handleDeleteAvailability = async (availabilityId) => {
    Alert.alert(
      'Delete Availability',
      'Are you sure you want to remove this availability slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/availability/${availabilityId}`,
                {
                  method: 'DELETE',
                  headers: { 'Authorization': `Bearer ${user.token}` }
                }
              );
              if (response.ok) {
                fetchAvailability();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete availability');
            }
          }
        }
      ]
    );
  };

  const handleBlockTime = async () => {
    if (!newBlockedTime.startDate || !newBlockedTime.endDate) {
      Alert.alert('Error', 'Please select start and end dates');
      return;
    }
    
    // Parse MM/DD/YYYY format to YYYY-MM-DD for API
    const parsedStartDate = moment(newBlockedTime.startDate, 'MM/DD/YYYY');
    const parsedEndDate = moment(newBlockedTime.endDate, 'MM/DD/YYYY');
    
    if (!parsedStartDate.isValid() || !parsedEndDate.isValid()) {
      Alert.alert('Error', 'Invalid date format. Use MM/DD/YYYY');
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/block-time`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDatetime: `${parsedStartDate.format('YYYY-MM-DD')}T00:00:00`,
            endDatetime: `${parsedEndDate.format('YYYY-MM-DD')}T23:59:59`,
            reason: newBlockedTime.reason,
            blockType: newBlockedTime.blockType,
            isAllDay: newBlockedTime.isAllDay
          })
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Time blocked successfully!');
        setShowBlockTimeModal(false);
        fetchBlockedTimes();
        setNewBlockedTime({
          startDate: moment().format('YYYY-MM-DD'),
          endDate: moment().format('YYYY-MM-DD'),
          reason: '',
          blockType: 'personal',
          isAllDay: true
        });
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to block time');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to block time');
    }
  };

  const handleDeleteBlockedTime = async (blockId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/blocked-times/${blockId}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${user.token}` }
        }
      );
      if (response.ok) {
        fetchBlockedTimes();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to remove blocked time');
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.startTimeValue) {
      Alert.alert('Error', 'Please enter a title, date, and time');
      return;
    }

    // Parse MM/DD/YYYY date and HH:mm time separately
    const parsedStartMoment = moment(`${newEvent.startDate} ${newEvent.startTimeValue}`, 'MM/DD/YYYY HH:mm');
    if (!parsedStartMoment.isValid()) {
      Alert.alert('Error', 'Invalid date or time format');
      return;
    }
    const parsedStartTime = parsedStartMoment.toDate();

    // Calculate end time based on duration
    const parsedEndTime = new Date(parsedStartTime.getTime() + (newEvent.duration * 60 * 1000));

    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newEvent.title,
          description: newEvent.description,
          location: newEvent.location,
          event_type: newEvent.eventType,
          start_time: parsedStartTime.toISOString(),
          end_time: parsedEndTime.toISOString(),
          all_day: false,
          reminder_enabled: newEvent.reminderEnabled,
          share_with_client_id: newEvent.selectedPatientId || null
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Event created successfully!');
        setShowAddEventModal(false);
        setNewEvent({
          title: '',
          description: '',
          location: '',
          eventType: 'appointment',
          startDate: moment().format('MM/DD/YYYY'),
          startTimeValue: '09:00',
          duration: 60,
          reminderEnabled: true,
          selectedPatientId: ''
        });
        fetchAppointments();
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/appointments/${appointmentId}/confirm`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${user.token}` }
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Appointment confirmed!');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to confirm appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId, reason) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/appointments/${appointmentId}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ reason })
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Appointment cancelled');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to cancel appointment');
    }
  };

  const handleCompleteAppointment = async (appointmentId, notes) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/appointments/${appointmentId}/complete`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ providerNotes: notes })
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Appointment marked as completed!');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to complete appointment');
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    return moment(timeStr, 'HH:mm:ss').format('h:mm A');
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setViewMode('day');
  };

  const generateTimeSlots = (dayAvailability, dayAppointments, dayBlocked) => {
    if (!dayAvailability) return [];

    const slots = [];
    const start = moment(dayAvailability.start_time, 'HH:mm:ss');
    const end = moment(dayAvailability.end_time, 'HH:mm:ss');
    const slotDuration = dayAvailability.slot_duration_minutes || 30;

    let current = start.clone();

    while (current.clone().add(slotDuration, 'minutes').isSameOrBefore(end)) {
      const slotStart = current.format('HH:mm');
      const slotEnd = current.clone().add(slotDuration, 'minutes').format('HH:mm');

      const appointment = dayAppointments.find(a => 
        moment(a.start_time, 'HH:mm:ss').format('HH:mm') === slotStart
      );

      const blocked = dayBlocked.find(b => {
        const blockStart = moment(b.start_datetime);
        const blockEnd = moment(b.end_datetime);
        const slotTime = moment(`${selectedDate} ${slotStart}`);
        return slotTime.isBetween(blockStart, blockEnd, null, '[]');
      });

      slots.push({
        startTime: slotStart,
        endTime: slotEnd,
        appointment,
        blocked
      });

      current.add(slotDuration, 'minutes');
    }

    return slots;
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={onBack} style={styles.homeButton}>
          <Text style={styles.headerIconEmoji}>⛵</Text>
        </TouchableOpacity>
        <Text style={styles.headerIconEmoji}>⚓</Text>
        <Text style={styles.headerTitle}>Medical Calendar</Text>
        <TouchableOpacity onPress={onBack} style={styles.minimizeButton}>
          <Text style={styles.headerIconEmoji}>➖</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>Chart Your Course</Text>
    </View>
  );

  const renderViewModeSelector = () => (
    <View style={styles.viewModeContainer}>
      {['month', 'week', 'day'].map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[styles.viewModeButton, viewMode === mode && styles.viewModeButtonActive]}
          onPress={() => setViewMode(mode)}
        >
          <Icon 
            name={mode === 'month' ? 'calendar-month' : mode === 'week' ? 'calendar-week' : 'calendar-today'} 
            size={20} 
            color={viewMode === mode ? '#FFD700' : '#fff'} 
          />
          <Text style={[styles.viewModeText, viewMode === mode && styles.viewModeTextActive]}>
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderActionButtons = () => (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={styles.actionButton} onPress={() => setShowAvailabilityModal(true)}>
        <Icon name="clock-outline" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Set Hours</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowBlockTimeModal(true)}>
        <Icon name="block-helper" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Block Time</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowImportModal(true)}>
        <Icon name="upload" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Import</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowAddEventModal(true)}>
        <Icon name="calendar-star" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Add Event</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettingsModal(true)}>
        <Icon name="cog" size={20} color="#fff" />
        <Text style={styles.actionButtonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMonthView = () => (
    <View style={styles.calendarContainer}>
      <Calendar
        current={selectedDate}
        onDayPress={onDayPress}
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: '#1a5490'
          }
        }}
        markingType={'multi-dot'}
        theme={{
          backgroundColor: 'transparent',
          calendarBackground: 'rgba(255, 255, 255, 0.1)',
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
  );

  const renderDayView = () => {
    const dayOfWeek = moment(selectedDate).day();
    const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);
    const dayAppointments = appointments.filter(a => a.appointment_date === selectedDate);
    const dayBlocked = blockedTimes.filter(b => {
      const blockStart = moment(b.start_datetime).format('YYYY-MM-DD');
      const blockEnd = moment(b.end_datetime).format('YYYY-MM-DD');
      return moment(selectedDate).isBetween(blockStart, blockEnd, null, '[]');
    });
    const timeSlots = generateTimeSlots(dayAvailability, dayAppointments, dayBlocked);

    return (
      <View style={styles.dayViewContainer}>
        <View style={styles.dayViewHeader}>
          <Icon name="calendar-star" size={24} color="#FFD700" />
          <Text style={styles.dayViewTitle}>
            {moment(selectedDate).format('dddd, MM/DD/YYYY')}
          </Text>
        </View>

        {!dayAvailability ? (
          <View style={styles.noAvailabilityContainer}>
            <Icon name="skull-crossbones" size={48} color="#666" />
            <Text style={styles.noAvailabilityText}>No availability set for this day</Text>
            <Text style={styles.noAvailabilitySubtext}>Set your hours to start accepting appointments</Text>
          </View>
        ) : (
          <View style={styles.timeSlotsContainer}>
            {timeSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.timeSlot,
                  slot.appointment ? (slot.appointment.status === 'confirmed' ? styles.slotConfirmed : styles.slotPending) :
                  slot.blocked ? styles.slotBlocked : styles.slotAvailable
                ]}
                onPress={() => {
                  if (slot.appointment) {
                    setSelectedAppointment(slot.appointment);
                    setShowAppointmentModal(true);
                  }
                }}
                disabled={!slot.appointment}
              >
                <View style={styles.timeSlotTime}>
                  <Text style={styles.timeSlotTimeText}>
                    {moment(slot.startTime, 'HH:mm').format('h:mm A')}
                  </Text>
                </View>

                <View style={styles.timeSlotContent}>
                  <Icon 
                    name={slot.appointment ? 'account-check' : slot.blocked ? 'block-helper' : 'calendar-blank'} 
                    size={24} 
                    color="#fff" 
                  />
                  {slot.appointment ? (
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentPatientName}>
                        {slot.appointment.patient_first_name} {slot.appointment.patient_last_name}
                      </Text>
                      <Text style={styles.appointmentTypeText}>
                        {slot.appointment.appointment_type || 'Medical Appointment'}
                      </Text>
                    </View>
                  ) : slot.blocked ? (
                    <Text style={styles.slotLabel}>Blocked - {slot.blocked.reason || 'Unavailable'}</Text>
                  ) : (
                    <Text style={styles.slotLabel}>Available</Text>
                  )}
                </View>

                {slot.appointment && (
                  <Icon
                    name={slot.appointment.status === 'confirmed' ? 'check-circle' : 'clock-outline'}
                    size={20}
                    color={slot.appointment.status === 'confirmed' ? '#10b981' : '#f59e0b'}
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderWeekView = () => {
    const weekStart = moment(selectedDate).startOf('week');
    const weekDays = Array.from({ length: 7 }, (_, i) => weekStart.clone().add(i, 'days'));

    return (
      <View style={styles.weekViewContainer}>
        {weekDays.map(day => {
          const dayAppointments = appointments.filter(
            a => a.appointment_date === day.format('YYYY-MM-DD')
          );

          return (
            <TouchableOpacity
              key={day.format('YYYY-MM-DD')}
              style={[
                styles.weekDay,
                day.format('YYYY-MM-DD') === selectedDate && styles.weekDaySelected
              ]}
              onPress={() => {
                setSelectedDate(day.format('YYYY-MM-DD'));
                setViewMode('day');
              }}
            >
              <View style={styles.weekDayHeader}>
                <Text style={styles.weekDayName}>{day.format('ddd')}</Text>
                <Text style={styles.weekDayNumber}>{day.format('D')}</Text>
              </View>
              <View style={styles.weekDayAppointments}>
                {dayAppointments.slice(0, 3).map((appt, index) => (
                  <View
                    key={index}
                    style={[
                      styles.weekDayAppointment,
                      { backgroundColor: appt.status === 'confirmed' ? '#10b981' : '#f59e0b' }
                    ]}
                  >
                    <Text style={styles.weekDayAppointmentText} numberOfLines={1}>
                      {moment(appt.start_time, 'HH:mm:ss').format('h:mm A')}
                    </Text>
                  </View>
                ))}
                {dayAppointments.length > 3 && (
                  <Text style={styles.weekDayMore}>+{dayAppointments.length - 3}</Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  const renderLegend = () => (
    <View style={styles.legendContainer}>
      <Text style={styles.legendTitle}>Legend</Text>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
        <Text style={styles.legendText}>Confirmed</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
        <Text style={styles.legendText}>Pending</Text>
      </View>
      <View style={styles.legendRow}>
        <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
        <Text style={styles.legendText}>Blocked</Text>
      </View>
    </View>
  );

  const toggleDay = (dayIdx) => {
    if (selectedDays.includes(dayIdx)) {
      setSelectedDays(selectedDays.filter(d => d !== dayIdx));
    } else {
      setSelectedDays([...selectedDays, dayIdx]);
    }
  };

  const applyPreset = (preset) => {
    switch (preset) {
      case 'weekdays':
        setSelectedDays([1, 2, 3, 4, 5]);
        break;
      case 'weekends':
        setSelectedDays([0, 6]);
        break;
      case 'all':
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
        break;
      case 'none':
        setSelectedDays([]);
        break;
    }
  };

  const handleClearAllAvailability = async () => {
    Alert.alert(
      'Clear All Hours',
      'Are you sure you want to remove all availability? This will stop the recurring schedule.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const avail of availability) {
                await fetch(
                  `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/availability/${avail.id}`,
                  {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${user.token}` }
                  }
                );
              }
              Alert.alert('Success', 'All availability cleared');
              fetchAvailability();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear availability');
            }
          }
        }
      ]
    );
  };

  const renderAvailabilityModal = () => (
    <Modal visible={showAvailabilityModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Weekly Hours</Text>
            <TouchableOpacity onPress={() => setShowAvailabilityModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity 
                style={[styles.modeToggleButton, bulkMode && styles.modeToggleButtonActive]}
                onPress={() => setBulkMode(true)}
              >
                <Icon name="calendar-week" size={18} color={bulkMode ? '#fff' : '#999'} />
                <Text style={[styles.modeToggleText, bulkMode && styles.modeToggleTextActive]}>Multiple Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeToggleButton, !bulkMode && styles.modeToggleButtonActive]}
                onPress={() => setBulkMode(false)}
              >
                <Icon name="calendar" size={18} color={!bulkMode ? '#fff' : '#999'} />
                <Text style={[styles.modeToggleText, !bulkMode && styles.modeToggleTextActive]}>Single Day</Text>
              </TouchableOpacity>
            </View>

            {bulkMode ? (
              <>
                <Text style={styles.modalLabel}>Quick Presets</Text>
                <View style={styles.presetRow}>
                  <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('weekdays')}>
                    <Text style={styles.presetButtonText}>M-F</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('weekends')}>
                    <Text style={styles.presetButtonText}>Weekends</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('all')}>
                    <Text style={styles.presetButtonText}>All Days</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.presetButton} onPress={() => applyPreset('none')}>
                    <Text style={styles.presetButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Select Days</Text>
                <View style={styles.daySelector}>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayButton, selectedDays.includes(idx) && styles.dayButtonActive]}
                      onPress={() => toggleDay(idx)}
                    >
                      <Text style={[styles.dayButtonText, selectedDays.includes(idx) && styles.dayButtonTextActive]}>
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.selectedDaysText}>
                  {selectedDays.length === 0 ? 'No days selected' : 
                   selectedDays.length === 7 ? 'All days selected' :
                   `${selectedDays.length} day(s) selected`}
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.modalLabel}>Day of Week</Text>
                <View style={styles.daySelector}>
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayButton, newAvailability.dayOfWeek === idx && styles.dayButtonActive]}
                      onPress={() => setNewAvailability({ ...newAvailability, dayOfWeek: idx })}
                    >
                      <Text style={[styles.dayButtonText, newAvailability.dayOfWeek === idx && styles.dayButtonTextActive]}>
                        {day.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.modalLabel}>Start Time</Text>
            <TextInput
              style={styles.modalInput}
              value={newAvailability.startTime}
              onChangeText={(text) => setNewAvailability({ ...newAvailability, startTime: text })}
              placeholder="09:00"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Time</Text>
            <TextInput
              style={styles.modalInput}
              value={newAvailability.endTime}
              onChangeText={(text) => setNewAvailability({ ...newAvailability, endTime: text })}
              placeholder="17:00"
              placeholderTextColor="#999"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.modalLabel}>Slot Duration (min)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={String(newAvailability.slotDuration)}
                  onChangeText={(text) => setNewAvailability({ ...newAvailability, slotDuration: parseInt(text) || 30 })}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.modalLabel}>Buffer (min)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={String(newAvailability.bufferMinutes)}
                  onChangeText={(text) => setNewAvailability({ ...newAvailability, bufferMinutes: parseInt(text) || 15 })}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.recurringContainer}>
              <TouchableOpacity 
                style={styles.recurringToggle}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                <Icon 
                  name={isRecurring ? 'checkbox-marked' : 'checkbox-blank-outline'} 
                  size={24} 
                  color={isRecurring ? '#4ade80' : '#666'} 
                />
                <View style={styles.recurringTextContainer}>
                  <Text style={styles.recurringLabel}>Repeat Weekly</Text>
                  <Text style={styles.recurringDescription}>
                    {isRecurring ? 'Schedule repeats every week' : 'One-time schedule only'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddAvailability}>
              <Icon name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>
                {bulkMode ? `Save Hours for ${selectedDays.length} Day(s)` : 'Save Availability'}
              </Text>
            </TouchableOpacity>

            {availability.length > 0 && (
              <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAllAvailability}>
                <Icon name="delete-sweep" size={20} color="#ef4444" />
                <Text style={styles.clearAllButtonText}>Clear All Hours (Stop Repeat)</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderBlockTimeModal = () => (
    <Modal visible={showBlockTimeModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Block Time</Text>
            <TouchableOpacity onPress={() => setShowBlockTimeModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Start Date</Text>
            <TextInput
              style={styles.modalInput}
              value={newBlockedTime.startDate}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, startDate: text })}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Date</Text>
            <TextInput
              style={styles.modalInput}
              value={newBlockedTime.endDate}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, endDate: text })}
              placeholder="MM/DD/YYYY"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={newBlockedTime.reason}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, reason: text })}
              placeholder="Vacation, Conference, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleBlockTime}>
              <Icon name="block-helper" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Block Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderImportModal = () => (
    <Modal visible={showImportModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Import Calendar</Text>
            <TouchableOpacity onPress={() => setShowImportModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.importInfo}>
              <Icon name="information" size={48} color="#FFD700" />
              <Text style={styles.importInfoText}>Import your existing calendar from:</Text>
              <Text style={styles.importSource}>Google Calendar (.ics)</Text>
              <Text style={styles.importSource}>Outlook Calendar (.ics)</Text>
              <Text style={styles.importSource}>Apple Calendar (.ics)</Text>
              <Text style={styles.importInfoSubtext}>
                Your availability will be automatically configured based on your calendar.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => {
                Alert.alert('Coming Soon', 'Calendar import feature will be available in a future update.');
                setShowImportModal(false);
              }}
            >
              <Icon name="upload" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Choose Calendar File</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAppointmentModal = () => (
    <Modal visible={showAppointmentModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            <TouchableOpacity onPress={() => setShowAppointmentModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {selectedAppointment && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.appointmentDetailCard}>
                <Icon name="account" size={40} color="#FFD700" />
                <Text style={styles.appointmentDetailName}>
                  {selectedAppointment.patient_first_name} {selectedAppointment.patient_last_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedAppointment.status] }]}>
                  <Text style={styles.statusBadgeText}>{selectedAppointment.status}</Text>
                </View>
              </View>

              <View style={styles.appointmentDetailRow}>
                <Icon name="clock-outline" size={20} color="#FFD700" />
                <Text style={styles.appointmentDetailText}>
                  {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                </Text>
              </View>

              <View style={styles.appointmentDetailRow}>
                <Icon name="medical-bag" size={20} color="#FFD700" />
                <Text style={styles.appointmentDetailText}>
                  {selectedAppointment.appointment_type || 'Consultation'}
                </Text>
              </View>

              {selectedAppointment.notes && (
                <View style={styles.appointmentDetailRow}>
                  <Icon name="note-text" size={20} color="#FFD700" />
                  <Text style={styles.appointmentDetailText}>{selectedAppointment.notes}</Text>
                </View>
              )}

              <View style={styles.appointmentActions}>
                {selectedAppointment.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#10b981' }]}
                    onPress={() => handleConfirmAppointment(selectedAppointment.id)}
                  >
                    <Icon name="check" size={20} color="#fff" />
                    <Text style={styles.appointmentActionText}>Confirm</Text>
                  </TouchableOpacity>
                )}

                {selectedAppointment.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#6366f1' }]}
                    onPress={() => handleCompleteAppointment(selectedAppointment.id, '')}
                  >
                    <Icon name="check-all" size={20} color="#fff" />
                    <Text style={styles.appointmentActionText}>Complete</Text>
                  </TouchableOpacity>
                )}

                {['pending', 'confirmed'].includes(selectedAppointment.status) && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleCancelAppointment(selectedAppointment.id, 'Cancelled by provider')}
                  >
                    <Icon name="close" size={20} color="#fff" />
                    <Text style={styles.appointmentActionText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );

  const renderSettingsModal = () => (
    <Modal visible={showSettingsModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Calendar Settings</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Multi-Booking Settings</Text>
              <Text style={styles.settingsDescription}>
                Allow multiple patients to book the same time slot. Useful for group therapy or parallel consultations.
              </Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="account-group" size={24} color="#FFD700" />
                  <Text style={styles.toggleLabel}>Enable Multi-Booking</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings?.allow_multi_booking && styles.toggleButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ 
                    allowMultiBooking: !settings?.allow_multi_booking 
                  })}
                >
                  <View style={[
                    styles.toggleCircle,
                    settings?.allow_multi_booking && styles.toggleCircleActive
                  ]} />
                </TouchableOpacity>
              </View>

              {settings?.allow_multi_booking && (
                <View style={styles.maxBookingsContainer}>
                  <Text style={styles.modalLabel}>Max Concurrent Bookings</Text>
                  <Text style={styles.settingsDescription}>
                    Maximum number of patients that can book the same time slot
                  </Text>
                  <View style={styles.maxBookingsSelector}>
                    {[2, 3, 4, 5, 6].map((num) => (
                      <TouchableOpacity
                        key={num}
                        style={[
                          styles.maxBookingsOption,
                          (settings?.max_concurrent_bookings || 4) === num && styles.maxBookingsOptionActive
                        ]}
                        onPress={() => handleUpdateSettings({ maxConcurrentBookings: num })}
                      >
                        <Text style={[
                          styles.maxBookingsOptionText,
                          (settings?.max_concurrent_bookings || 4) === num && styles.maxBookingsOptionTextActive
                        ]}>
                          {num}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Notification Preferences</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="email-outline" size={24} color="#FFD700" />
                  <Text style={styles.toggleLabel}>Email Notifications</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings?.email_notifications && styles.toggleButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ 
                    emailNotifications: !settings?.email_notifications 
                  })}
                >
                  <View style={[
                    styles.toggleCircle,
                    settings?.email_notifications && styles.toggleCircleActive
                  ]} />
                </TouchableOpacity>
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="message-text-outline" size={24} color="#FFD700" />
                  <Text style={styles.toggleLabel}>SMS Notifications</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings?.sms_notifications && styles.toggleButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ 
                    smsNotifications: !settings?.sms_notifications 
                  })}
                >
                  <View style={[
                    styles.toggleCircle,
                    settings?.sms_notifications && styles.toggleCircleActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Booking Preferences</Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="check-circle-outline" size={24} color="#FFD700" />
                  <Text style={styles.toggleLabel}>Auto-confirm Appointments</Text>
                </View>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    settings?.auto_confirm_appointments && styles.toggleButtonActive
                  ]}
                  onPress={() => handleUpdateSettings({ 
                    autoConfirmAppointments: !settings?.auto_confirm_appointments 
                  })}
                >
                  <View style={[
                    styles.toggleCircle,
                    settings?.auto_confirm_appointments && styles.toggleCircleActive
                  ]} />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAddEventModal = () => (
    <Modal visible={showAddEventModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Event</Text>
            <TouchableOpacity onPress={() => setShowAddEventModal(false)}>
              <Text style={{ fontSize: 20, color: '#fff' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Event Title *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter event title"
                placeholderTextColor="#999"
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Event Type</Text>
              <View style={styles.eventTypeGrid}>
                {EVENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.eventTypeOption,
                      newEvent.eventType === type.value && styles.eventTypeOptionActive,
                      { borderColor: EVENT_TYPE_COLORS[type.value] }
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, eventType: type.value })}
                  >
                    <Text style={{ fontSize: 18 }}>{type.emoji}</Text>
                    <Text style={[
                      styles.eventTypeLabel,
                      newEvent.eventType === type.value && { color: EVENT_TYPE_COLORS[type.value] }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Share with Patient</Text>
              <Text style={styles.settingsDescription}>
                Select a patient to automatically add this event to their calendar
              </Text>
              <TouchableOpacity
                style={styles.patientPickerButton}
                onPress={() => setShowPatientPicker(!showPatientPicker)}
              >
                <View style={styles.patientPickerContent}>
                  <Text style={{ fontSize: 18 }}>{newEvent.selectedPatientId ? '👤' : '🚫'}</Text>
                  <Text style={[
                    styles.patientPickerText,
                    newEvent.selectedPatientId && styles.patientPickerTextSelected
                  ]}>
                    {newEvent.selectedPatientId 
                      ? (() => {
                          const selected = patients.find(p => p.id === newEvent.selectedPatientId);
                          return selected ? (selected.displayName || `${selected.firstName || selected.first_name || ''} ${selected.lastName || selected.last_name || ''}`) : 'Select Patient';
                        })()
                      : "Don't Share"
                    }
                  </Text>
                </View>
                <Text style={styles.dropdownIcon}>{showPatientPicker ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showPatientPicker && (
                <View style={styles.patientDropdown}>
                  <View style={styles.patientSearchContainer}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
                    <TextInput
                      style={styles.patientSearchInput}
                      placeholder="Search patients..."
                      placeholderTextColor="#999"
                      value={patientSearchQuery}
                      onChangeText={setPatientSearchQuery}
                      autoCapitalize="none"
                    />
                    {patientSearchQuery.length > 0 && (
                      <TouchableOpacity onPress={() => setPatientSearchQuery('')}>
                        <Text style={{ fontSize: 16 }}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <ScrollView style={styles.patientDropdownList} nestedScrollEnabled={true}>
                    <TouchableOpacity
                      style={[
                        styles.patientDropdownItem,
                        !newEvent.selectedPatientId && styles.patientDropdownItemSelected
                      ]}
                      onPress={() => {
                        setNewEvent({ ...newEvent, selectedPatientId: '' });
                        setShowPatientPicker(false);
                        setPatientSearchQuery('');
                      }}
                    >
                      <Text style={{ fontSize: 16 }}>🚫</Text>
                      <Text style={[
                        styles.patientDropdownItemText,
                        !newEvent.selectedPatientId && styles.patientDropdownItemTextSelected
                      ]}>
                        Don't Share
                      </Text>
                    </TouchableOpacity>
                    
                    {filteredPatients.length === 0 && patientSearchQuery ? (
                      <View style={styles.noResultsContainer}>
                        <Text style={styles.noResultsText}>No patients found matching "{patientSearchQuery}"</Text>
                      </View>
                    ) : (
                      filteredPatients.map((patient) => (
                        <TouchableOpacity
                          key={patient.id}
                          style={[
                            styles.patientDropdownItem,
                            newEvent.selectedPatientId === patient.id && styles.patientDropdownItemSelected
                          ]}
                          onPress={() => {
                            setNewEvent({ ...newEvent, selectedPatientId: patient.id });
                            setShowPatientPicker(false);
                            setPatientSearchQuery('');
                          }}
                        >
                          <Text style={{ fontSize: 16 }}>👤</Text>
                          <View style={styles.patientDropdownItemInfo}>
                            <Text style={[
                              styles.patientDropdownItemText,
                              newEvent.selectedPatientId === patient.id && styles.patientDropdownItemTextSelected
                            ]}>
                              {patient.displayName || `${patient.firstName || patient.first_name || ''} ${patient.lastName || patient.last_name || ''}`}
                            </Text>
                            {patient.email && (
                              <Text style={styles.patientDropdownItemEmail}>{patient.email}</Text>
                            )}
                          </View>
                          {newEvent.selectedPatientId === patient.id && (
                            <Text style={{ fontSize: 16 }}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Date *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="MM/DD/YYYY"
                placeholderTextColor="#999"
                value={newEvent.startDate}
                onChangeText={(text) => setNewEvent({ ...newEvent, startDate: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Time *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="HH:MM (e.g., 09:00)"
                placeholderTextColor="#999"
                value={newEvent.startTimeValue}
                onChangeText={(text) => setNewEvent({ ...newEvent, startTimeValue: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Length</Text>
              <View style={styles.durationGrid}>
                {DURATION_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.durationOption,
                      newEvent.duration === option.value && styles.durationOptionActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, duration: option.value })}
                  >
                    <Text style={[
                      styles.durationOptionText,
                      newEvent.duration === option.value && styles.durationOptionTextActive
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Location (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter location"
                placeholderTextColor="#999"
                value={newEvent.location}
                onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter description"
                placeholderTextColor="#999"
                value={newEvent.description}
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                multiline
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>🔔</Text>
                <Text style={styles.toggleLabel}>Enable Reminder</Text>
              </View>
              <TouchableOpacity
                style={[styles.toggleButton, newEvent.reminderEnabled && styles.toggleButtonActive]}
                onPress={() => setNewEvent({ ...newEvent, reminderEnabled: !newEvent.reminderEnabled })}
              >
                <View style={[styles.toggleCircle, newEvent.reminderEnabled && styles.toggleCircleActive]} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddEvent}>
              <Text style={{ fontSize: 18, marginRight: 8 }}>📅</Text>
              <Text style={styles.submitButtonText}>Create Event</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderViewModeSelector()}
      {renderActionButtons()}
      
      <ScrollView style={styles.scrollView}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {renderLegend()}
      </ScrollView>

      {renderAvailabilityModal()}
      {renderBlockTimeModal()}
      {renderImportModal()}
      {renderAppointmentModal()}
      {renderSettingsModal()}
      {renderAddEventModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628'
  },
  header: {
    backgroundColor: '#0d2f54',
    padding: 20,
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12
  },
  homeButton: {
    position: 'absolute',
    left: 0,
    padding: 8
  },
  minimizeButton: {
    position: 'absolute',
    right: 0,
    padding: 8
  },
  headerIconEmoji: {
    fontSize: 24,
    color: '#FFD700',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 4,
    opacity: 0.9
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  viewModeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  viewModeButtonActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.5)',
    borderColor: '#FFD700'
  },
  viewModeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  viewModeTextActive: {
    color: '#FFD700',
    fontWeight: 'bold'
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  scrollView: {
    flex: 1
  },
  calendarContainer: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16
  },
  dayViewContainer: {
    padding: 16
  },
  dayViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)'
  },
  dayViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  noAvailabilityContainer: {
    alignItems: 'center',
    padding: 40
  },
  noAvailabilityText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center'
  },
  noAvailabilitySubtext: {
    color: '#999',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center'
  },
  timeSlotsContainer: {
    gap: 8
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1
  },
  slotAvailable: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  slotConfirmed: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: '#10b981'
  },
  slotPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: '#f59e0b'
  },
  slotBlocked: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderColor: '#ef4444'
  },
  timeSlotTime: {
    width: 80
  },
  timeSlotTimeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  timeSlotContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  appointmentInfo: {
    flex: 1
  },
  appointmentPatientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  appointmentTypeText: {
    color: '#999',
    fontSize: 13,
    marginTop: 2
  },
  slotLabel: {
    color: '#fff',
    fontSize: 14
  },
  weekViewContainer: {
    padding: 16,
    gap: 8
  },
  weekDay: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 8
  },
  weekDaySelected: {
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderColor: '#FFD700'
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  weekDayName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold'
  },
  weekDayNumber: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  },
  weekDayAppointments: {
    gap: 4
  },
  weekDayAppointment: {
    padding: 6,
    borderRadius: 6
  },
  weekDayAppointmentText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600'
  },
  weekDayMore: {
    color: '#999',
    fontSize: 12,
    marginTop: 4
  },
  legendContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  legendTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6
  },
  legendText: {
    color: '#fff',
    fontSize: 14
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
    maxHeight: '80%',
    borderTopWidth: 2,
    borderColor: '#FFD700'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  modalLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16
  },
  inputGroup: {
    marginBottom: 16
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16
  },
  eventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  eventTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2
  },
  eventTypeOptionActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)'
  },
  eventTypeLabel: {
    color: '#999',
    fontSize: 13,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  durationOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#FFD700',
    minWidth: 70,
    alignItems: 'center'
  },
  durationOptionActive: {
    backgroundColor: '#FFD700'
  },
  durationOptionText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600'
  },
  durationOptionTextActive: {
    color: '#1a1a2e',
    fontWeight: '500'
  },
  patientScrollView: {
    marginTop: 8
  },
  patientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginRight: 8
  },
  patientChipSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700'
  },
  patientChipText: {
    color: '#999',
    fontSize: 13
  },
  patientChipTextSelected: {
    color: '#FFD700',
    fontWeight: '600'
  },
  patientPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  patientPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  patientPickerText: {
    color: '#999',
    fontSize: 15
  },
  patientPickerTextSelected: {
    color: '#FFD700',
    fontWeight: '600'
  },
  dropdownIcon: {
    color: '#FFD700',
    fontSize: 14
  },
  patientDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    maxHeight: 250,
    overflow: 'hidden'
  },
  patientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  patientSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4
  },
  patientDropdownList: {
    maxHeight: 200
  },
  patientDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  patientDropdownItemSelected: {
    backgroundColor: 'rgba(255, 215, 0, 0.15)'
  },
  patientDropdownItemInfo: {
    flex: 1
  },
  patientDropdownItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  patientDropdownItemTextSelected: {
    color: '#FFD700'
  },
  patientDropdownItemEmail: {
    color: '#999',
    fontSize: 12,
    marginTop: 2
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center'
  },
  noResultsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center'
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  dayButtonActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#FFD700'
  },
  dayButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500'
  },
  dayButtonTextActive: {
    color: '#FFD700',
    fontWeight: 'bold'
  },
  modeToggleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  modeToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  modeToggleButtonActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#FFD700'
  },
  modeToggleText: {
    color: '#999',
    fontSize: 13,
    fontWeight: '500'
  },
  modeToggleTextActive: {
    color: '#fff',
    fontWeight: 'bold'
  },
  presetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12
  },
  presetButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    alignItems: 'center'
  },
  presetButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600'
  },
  selectedDaysText: {
    color: '#999',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8
  },
  recurringContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  recurringTextContainer: {
    flex: 1
  },
  recurringLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  recurringDescription: {
    color: '#999',
    fontSize: 12,
    marginTop: 2
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.5)',
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  clearAllButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '500'
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16
  },
  modalTextArea: {
    minHeight: 80,
    textAlignVertical: 'top'
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12
  },
  timeInput: {
    flex: 1
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a5490',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  importInfo: {
    alignItems: 'center',
    padding: 20
  },
  importInfoText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 16
  },
  importSource: {
    color: '#FFD700',
    fontSize: 14,
    marginBottom: 8
  },
  importInfoSubtext: {
    color: '#999',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 16
  },
  appointmentDetailCard: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    marginBottom: 16
  },
  appointmentDetailName: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  appointmentDetailText: {
    color: '#fff',
    fontSize: 16
  },
  appointmentActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24
  },
  appointmentActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12
  },
  appointmentActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  settingsSection: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  settingsSectionTitle: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8
  },
  settingsDescription: {
    color: '#999',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500'
  },
  toggleButton: {
    width: 52,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 2,
    justifyContent: 'center'
  },
  toggleButtonActive: {
    backgroundColor: '#10b981'
  },
  toggleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff'
  },
  toggleCircleActive: {
    marginLeft: 24
  },
  maxBookingsContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderRadius: 10
  },
  maxBookingsSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8
  },
  maxBookingsOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center'
  },
  maxBookingsOptionActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#FFD700'
  },
  maxBookingsOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  maxBookingsOptionTextActive: {
    color: '#FFD700'
  }
});

export default MedicalProviderCalendarScreen;
