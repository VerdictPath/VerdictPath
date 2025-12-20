import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, Modal, Platform, FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const APPOINTMENT_TYPES = ['consultation', 'case_review', 'deposition', 'mediation', 'court_hearing', 'settlement_conference'];
const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
  no_show: '#6b7280'
};

const LawFirmCalendarScreen = ({ user, onNavigate, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [viewMode, setViewMode] = useState('month');
  const [availability, setAvailability] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [markedDates, setMarkedDates] = useState({});
  const [settings, setSettings] = useState(null);
  
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showCreateAppointmentModal, setShowCreateAppointmentModal] = useState(false);
  const [showAvailabilityRequestModal, setShowAvailabilityRequestModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventType: 'meeting',
    startTime: '',
    endTime: '',
    reminderEnabled: true,
    selectedClientId: ''
  });

  const EVENT_TYPES = [
    { value: 'meeting', label: 'Meeting', emoji: '👥' },
    { value: 'court_date', label: 'Court Date', emoji: '⚖️' },
    { value: 'deposition', label: 'Deposition', emoji: '📄' },
    { value: 'deadline', label: 'Deadline', emoji: '⏰' },
    { value: 'reminder', label: 'Reminder', emoji: '🔔' }
  ];

  const EVENT_TYPE_COLORS = {
    meeting: '#3498db',
    court_date: '#e74c3c',
    deposition: '#9b59b6',
    deadline: '#f39c12',
    reminder: '#1abc9c'
  };
  
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    bufferMinutes: 15,
    meetingType: 'consultation'
  });
  
  const [selectedDays, setSelectedDays] = useState([1, 2, 3, 4, 5]);
  const [isRecurring, setIsRecurring] = useState(true);
  const [bulkMode, setBulkMode] = useState(true);
  
  const [newBlockedTime, setNewBlockedTime] = useState({
    startDate: moment().format('YYYY-MM-DD'),
    endDate: moment().format('YYYY-MM-DD'),
    reason: '',
    blockType: 'personal',
    isAllDay: true
  });

  const [newAppointment, setNewAppointment] = useState({
    clientId: '',
    appointmentDate: moment().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '09:30',
    appointmentType: 'consultation',
    title: '',
    description: '',
    location: '',
    meetingModality: 'in_person'
  });

  const [newAvailabilityRequest, setNewAvailabilityRequest] = useState({
    clientId: '',
    title: '',
    description: '',
    appointmentType: 'consultation',
    priority: 'normal',
    minDurationMinutes: 30
  });

  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [showClientDropdownAvailability, setShowClientDropdownAvailability] = useState(false);
  const [showClientPickerEvent, setShowClientPickerEvent] = useState(false);
  const [clientSearchEvent, setClientSearchEvent] = useState('');

  const sortedClients = useMemo(() => {
    return [...clients].sort((a, b) => {
      const lastNameA = (a.last_name || a.lastName || '').toLowerCase();
      const lastNameB = (b.last_name || b.lastName || '').toLowerCase();
      const firstNameA = (a.first_name || a.firstName || '').toLowerCase();
      const firstNameB = (b.first_name || b.firstName || '').toLowerCase();
      const lastNameCompare = lastNameA.localeCompare(lastNameB);
      if (lastNameCompare !== 0) return lastNameCompare;
      return firstNameA.localeCompare(firstNameB);
    });
  }, [clients]);

  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return sortedClients;
    const search = clientSearch.toLowerCase().trim();
    return sortedClients.filter((client) => {
      const firstName = (client.first_name || client.firstName || '').toLowerCase();
      const lastName = (client.last_name || client.lastName || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      const reverseName = `${lastName} ${firstName}`;
      return firstName.includes(search) || lastName.includes(search) || 
             fullName.includes(search) || reverseName.includes(search);
    });
  }, [sortedClients, clientSearch]);

  const filteredClientsEvent = useMemo(() => {
    if (!clientSearchEvent.trim()) return sortedClients;
    const search = clientSearchEvent.toLowerCase().trim();
    return sortedClients.filter((client) => {
      const firstName = (client.first_name || client.firstName || '').toLowerCase();
      const lastName = (client.last_name || client.lastName || '').toLowerCase();
      const email = (client.email || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`;
      return firstName.includes(search) || lastName.includes(search) || 
             fullName.includes(search) || email.includes(search);
    });
  }, [sortedClients, clientSearchEvent]);

  const getClientDisplayName = (client) => {
    const firstName = client.first_name || client.firstName || '';
    const lastName = client.last_name || client.lastName || '';
    return `${lastName}, ${firstName}`;
  };

  const getSelectedClientName = (clientId) => {
    const client = clients.find(c => c.id === clientId);
    return client ? getClientDisplayName(client) : 'Select a client...';
  };

  const lawFirmId = user?.lawFirmId || user?.id;

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
        fetchClients()
      ]);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailability = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/availability`,
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
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/blocked-times`,
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
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/appointments`,
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
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/calendar-settings`,
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

  const fetchClients = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/lawfirm/clients`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
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
          `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/availability`,
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
          bufferMinutes: 15,
          meetingType: 'consultation'
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
                `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/availability/${availabilityId}`,
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
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/block-time`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            startDatetime: `${newBlockedTime.startDate}T00:00:00`,
            endDatetime: `${newBlockedTime.endDate}T23:59:59`,
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
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/blocked-times/${blockId}`,
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
    if (!newEvent.title || !newEvent.startTime) {
      Alert.alert('Error', 'Please enter a title and start time');
      return;
    }

    const parsedStartTime = new Date(newEvent.startTime.replace(' ', 'T'));
    if (isNaN(parsedStartTime.getTime())) {
      Alert.alert('Error', 'Invalid start time format. Use YYYY-MM-DD HH:MM');
      return;
    }

    let parsedEndTime = parsedStartTime;
    if (newEvent.endTime) {
      parsedEndTime = new Date(newEvent.endTime.replace(' ', 'T'));
      if (isNaN(parsedEndTime.getTime())) {
        Alert.alert('Error', 'Invalid end time format. Use YYYY-MM-DD HH:MM');
        return;
      }
    } else {
      parsedEndTime = new Date(parsedStartTime.getTime() + 60 * 60 * 1000);
    }

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
          share_with_client_id: newEvent.selectedClientId || null
        })
      });

      if (response.ok) {
        Alert.alert('Success', 'Event created successfully!');
        setShowAddEventModal(false);
        setNewEvent({
          title: '',
          description: '',
          location: '',
          eventType: 'meeting',
          startTime: '',
          endTime: '',
          reminderEnabled: true,
          selectedClientId: ''
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

  const handleCreateAppointment = async () => {
    if (!newAppointment.clientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/appointments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newAppointment)
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Appointment created successfully!');
        setShowCreateAppointmentModal(false);
        fetchAppointments();
        setNewAppointment({
          clientId: '',
          appointmentDate: moment().format('YYYY-MM-DD'),
          startTime: '09:00',
          endTime: '09:30',
          appointmentType: 'consultation',
          title: '',
          description: '',
          location: '',
          meetingModality: 'in_person'
        });
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to create appointment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create appointment');
    }
  };

  const handleSendAvailabilityRequest = async () => {
    if (!newAvailabilityRequest.clientId) {
      Alert.alert('Error', 'Please select a client');
      return;
    }
    if (!newAvailabilityRequest.title) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/availability-requests`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newAvailabilityRequest)
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Availability request sent to client!');
        setShowAvailabilityRequestModal(false);
        setNewAvailabilityRequest({
          clientId: '',
          title: '',
          description: '',
          appointmentType: 'consultation',
          priority: 'normal',
          minDurationMinutes: 30
        });
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to send request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send request');
    }
  };

  const handleUpdateSettings = async (newSettings) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/calendar-settings`,
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

  const handleConfirmAppointment = async (appointmentId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/appointments/${appointmentId}/confirm`,
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
        `${API_BASE_URL}/api/law-firm-calendar/appointments/${appointmentId}/cancel`,
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
        `${API_BASE_URL}/api/law-firm-calendar/appointments/${appointmentId}/complete`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ firmNotes: notes })
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
          <Text style={styles.headerIcon}>⛵</Text>
        </TouchableOpacity>
        <Text style={styles.headerIcon}>⚖️</Text>
        <Text style={styles.headerTitle}>Client Calendars</Text>
        <TouchableOpacity onPress={onBack} style={styles.minimizeButton}>
          <Text style={styles.headerIcon}>➖</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.headerSubtitle}>Manage Your Schedule</Text>
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
          <Text style={[styles.viewModeIcon, viewMode === mode && styles.viewModeIconActive]}>
            {mode === 'month' ? '📅' : mode === 'week' ? '📆' : '📋'}
          </Text>
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
        <Text style={styles.actionIcon}>🕐</Text>
        <Text style={styles.actionButtonText}>Set Hours</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowBlockTimeModal(true)}>
        <Text style={styles.actionIcon}>🚫</Text>
        <Text style={styles.actionButtonText}>Block Time</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowCreateAppointmentModal(true)}>
        <Text style={styles.actionIcon}>📅</Text>
        <Text style={styles.actionButtonText}>New Appt</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowAddEventModal(true)}>
        <Text style={styles.actionIcon}>⭐</Text>
        <Text style={styles.actionButtonText}>Add Event</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettingsModal(true)}>
        <Text style={styles.actionIcon}>⚙️</Text>
        <Text style={styles.actionButtonText}>Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderSecondaryActions = () => (
    <View style={styles.secondaryActions}>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowAvailabilityRequestModal(true)}>
        <Text style={styles.secondaryIcon}>📨</Text>
        <Text style={styles.secondaryButtonText}>Request Client Availability</Text>
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
          textSectionTitleColor: '#C0C0C0',
          selectedDayBackgroundColor: '#1a5490',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#C0C0C0',
          dayTextColor: '#ffffff',
          textDisabledColor: '#666',
          monthTextColor: '#C0C0C0',
          arrowColor: '#C0C0C0',
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
          <Text style={styles.dayViewIcon}>⭐</Text>
          <Text style={styles.dayViewTitle}>
            {moment(selectedDate).format('dddd, MM/DD/YYYY')}
          </Text>
        </View>

        {!dayAvailability ? (
          <View style={styles.noAvailabilityContainer}>
            <Text style={styles.noAvailabilityIcon}>📅</Text>
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
                  <Text style={styles.slotIcon}>
                    {slot.appointment ? '✅' : slot.blocked ? '🚫' : '📅'}
                  </Text>
                  {slot.appointment ? (
                    <View style={styles.appointmentInfo}>
                      <Text style={styles.appointmentClientName}>
                        {slot.appointment.client_first_name} {slot.appointment.client_last_name}
                      </Text>
                      <Text style={styles.appointmentTypeText}>
                        {slot.appointment.appointment_type || 'Consultation'}
                      </Text>
                    </View>
                  ) : slot.blocked ? (
                    <Text style={styles.slotLabel}>Blocked - {slot.blocked.reason || 'Unavailable'}</Text>
                  ) : (
                    <Text style={styles.slotLabel}>Available</Text>
                  )}
                </View>

                {slot.appointment && (
                  <Text style={[styles.slotStatusIcon, { color: slot.appointment.status === 'confirmed' ? '#10b981' : '#f59e0b' }]}>
                    {slot.appointment.status === 'confirmed' ? '✓' : '🕐'}
                  </Text>
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

  const renderCurrentAvailability = () => (
    <View style={styles.availabilitySection}>
      <Text style={styles.sectionTitle}>Current Availability</Text>
      {availability.length === 0 ? (
        <Text style={styles.noDataText}>No availability configured</Text>
      ) : (
        availability.map((avail, index) => (
          <View key={index} style={styles.availabilityItem}>
            <View style={styles.availabilityInfo}>
              <Text style={styles.availabilityDay}>{DAYS_OF_WEEK[avail.day_of_week]}</Text>
              <Text style={styles.availabilityTime}>
                {formatTime(avail.start_time)} - {formatTime(avail.end_time)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteAvailability(avail.id)}>
              <Text style={styles.deleteIcon}>🗑️</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

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
                  `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/availability/${avail.id}`,
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
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity 
                style={[styles.modeToggleButton, bulkMode && styles.modeToggleButtonActive]}
                onPress={() => setBulkMode(true)}
              >
                <Text style={[styles.modeToggleIcon, bulkMode && styles.modeToggleIconActive]}>📆</Text>
                <Text style={[styles.modeToggleText, bulkMode && styles.modeToggleTextActive]}>Multiple Days</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modeToggleButton, !bulkMode && styles.modeToggleButtonActive]}
                onPress={() => setBulkMode(false)}
              >
                <Text style={[styles.modeToggleIcon, !bulkMode && styles.modeToggleIconActive]}>📅</Text>
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
                <Text style={[styles.checkboxIcon, isRecurring && styles.checkboxIconActive]}>
                  {isRecurring ? '☑️' : '⬜'}
                </Text>
                <View style={styles.recurringTextContainer}>
                  <Text style={styles.recurringLabel}>Repeat Weekly</Text>
                  <Text style={styles.recurringDescription}>
                    {isRecurring ? 'Schedule repeats every week' : 'One-time schedule only'}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleAddAvailability}>
              <Text style={styles.saveIcon}>💾</Text>
              <Text style={styles.saveButtonText}>
                {bulkMode ? `Save Hours for ${selectedDays.length} Day(s)` : 'Save Availability'}
              </Text>
            </TouchableOpacity>

            {availability.length > 0 && (
              <TouchableOpacity style={styles.clearAllButton} onPress={handleClearAllAvailability}>
                <Text style={styles.clearIcon}>🧹</Text>
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
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Start Date</Text>
            <TextInput
              style={styles.modalInput}
              value={newBlockedTime.startDate}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, startDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Date</Text>
            <TextInput
              style={styles.modalInput}
              value={newBlockedTime.endDate}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, endDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={newBlockedTime.reason}
              onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, reason: text })}
              placeholder="Vacation, Court, Conference, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleBlockTime}>
              <Text style={styles.saveIcon}>🚫</Text>
              <Text style={styles.saveButtonText}>Block Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderCreateAppointmentModal = () => (
    <Modal visible={showCreateAppointmentModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Appointment</Text>
            <TouchableOpacity onPress={() => setShowCreateAppointmentModal(false)}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Select Client</Text>
            <View style={styles.clientSelectorContainer}>
              <View style={styles.clientSearchContainer}>
                <Text style={styles.searchIconEmoji}>🔍</Text>
                <TextInput
                  style={styles.clientSearchInput}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  placeholder="Search clients..."
                  placeholderTextColor="#999"
                />
                {clientSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setClientSearch('')} style={styles.clearSearchButton}>
                    <Text style={styles.clearSearchIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={styles.clientDropdownButton}
                onPress={() => setShowClientDropdown(!showClientDropdown)}
              >
                <Text style={styles.clientDropdownButtonText} numberOfLines={1}>
                  {getSelectedClientName(newAppointment.clientId)}
                </Text>
                <Text style={styles.dropdownArrow}>{showClientDropdown ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {showClientDropdown && (
                <View style={styles.clientDropdownList}>
                  <FlatList
                    data={filteredClients}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.clientFlatList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.clientDropdownItem,
                          newAppointment.clientId === item.id && styles.clientDropdownItemActive
                        ]}
                        onPress={() => {
                          setNewAppointment({ ...newAppointment, clientId: item.id });
                          setShowClientDropdown(false);
                          setClientSearch('');
                        }}
                      >
                        <Text style={[
                          styles.clientDropdownItemText,
                          newAppointment.clientId === item.id && styles.clientDropdownItemTextActive
                        ]}>
                          {getClientDisplayName(item)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noClientsText}>No clients found</Text>
                    }
                  />
                </View>
              )}
            </View>

            <Text style={styles.modalLabel}>Date</Text>
            <TextInput
              style={styles.modalInput}
              value={newAppointment.appointmentDate}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, appointmentDate: text })}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.modalLabel}>Start Time</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newAppointment.startTime}
                  onChangeText={(text) => setNewAppointment({ ...newAppointment, startTime: text })}
                  placeholder="09:00"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.modalLabel}>End Time</Text>
                <TextInput
                  style={styles.modalInput}
                  value={newAppointment.endTime}
                  onChangeText={(text) => setNewAppointment({ ...newAppointment, endTime: text })}
                  placeholder="09:30"
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newAppointment.title}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, title: text })}
              placeholder="Meeting title"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={newAppointment.description}
              onChangeText={(text) => setNewAppointment({ ...newAppointment, description: text })}
              placeholder="Meeting details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleCreateAppointment}>
              <Text style={styles.saveIcon}>📅</Text>
              <Text style={styles.saveButtonText}>Create Appointment</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAvailabilityRequestModal = () => (
    <Modal visible={showAvailabilityRequestModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Request Client Availability</Text>
            <TouchableOpacity onPress={() => setShowAvailabilityRequestModal(false)}>
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Select Client</Text>
            <View style={styles.clientSelectorContainer}>
              <View style={styles.clientSearchContainer}>
                <Text style={styles.searchIconEmoji}>🔍</Text>
                <TextInput
                  style={styles.clientSearchInput}
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  placeholder="Search clients..."
                  placeholderTextColor="#999"
                />
                {clientSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setClientSearch('')} style={styles.clearSearchButton}>
                    <Text style={styles.clearSearchIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity 
                style={styles.clientDropdownButton}
                onPress={() => setShowClientDropdownAvailability(!showClientDropdownAvailability)}
              >
                <Text style={styles.clientDropdownButtonText} numberOfLines={1}>
                  {getSelectedClientName(newAvailabilityRequest.clientId)}
                </Text>
                <Text style={styles.dropdownArrow}>{showClientDropdownAvailability ? "▲" : "▼"}</Text>
              </TouchableOpacity>
              {showClientDropdownAvailability && (
                <View style={styles.clientDropdownList}>
                  <FlatList
                    data={filteredClients}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.clientFlatList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.clientDropdownItem,
                          newAvailabilityRequest.clientId === item.id && styles.clientDropdownItemActive
                        ]}
                        onPress={() => {
                          setNewAvailabilityRequest({ ...newAvailabilityRequest, clientId: item.id });
                          setShowClientDropdownAvailability(false);
                          setClientSearch('');
                        }}
                      >
                        <Text style={[
                          styles.clientDropdownItemText,
                          newAvailabilityRequest.clientId === item.id && styles.clientDropdownItemTextActive
                        ]}>
                          {getClientDisplayName(item)}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.noClientsText}>No clients found</Text>
                    }
                  />
                </View>
              )}
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newAvailabilityRequest.title}
              onChangeText={(text) => setNewAvailabilityRequest({ ...newAvailabilityRequest, title: text })}
              placeholder="e.g., Schedule Case Review"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={newAvailabilityRequest.description}
              onChangeText={(text) => setNewAvailabilityRequest({ ...newAvailabilityRequest, description: text })}
              placeholder="Details about the meeting..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.prioritySelector}>
              {['normal', 'high', 'urgent'].map((priority) => (
                <TouchableOpacity
                  key={priority}
                  style={[styles.priorityOption, newAvailabilityRequest.priority === priority && styles.priorityOptionActive]}
                  onPress={() => setNewAvailabilityRequest({ ...newAvailabilityRequest, priority })}
                >
                  <Text style={[styles.priorityOptionText, newAvailabilityRequest.priority === priority && styles.priorityOptionTextActive]}>
                    {priority.charAt(0).toUpperCase() + priority.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={handleSendAvailabilityRequest}>
              <Text style={styles.saveIcon}>📨</Text>
              <Text style={styles.saveButtonText}>Send Request</Text>
            </TouchableOpacity>
          </ScrollView>
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
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {selectedAppointment && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.appointmentDetailCard}>
                <Text style={styles.appointmentDetailIcon}>👤</Text>
                <Text style={styles.appointmentDetailName}>
                  {selectedAppointment.client_first_name} {selectedAppointment.client_last_name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedAppointment.status] }]}>
                  <Text style={styles.statusBadgeText}>{selectedAppointment.status}</Text>
                </View>
              </View>

              <View style={styles.appointmentDetailRow}>
                <Text style={styles.detailRowIcon}>🕐</Text>
                <Text style={styles.appointmentDetailText}>
                  {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
                </Text>
              </View>

              <View style={styles.appointmentDetailRow}>
                <Text style={styles.detailRowIcon}>💼</Text>
                <Text style={styles.appointmentDetailText}>
                  {selectedAppointment.appointment_type || 'Consultation'}
                </Text>
              </View>

              {selectedAppointment.title && (
                <View style={styles.appointmentDetailRow}>
                  <Text style={styles.detailRowIcon}>📝</Text>
                  <Text style={styles.appointmentDetailText}>{selectedAppointment.title}</Text>
                </View>
              )}

              {selectedAppointment.description && (
                <View style={styles.appointmentDetailRow}>
                  <Text style={styles.detailRowIcon}>📄</Text>
                  <Text style={styles.appointmentDetailText}>{selectedAppointment.description}</Text>
                </View>
              )}

              <View style={styles.appointmentActions}>
                {selectedAppointment.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#10b981' }]}
                    onPress={() => handleConfirmAppointment(selectedAppointment.id)}
                  >
                    <Text style={styles.actionButtonIcon}>✓</Text>
                    <Text style={styles.appointmentActionText}>Confirm</Text>
                  </TouchableOpacity>
                )}

                {selectedAppointment.status === 'confirmed' && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#6366f1' }]}
                    onPress={() => handleCompleteAppointment(selectedAppointment.id, '')}
                  >
                    <Text style={styles.actionButtonIcon}>✓✓</Text>
                    <Text style={styles.appointmentActionText}>Complete</Text>
                  </TouchableOpacity>
                )}

                {['pending', 'confirmed'].includes(selectedAppointment.status) && (
                  <TouchableOpacity
                    style={[styles.appointmentActionButton, { backgroundColor: '#ef4444' }]}
                    onPress={() => handleCancelAppointment(selectedAppointment.id, 'Cancelled by firm')}
                  >
                    <Text style={styles.actionButtonIcon}>✕</Text>
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
              <Text style={styles.modalCloseIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>Multi-Booking Settings</Text>
              <Text style={styles.settingsDescription}>
                Allow multiple clients to book the same time slot. Useful for group sessions or parallel consultations.
              </Text>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Text style={styles.settingsIcon}>👥</Text>
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
                    Maximum number of clients that can book the same time slot
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
                  <Text style={styles.settingsIcon}>📧</Text>
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
                  <Text style={styles.settingsIcon}>💬</Text>
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
                  <Text style={styles.settingsIcon}>✅</Text>
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
              <Text style={styles.modalCloseIcon}>✕</Text>
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
                    <Text style={[
                      styles.eventTypeEmoji,
                      newEvent.eventType === type.value && { opacity: 1 }
                    ]}>
                      {type.emoji}
                    </Text>
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
              <Text style={styles.modalLabel}>Share with Client</Text>
              <Text style={styles.settingsDescription}>
                Select a client to automatically add this event to their calendar
              </Text>
              <TouchableOpacity
                style={styles.clientPickerButton}
                onPress={() => setShowClientPickerEvent(!showClientPickerEvent)}
              >
                <View style={styles.clientPickerContent}>
                  <Text style={styles.clientPickerIcon}>
                    {newEvent.selectedClientId ? '👤' : '🚫'}
                  </Text>
                  <Text style={[
                    styles.clientPickerText,
                    newEvent.selectedClientId && styles.clientPickerTextSelected
                  ]}>
                    {newEvent.selectedClientId 
                      ? (() => {
                          const selected = clients.find(c => c.id === newEvent.selectedClientId);
                          return selected ? `${selected.first_name || selected.firstName} ${selected.last_name || selected.lastName}` : 'Select Client';
                        })()
                      : "Don't Share"
                    }
                  </Text>
                </View>
                <Text style={styles.dropdownIconClient}>{showClientPickerEvent ? '▲' : '▼'}</Text>
              </TouchableOpacity>

              {showClientPickerEvent && (
                <View style={styles.clientDropdown}>
                  <View style={styles.clientSearchContainer}>
                    <Text style={styles.searchIconEmoji}>🔍</Text>
                    <TextInput
                      style={styles.clientSearchInputDropdown}
                      placeholder="Search clients..."
                      placeholderTextColor="#999"
                      value={clientSearchEvent}
                      onChangeText={setClientSearchEvent}
                      autoCapitalize="none"
                    />
                    {clientSearchEvent.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearchEvent('')}>
                        <Text style={styles.clearSearchIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <ScrollView style={styles.clientDropdownList} nestedScrollEnabled={true}>
                    <TouchableOpacity
                      style={[
                        styles.clientDropdownItem,
                        !newEvent.selectedClientId && styles.clientDropdownItemSelected
                      ]}
                      onPress={() => {
                        setNewEvent({ ...newEvent, selectedClientId: '' });
                        setShowClientPickerEvent(false);
                        setClientSearchEvent('');
                      }}
                    >
                      <Text style={styles.clientItemIcon}>🚫</Text>
                      <Text style={[
                        styles.clientDropdownItemText,
                        !newEvent.selectedClientId && styles.clientDropdownItemTextSelected
                      ]}>
                        Don't Share
                      </Text>
                    </TouchableOpacity>
                    
                    {filteredClientsEvent.length === 0 && clientSearchEvent ? (
                      <View style={styles.noResultsContainer}>
                        <Text style={styles.noResultsText}>No clients found matching "{clientSearchEvent}"</Text>
                      </View>
                    ) : (
                      filteredClientsEvent.map((client) => (
                        <TouchableOpacity
                          key={client.id}
                          style={[
                            styles.clientDropdownItem,
                            newEvent.selectedClientId === client.id && styles.clientDropdownItemSelected
                          ]}
                          onPress={() => {
                            setNewEvent({ ...newEvent, selectedClientId: client.id });
                            setShowClientPickerEvent(false);
                            setClientSearchEvent('');
                          }}
                        >
                          <Text style={styles.clientItemIcon}>👤</Text>
                          <View style={styles.clientDropdownItemInfo}>
                            <Text style={[
                              styles.clientDropdownItemText,
                              newEvent.selectedClientId === client.id && styles.clientDropdownItemTextSelected
                            ]}>
                              {client.first_name || client.firstName} {client.last_name || client.lastName}
                            </Text>
                            {client.email && (
                              <Text style={styles.clientDropdownItemEmail}>{client.email}</Text>
                            )}
                          </View>
                          {newEvent.selectedClientId === client.id && (
                            <Text style={styles.checkIcon}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>Start Date & Time *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD HH:MM (e.g., 2025-01-15 09:00)"
                placeholderTextColor="#999"
                value={newEvent.startTime}
                onChangeText={(text) => setNewEvent({ ...newEvent, startTime: text })}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.modalLabel}>End Date & Time (Optional)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="YYYY-MM-DD HH:MM (defaults to 1 hour after start)"
                placeholderTextColor="#999"
                value={newEvent.endTime}
                onChangeText={(text) => setNewEvent({ ...newEvent, endTime: text })}
              />
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
                <Text style={styles.settingsIcon}>🔔</Text>
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
              <Text style={styles.saveIcon}>✓</Text>
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
          <ActivityIndicator size="large" color="#C0C0C0" />
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
      {renderSecondaryActions()}
      
      <ScrollView style={styles.scrollView}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {renderCurrentAvailability()}
        {renderLegend()}
      </ScrollView>

      {renderAvailabilityModal()}
      {renderBlockTimeModal()}
      {renderCreateAppointmentModal()}
      {renderAvailabilityRequestModal()}
      {renderAppointmentModal()}
      {renderSettingsModal()}
      {renderAddEventModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1E3A5F'
  },
  header: {
    backgroundColor: '#152d4a',
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#C0C0C0',
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
    borderColor: '#C0C0C0'
  },
  viewModeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  viewModeTextActive: {
    color: '#C0C0C0',
    fontWeight: 'bold'
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 8,
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
    borderColor: 'rgba(192, 192, 192, 0.3)'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600'
  },
  secondaryActions: {
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)'
  },
  secondaryButtonText: {
    color: '#C0C0C0',
  },
  headerIcon: {
    fontSize: 24,
    color: '#C0C0C0',
  },
  viewModeIcon: {
    fontSize: 18,
  },
  viewModeIconActive: {
    opacity: 1,
  },
  actionIcon: {
    fontSize: 18,
  },
  secondaryIcon: {
    fontSize: 16,
  },
  dayViewIcon: {
    fontSize: 22,
    color: '#C0C0C0',
  },
  noAvailabilityIcon: {
    fontSize: 44,
    color: '#666',
    marginBottom: 12,
  },
  slotIcon: {
    fontSize: 22,
    color: '#fff',
  },
  slotStatusIcon: {
    fontSize: 18,
  },
  deleteIcon: {
    fontSize: 18,
  },
  modalCloseIcon: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  modeToggleIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  modeToggleIconActive: {
    opacity: 1,
  },
  checkboxIcon: {
    fontSize: 22,
  },
  checkboxIconActive: {
    opacity: 1,
  },
  saveIcon: {
    fontSize: 18,
    marginRight: 2,
  },
  clearIcon: {
    fontSize: 18,
    marginRight: 2,
  },
  searchIconEmoji: {
    fontSize: 18,
    color: '#999',
  },
  clearSearchIcon: {
    fontSize: 16,
    color: '#999',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#C0C0C0',
  },
  appointmentDetailIcon: {
    fontSize: 36,
    color: '#C0C0C0',
    marginBottom: 8,
  },
  detailRowIcon: {
    fontSize: 18,
    color: '#C0C0C0',
    marginRight: 8,
  },
  actionButtonIcon: {
    fontSize: 16,
    color: '#fff',
  },
  settingsIcon: {
    fontSize: 22,
    color: '#C0C0C0',
    marginRight: 4,
  },
  eventTypeEmoji: {
    fontSize: 18,
    opacity: 0.7,
  },
  clientPickerIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  clientItemIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  checkIcon: {
    fontSize: 18,
    color: '#C0C0C0',
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
    borderColor: 'rgba(192, 192, 192, 0.2)'
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
    borderColor: 'rgba(192, 192, 192, 0.3)'
  },
  dayViewTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C0C0C0'
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
  appointmentClientName: {
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
    borderColor: 'rgba(192, 192, 192, 0.2)',
    marginBottom: 8
  },
  weekDaySelected: {
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderColor: '#C0C0C0'
  },
  weekDayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  weekDayName: {
    color: '#C0C0C0',
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
  availabilitySection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.2)'
  },
  sectionTitle: {
    color: '#C0C0C0',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  noDataText: {
    color: '#999',
    fontSize: 14,
    fontStyle: 'italic'
  },
  availabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    marginBottom: 8
  },
  availabilityInfo: {
    flex: 1
  },
  availabilityDay: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  availabilityTime: {
    color: '#999',
    fontSize: 13,
    marginTop: 2
  },
  legendContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.2)'
  },
  legendTitle: {
    color: '#C0C0C0',
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
    backgroundColor: '#1E3A5F',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    borderTopWidth: 2,
    borderColor: '#C0C0C0'
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.2)'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#C0C0C0'
  },
  modalContent: {
    padding: 20
  },
  modalLabel: {
    color: '#C0C0C0',
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
    borderColor: 'rgba(192, 192, 192, 0.3)',
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
    fontWeight: '500'
  },
  clientScrollView: {
    marginTop: 8
  },
  clientChip: {
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
  clientChipSelected: {
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
    borderColor: '#C0C0C0'
  },
  clientChipText: {
    color: '#999',
    fontSize: 13
  },
  clientChipTextSelected: {
    color: '#C0C0C0',
    fontWeight: '600'
  },
  clientPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginTop: 8
  },
  clientPickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  clientPickerText: {
    color: '#999',
    fontSize: 15
  },
  clientPickerTextSelected: {
    color: '#C0C0C0',
    fontWeight: '600'
  },
  dropdownIconClient: {
    color: '#C0C0C0',
    fontSize: 14
  },
  clientDropdown: {
    marginTop: 8,
    backgroundColor: 'rgba(30, 30, 30, 0.98)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    maxHeight: 250,
    overflow: 'hidden'
  },
  clientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8
  },
  clientSearchInputDropdown: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    paddingVertical: 4
  },
  clientDropdownList: {
    maxHeight: 200
  },
  clientDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)'
  },
  clientDropdownItemSelected: {
    backgroundColor: 'rgba(192, 192, 192, 0.15)'
  },
  clientDropdownItemInfo: {
    flex: 1
  },
  clientDropdownItemText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },
  clientDropdownItemTextSelected: {
    color: '#C0C0C0'
  },
  clientDropdownItemEmail: {
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
    borderColor: '#C0C0C0'
  },
  dayButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500'
  },
  dayButtonTextActive: {
    color: '#C0C0C0',
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
    borderColor: '#C0C0C0'
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
    backgroundColor: 'rgba(192, 192, 192, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    alignItems: 'center'
  },
  presetButtonText: {
    color: '#C0C0C0',
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
    borderColor: 'rgba(192, 192, 192, 0.3)',
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
  clientSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  clientSelectorContainer: {
    marginBottom: 8
  },
  clientSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8
  },
  searchIcon: {
    marginRight: 8
  },
  clientSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 12
  },
  clearSearchButton: {
    padding: 4
  },
  clientDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 12,
    padding: 12
  },
  clientDropdownButtonText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
    marginRight: 8
  },
  clientDropdownList: {
    marginTop: 4,
    backgroundColor: 'rgba(26, 84, 144, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.5)',
    borderRadius: 12,
    maxHeight: 200,
    overflow: 'hidden'
  },
  clientFlatList: {
    maxHeight: 200
  },
  clientDropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  clientDropdownItemActive: {
    backgroundColor: 'rgba(192, 192, 192, 0.2)'
  },
  clientDropdownItemText: {
    color: '#fff',
    fontSize: 15
  },
  clientDropdownItemTextActive: {
    color: '#C0C0C0',
    fontWeight: 'bold'
  },
  noClientsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    padding: 16
  },
  clientOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  clientOptionActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#C0C0C0'
  },
  clientOptionText: {
    color: '#fff',
    fontSize: 13
  },
  clientOptionTextActive: {
    color: '#C0C0C0',
    fontWeight: 'bold'
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center'
  },
  priorityOptionActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#C0C0C0'
  },
  priorityOptionText: {
    color: '#fff',
    fontSize: 13
  },
  priorityOptionTextActive: {
    color: '#C0C0C0',
    fontWeight: 'bold'
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
    borderColor: '#C0C0C0'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
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
    borderColor: 'rgba(192, 192, 192, 0.2)'
  },
  settingsSectionTitle: {
    color: '#C0C0C0',
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
    borderColor: '#C0C0C0'
  },
  maxBookingsOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  maxBookingsOptionTextActive: {
    color: '#C0C0C0'
  }
});

export default LawFirmCalendarScreen;
