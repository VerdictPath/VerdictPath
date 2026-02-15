import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
 View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
 TextInput, Modal, Platform, FlatList, useWindowDimensions
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import alert from '../utils/alert';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';
import DatePickerInput from '../components/DatePickerInput';
import TimePickerInput from '../components/TimePickerInput';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const APPOINTMENT_TYPES = ['consultation', 'case_review', 'deposition', 'mediation', 'court_hearing', 'settlement_conference'];

const formatDateUSA = (isoDate) => {
  if (!isoDate) return '';
  return moment(isoDate, 'YYYY-MM-DD').format('MM/DD/YYYY');
};

const parseUSADate = (usaDate) => {
  if (!usaDate) return '';
  const parsed = moment(usaDate, 'MM/DD/YYYY', true);
  if (parsed.isValid()) {
    return parsed.format('YYYY-MM-DD');
  }
  return usaDate;
};
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
  const [calendarEvents, setCalendarEvents] = useState([]);

  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventType: 'meeting',
    eventDate: moment().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '10:00',
    reminderEnabled: true,
    selectedClientId: ''
  });

  const EVENT_TYPES = [
    { value: 'meeting', label: 'Meeting', emoji: '👥' },
    { value: 'court_date', label: 'Court Date', emoji: '⚖️' },
    { value: 'deposition', label: 'Deposition', emoji: '📄' },
    { value: 'mediation', label: 'Mediation', emoji: '🤝' },
    { value: 'deadline', label: 'Deadline', emoji: '⏰' },
    { value: 'reminder', label: 'Reminder', emoji: '🔔' }
  ];

  const EVENT_TYPE_COLORS = {
    meeting: '#3498db',
    court_date: '#e74c3c',
    deposition: '#9b59b6',
    mediation: '#27ae60',
    deadline: '#f39c12',
    reminder: '#1abc9c'
  };

  const EVENT_TYPES_ER = [
    { value: 'deposition', label: 'Deposition', icon: '📝' },
    { value: 'mediation', label: 'Mediation', icon: '🤝' },
    { value: 'consultation', label: 'Consultation', icon: '💬' },
    { value: 'court_date', label: 'Court Date', icon: '⚖️' },
  ];
  const DURATION_OPTIONS_ER = [
    { value: '30', label: '30 min' },
    { value: '60', label: '1 hour' },
    { value: '90', label: '1.5 hours' },
    { value: '120', label: '2 hours' },
    { value: '180', label: '3 hours' },
  ];
  const LOCATION_OPTIONS_ER = [
    { value: 'Virtual', label: 'Virtual', icon: '💻' },
    { value: 'Office', label: 'Office', icon: '🏢' },
    { value: 'Courthouse', label: 'Courthouse', icon: '🏛️' },
  ];
  const generateTimeSlotsER = () => {
    const slots = [];
    for (let h = 7; h <= 20; h++) {
      for (let m = 0; m < 60; m += 30) {
        const hour12 = h % 12 || 12;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const label = `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
        slots.push({ hours: h, minutes: m, label });
      }
    }
    return slots;
  };
  const TIME_SLOTS_ER = generateTimeSlotsER();

  const { width: windowWidth } = useWindowDimensions();
  const isDesktopER = windowWidth >= 1024;
  
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

  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictEvents, setConflictEvents] = useState([]);
  const [pendingEventAction, setPendingEventAction] = useState(null);

  const getDefaultDateTimeER = (daysFromNow, hour) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);
    return date;
  };

  const [selectedClientER, setSelectedClientER] = useState(null);
  const [eventTypeER, setEventTypeER] = useState('deposition');
  const [titleER, setTitleER] = useState('Deposition');
  const [descriptionER, setDescriptionER] = useState('');
  const [locationER, setLocationER] = useState('Office');
  const [durationMinutesER, setDurationMinutesER] = useState('60');
  const [notesER, setNotesER] = useState('');
  const [clientSearchQueryER, setClientSearchQueryER] = useState('');
  const [showClientDropdownER, setShowClientDropdownER] = useState(false);
  const [showTimeDropdownER, setShowTimeDropdownER] = useState({ visible: false, index: -1 });
  const [showLocationDropdownER, setShowLocationDropdownER] = useState(false);
  const [dateTimeOptionsER, setDateTimeOptionsER] = useState([
    { date: getDefaultDateTimeER(7, 10), startTime: getDefaultDateTimeER(7, 10) },
    { date: getDefaultDateTimeER(8, 14), startTime: getDefaultDateTimeER(8, 14) },
    { date: getDefaultDateTimeER(9, 10), startTime: getDefaultDateTimeER(9, 10) },
    { date: getDefaultDateTimeER(10, 14), startTime: getDefaultDateTimeER(10, 14) }
  ]);
  const [showDatePickerER, setShowDatePickerER] = useState({ visible: false, index: -1, type: 'date' });
  const [submittingER, setSubmittingER] = useState(false);
  
  const TIME_SLOTS = [
    { label: '8:00 AM', value: '08:00' },
    { label: '8:30 AM', value: '08:30' },
    { label: '9:00 AM', value: '09:00' },
    { label: '9:30 AM', value: '09:30' },
    { label: '10:00 AM', value: '10:00' },
    { label: '10:30 AM', value: '10:30' },
    { label: '11:00 AM', value: '11:00' },
    { label: '11:30 AM', value: '11:30' },
    { label: '12:00 PM', value: '12:00' },
    { label: '12:30 PM', value: '12:30' },
    { label: '1:00 PM', value: '13:00' },
    { label: '1:30 PM', value: '13:30' },
    { label: '2:00 PM', value: '14:00' },
    { label: '2:30 PM', value: '14:30' },
    { label: '3:00 PM', value: '15:00' },
    { label: '3:30 PM', value: '15:30' },
    { label: '4:00 PM', value: '16:00' },
    { label: '4:30 PM', value: '16:30' },
    { label: '5:00 PM', value: '17:00' },
    { label: '5:30 PM', value: '17:30' },
    { label: '6:00 PM', value: '18:00' }
  ];
  
  const getTimeLabel = (value) => {
    const slot = TIME_SLOTS.find(s => s.value === value);
    return slot ? slot.label : value;
  };

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
        fetchClients(),
        fetchCalendarEvents()
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

  const fetchCalendarEvents = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/calendar/events`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    }
  };

  useEffect(() => {
    const marked = {};
    
    appointments.forEach(appt => {
      const date = appt.appointment_date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      const color = appt.status === 'confirmed' ? '#10b981' : 
                    appt.status === 'pending' ? '#f59e0b' : '#6b7280';
      marked[date].dots.push({ key: `appt-${appt.id}`, color });
    });

    blockedTimes.forEach(block => {
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

    calendarEvents.forEach(evt => {
      const date = moment(evt.start_time).format('YYYY-MM-DD');
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      const color = evt.is_shared ? '#8b5cf6' : (EVENT_TYPE_COLORS[evt.event_type] || '#3498db');
      marked[date].dots.push({ key: `evt-${evt.id}`, color });
    });

    setMarkedDates(marked);
  }, [appointments, blockedTimes, calendarEvents]);

  const handleAddAvailability = async () => {
    try {
      const daysToAdd = bulkMode ? selectedDays : [newAvailability.dayOfWeek];
      
      if (daysToAdd.length === 0) {
        alert('Error', 'Please select at least one day');
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
        alert('Success', `Availability set for ${successCount} day(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
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
        alert('Error', 'Failed to add availability for any days');
      }
    } catch (error) {
      alert('Error', 'Failed to add availability');
    }
  };

  const handleDeleteAvailability = async (availabilityId) => {
    alert(
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
              alert('Error', 'Failed to delete availability');
            }
          }
        }
      ]
    );
  };

  const handleBlockTime = async () => {
    if (!newBlockedTime.startDate || !newBlockedTime.endDate) {
      alert('Error', 'Please select start and end dates');
      return;
    }
    
    const isoStartDate = parseUSADate(newBlockedTime.startDate);
    const isoEndDate = parseUSADate(newBlockedTime.endDate);
    
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
            startDatetime: `${isoStartDate}T00:00:00`,
            endDatetime: `${isoEndDate}T23:59:59`,
            reason: newBlockedTime.reason,
            blockType: newBlockedTime.blockType,
            isAllDay: newBlockedTime.isAllDay
          })
        }
      );
      if (response.ok) {
        alert('Success', 'Time blocked successfully!');
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
        alert('Error', data.error || 'Failed to block time');
      }
    } catch (error) {
      alert('Error', 'Failed to block time');
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
      alert('Error', 'Failed to remove blocked time');
    }
  };

  const checkForConflicts = async (date, startTime, endTime) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/calendar/events/check-conflicts?date=${date}&startTime=${startTime}&endTime=${endTime || startTime}`,
        {
          headers: { 'Authorization': `Bearer ${user.token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        return data;
      }
      return { hasConflicts: false, conflicts: [] };
    } catch (error) {
      console.error('Error checking conflicts:', error);
      return { hasConflicts: false, conflicts: [] };
    }
  };

  const formatConflictTime = (isoTime) => {
    if (!isoTime) return '';
    return moment(isoTime).format('h:mm A');
  };

  const proceedWithEventCreation = async () => {
    setShowConflictModal(false);
    if (pendingEventAction) {
      await pendingEventAction();
      setPendingEventAction(null);
    }
  };

  const cancelConflictAction = () => {
    setShowConflictModal(false);
    setPendingEventAction(null);
    setConflictEvents([]);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.eventDate || !newEvent.startTime) {
      alert('Error', 'Please enter a title, date, and start time');
      return;
    }

    const isoDate = parseUSADate(newEvent.eventDate);
    const startDateTime = `${isoDate}T${newEvent.startTime}`;
    const parsedStartTime = new Date(startDateTime);
    if (isNaN(parsedStartTime.getTime())) {
      alert('Error', 'Invalid date or start time format');
      return;
    }

    let parsedEndTime = parsedStartTime;
    if (newEvent.endTime) {
      const endDateTime = `${isoDate}T${newEvent.endTime}`;
      parsedEndTime = new Date(endDateTime);
      if (isNaN(parsedEndTime.getTime())) {
        alert('Error', 'Invalid end time format');
        return;
      }
    } else {
      parsedEndTime = new Date(parsedStartTime.getTime() + 60 * 60 * 1000);
    }

    const conflictData = await checkForConflicts(isoDate, newEvent.startTime, newEvent.endTime);
    if (conflictData.hasConflicts) {
      setConflictEvents(conflictData.conflicts);
      setPendingEventAction(() => async () => {
        await submitEvent(parsedStartTime, parsedEndTime);
      });
      setShowConflictModal(true);
      return;
    }

    await submitEvent(parsedStartTime, parsedEndTime);
  };

  const submitEvent = async (parsedStartTime, parsedEndTime) => {
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
          share_with_client_id: newEvent.selectedClientId || null,
          send_notification: !!newEvent.selectedClientId
        })
      });

      if (response.ok) {
        const successMessage = newEvent.selectedClientId 
          ? 'Event created and notification sent to client!' 
          : 'Event created successfully!';
        alert('Success', successMessage);
        setShowAddEventModal(false);
        fetchCalendarEvents();
        setNewEvent({
          title: '',
          description: '',
          location: '',
          eventType: 'meeting',
          eventDate: moment().format('YYYY-MM-DD'),
          startTime: '09:00',
          endTime: '10:00',
          reminderEnabled: true,
          selectedClientId: ''
        });
        fetchAppointments();
      } else {
        const data = await response.json();
        alert('Error', data.error || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Error', 'Failed to create event');
    }
  };

  const handleCreateAppointment = async () => {
    if (!newAppointment.clientId) {
      alert('Error', 'Please select a client');
      return;
    }
    
    const isoAppointmentDate = parseUSADate(newAppointment.appointmentDate);
    
    const conflictData = await checkForConflicts(isoAppointmentDate, newAppointment.startTime, newAppointment.endTime);
    if (conflictData.hasConflicts) {
      setConflictEvents(conflictData.conflicts);
      setPendingEventAction(() => async () => {
        await submitAppointment(isoAppointmentDate);
      });
      setShowConflictModal(true);
      return;
    }

    await submitAppointment(isoAppointmentDate);
  };

  const submitAppointment = async (isoAppointmentDate) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${lawFirmId}/appointments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...newAppointment,
            appointmentDate: isoAppointmentDate
          })
        }
      );
      if (response.ok) {
        alert('Success', 'Appointment created successfully!');
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
        alert('Error', data.error || 'Failed to create appointment');
      }
    } catch (error) {
      alert('Error', 'Failed to create appointment');
    }
  };

  const validateDateFormat = (dateStr) => {
    const regex = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/\d{4}$/;
    if (!regex.test(dateStr)) return false;
    const [month, day, year] = dateStr.split('/').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getMonth() === month - 1 && date.getDate() === day && date.getFullYear() === year;
  };

  const validateTimeFormat = (timeStr) => {
    const regex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    return regex.test(timeStr);
  };

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      alert(title, message);
    }
  };

  const formatDateER = (date) => {
    if (!date) return '';
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const formatTimeER = (date) => {
    if (!date) return '';
    const h = date.getHours();
    const m = date.getMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const getTimeLabelER = (date) => {
    if (!date) return 'Select time';
    const h = date.getHours();
    const m = date.getMinutes();
    const hour12 = h % 12 || 12;
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const handleEventTypeChangeER = (value) => {
    setEventTypeER(value);
    const eventTypeObj = EVENT_TYPES_ER.find(t => t.value === value);
    if (eventTypeObj) {
      setTitleER(eventTypeObj.label);
    }
  };

  const handleTimeSlotSelectER = (index, slot) => {
    const newOptions = [...dateTimeOptionsER];
    newOptions[index].startTime = new Date(
      newOptions[index].date.getFullYear(),
      newOptions[index].date.getMonth(),
      newOptions[index].date.getDate(),
      slot.hours, slot.minutes
    );
    setDateTimeOptionsER(newOptions);
    setShowTimeDropdownER({ visible: false, index: -1 });
  };

  const handleDateTimeChangeER = (event, selectedValue, index, type) => {
    if (event.type === 'dismissed') {
      setShowDatePickerER({ visible: false, index: -1, type: 'date' });
      return;
    }
    if (selectedValue) {
      const newOptions = [...dateTimeOptionsER];
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
      setDateTimeOptionsER(newOptions);
    }
    if (Platform.OS !== 'ios') {
      setShowDatePickerER({ visible: false, index: -1, type: 'date' });
    }
  };

  const resetFormER = () => {
    setSelectedClientER(null);
    setEventTypeER('deposition');
    setTitleER('Deposition');
    setDescriptionER('');
    setLocationER('Office');
    setDurationMinutesER('60');
    setNotesER('');
    setClientSearchQueryER('');
    setShowClientDropdownER(false);
    setShowTimeDropdownER({ visible: false, index: -1 });
    setShowLocationDropdownER(false);
    setDateTimeOptionsER([
      { date: getDefaultDateTimeER(7, 10), startTime: getDefaultDateTimeER(7, 10) },
      { date: getDefaultDateTimeER(8, 14), startTime: getDefaultDateTimeER(8, 14) },
      { date: getDefaultDateTimeER(9, 10), startTime: getDefaultDateTimeER(9, 10) },
      { date: getDefaultDateTimeER(10, 14), startTime: getDefaultDateTimeER(10, 14) }
    ]);
    setShowDatePickerER({ visible: false, index: -1, type: 'date' });
  };

  const getClientFirstNameER = (client) => client?.first_name || client?.firstName || '';
  const getClientLastNameER = (client) => client?.last_name || client?.lastName || '';
  const getClientFullNameER = (client) => `${getClientFirstNameER(client)} ${getClientLastNameER(client)}`.trim();
  const getClientInitialsER = (client) => {
    const first = getClientFirstNameER(client);
    const last = getClientLastNameER(client);
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  };

  const filteredClientsER = useMemo(() => {
    if (!clientSearchQueryER.trim()) return sortedClients;
    const search = clientSearchQueryER.toLowerCase().trim();
    return sortedClients.filter((client) => {
      const fullName = getClientFullNameER(client).toLowerCase();
      return fullName.includes(search) || (client.email || '').toLowerCase().includes(search);
    });
  }, [clientSearchQueryER, sortedClients]);

  const handleCreateRequestER = async () => {
    if (!selectedClientER) {
      showAlert('Missing Information', 'Please select a client');
      return;
    }
    if (!titleER.trim()) {
      showAlert('Missing Information', 'Please enter an event title');
      return;
    }

    const validOptions = dateTimeOptionsER.filter(opt => opt.date && opt.startTime);
    if (validOptions.length !== 4) {
      showAlert('Missing Information', 'Please provide all 4 date/time options for the client to choose from');
      return;
    }

    setSubmittingER(true);
    try {
      const duration = parseInt(durationMinutesER) || 60;
      const proposedDates = dateTimeOptionsER.map(opt => {
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
          'Authorization': `Bearer ${user.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          clientId: selectedClientER.id,
          eventType: eventTypeER,
          title: titleER,
          description: descriptionER,
          location: locationER,
          durationMinutes: duration,
          notes: notesER,
          proposedDates
        })
      });

      if (response.ok) {
        showAlert('Request Sent', 'Event request has been sent to the client with 4 date options to choose from.');
        setShowAvailabilityRequestModal(false);
        resetFormER();
        loadCalendarData();
      } else {
        const error = await response.json();
        showAlert('Error', error.error || 'Failed to create event request');
      }
    } catch (error) {
      console.error('[CreateRequestER] Exception:', error);
      showAlert('Error', 'Failed to create event request');
    } finally {
      setSubmittingER(false);
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
        alert('Success', 'Settings updated successfully!');
      } else {
        const data = await response.json();
        alert('Error', data.error || 'Failed to update settings');
      }
    } catch (error) {
      alert('Error', 'Failed to update settings');
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
        alert('Success', 'Appointment confirmed!');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      alert('Error', 'Failed to confirm appointment');
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
        alert('Success', 'Appointment cancelled');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      alert('Error', 'Failed to cancel appointment');
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
        alert('Success', 'Appointment marked as completed!');
        fetchAppointments();
        setShowAppointmentModal(false);
      }
    } catch (error) {
      alert('Error', 'Failed to complete appointment');
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
          <Text style={styles.backArrowText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerIcon}>⚖️</Text>
        <Text style={styles.headerTitle}>Calendar</Text>
        <TouchableOpacity onPress={() => setShowSettingsModal(true)} style={styles.minimizeButton}>
          <Text style={styles.headerIcon}>⚙️</Text>
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
    <View style={styles.actionButtonsWrapper}>
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={() => setShowAddEventModal(true)}>
          <Text style={styles.actionIcon}>➕</Text>
          <Text style={styles.actionButtonText}>Add Event</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowAvailabilityModal(true)}>
          <Text style={styles.actionIcon}>🕐</Text>
          <Text style={styles.actionButtonText}>Set Hours</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => setShowBlockTimeModal(true)}>
          <Text style={styles.actionIcon}>🚫</Text>
          <Text style={styles.actionButtonText}>Block Time</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionButtonsSecondRow}>
        <TouchableOpacity style={styles.actionButtonWide} onPress={() => setShowAvailabilityRequestModal(true)}>
          <Text style={styles.actionIcon}>📨</Text>
          <Text style={styles.actionButtonText}>Request Availability</Text>
        </TouchableOpacity>
      </View>
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

        {(() => {
          const dayEvents = calendarEvents.filter(evt => 
            moment(evt.start_time).format('YYYY-MM-DD') === selectedDate
          );
          if (dayEvents.length === 0) return null;
          return (
            <View style={styles.dayEventsContainer}>
              <Text style={styles.dayEventsTitle}>Calendar Events</Text>
              {dayEvents.map(evt => (
                <View key={`evt-${evt.id}`} style={[styles.dayEventCard, evt.is_shared && styles.dayEventCardShared]}>
                  <View style={styles.dayEventHeader}>
                    <Text style={styles.dayEventEmoji}>
                      {EVENT_TYPES.find(t => t.value === evt.event_type)?.emoji || '📅'}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayEventTitle}>{evt.title}</Text>
                      <Text style={styles.dayEventTime}>
                        {moment(evt.start_time).format('h:mm A')} - {moment(evt.end_time).format('h:mm A')}
                      </Text>
                    </View>
                    {evt.is_shared && (
                      <View style={styles.eventSourceBadge}>
                        <Text style={styles.eventSourceText}>
                          {evt.event_source === 'client' ? 'Client' : evt.event_source === 'medical_provider' ? 'Provider' : evt.event_source}
                        </Text>
                      </View>
                    )}
                  </View>
                  {evt.shared_by_name && (
                    <Text style={styles.dayEventSource}>From: {evt.shared_by_name}</Text>
                  )}
                  {evt.description ? <Text style={styles.dayEventDesc}>{evt.description}</Text> : null}
                </View>
              ))}
            </View>
          );
        })()}
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
    alert(
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
              alert('Success', 'All availability cleared');
              fetchAvailability();
            } catch (error) {
              alert('Error', 'Failed to clear availability');
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

            <View style={styles.dateTimeRow}>
              <TimePickerInput
                label="Start Time"
                value={newAvailability.startTime}
                onChange={(time) => setNewAvailability({ ...newAvailability, startTime: time })}
                placeholder="09:00"
                style={styles.dateTimeHalf}
              />
              <TimePickerInput
                label="End Time"
                value={newAvailability.endTime}
                onChange={(time) => setNewAvailability({ ...newAvailability, endTime: time })}
                placeholder="17:00"
                style={styles.dateTimeHalf}
              />
            </View>

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
            <View style={styles.dateTimeRow}>
              <DatePickerInput
                label="Start Date"
                value={newBlockedTime.startDate}
                onChange={(date) => setNewBlockedTime({ ...newBlockedTime, startDate: date })}
                placeholder="Select start date"
                style={styles.dateTimeHalf}
              />
              <DatePickerInput
                label="End Date"
                value={newBlockedTime.endDate}
                onChange={(date) => setNewBlockedTime({ ...newBlockedTime, endDate: date })}
                placeholder="Select end date"
                minDate={newBlockedTime.startDate}
                style={styles.dateTimeHalf}
              />
            </View>

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

  const renderAvailabilityRequestModal = () => (
    <Modal
      visible={showAvailabilityRequestModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => { setShowAvailabilityRequestModal(false); resetFormER(); }}
    >
      <View style={styles.erModalOverlay}>
        <View style={[styles.erModalContent, isDesktopER && styles.erModalContentDesktop]}>
          <View style={styles.erModalHeader}>
            <Text style={styles.erModalTitle}>New Event Request</Text>
            <TouchableOpacity onPress={() => { setShowAvailabilityRequestModal(false); resetFormER(); }} style={styles.erModalCloseBtn}>
              <Text style={styles.erModalCloseBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.erFormScroll}
            contentContainerStyle={styles.erFormScrollContent}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.erFormSection}>
              <Text style={styles.erFormSectionTitle}>Client</Text>
              <TouchableOpacity
                style={styles.erClientSelector}
                onPress={() => setShowClientDropdownER(!showClientDropdownER)}
              >
                {selectedClientER ? (
                  <View style={styles.erSelectedClientDisplay}>
                    <View style={styles.erClientAvatar}>
                      <Text style={styles.erClientAvatarText}>
                        {getClientInitialsER(selectedClientER)}
                      </Text>
                    </View>
                    <View style={styles.erSelectedClientInfo}>
                      <Text style={styles.erSelectedClientName}>
                        {getClientFullNameER(selectedClientER) || selectedClientER.email}
                      </Text>
                      {selectedClientER.email && (
                        <Text style={styles.erSelectedClientEmail}>{selectedClientER.email}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation && e.stopPropagation();
                        setSelectedClientER(null);
                        setClientSearchQueryER('');
                      }}
                      style={styles.erClearClientBtn}
                    >
                      <Text style={styles.erClearClientBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.erClientSelectorPlaceholder}>
                    <Text style={styles.erClientSelectorPlaceholderIcon}>👤</Text>
                    <Text style={styles.erClientSelectorPlaceholderText}>Select a client...</Text>
                    <Text style={styles.erDropdownArrow}>{showClientDropdownER ? '▲' : '▼'}</Text>
                  </View>
                )}
              </TouchableOpacity>

              {showClientDropdownER && (
                <View style={styles.erClientDropdown}>
                  <View style={styles.erDropdownSearchRow}>
                    <TextInput
                      style={styles.erDropdownSearchInput}
                      value={clientSearchQueryER}
                      onChangeText={setClientSearchQueryER}
                      placeholder="Search by name..."
                      placeholderTextColor="#666"
                      autoFocus={true}
                    />
                    {clientSearchQueryER.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearchQueryER('')} style={styles.erDropdownClearBtn}>
                        <Text style={styles.erDropdownClearBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <ScrollView style={styles.erDropdownList} nestedScrollEnabled={true} keyboardShouldPersistTaps="handled">
                    {filteredClientsER.length === 0 ? (
                      <View style={styles.erDropdownEmpty}>
                        <Text style={styles.erDropdownEmptyText}>No clients found</Text>
                      </View>
                    ) : (
                      filteredClientsER.map(client => (
                        <TouchableOpacity
                          key={client.id}
                          style={[styles.erDropdownItem, selectedClientER?.id === client.id && styles.erDropdownItemSelected]}
                          onPress={() => {
                            setSelectedClientER(client);
                            setShowClientDropdownER(false);
                            setClientSearchQueryER('');
                          }}
                        >
                          <View style={[styles.erDropdownAvatar, selectedClientER?.id === client.id && styles.erDropdownAvatarSelected]}>
                            <Text style={[styles.erDropdownAvatarText, selectedClientER?.id === client.id && styles.erDropdownAvatarTextSelected]}>
                              {getClientInitialsER(client)}
                            </Text>
                          </View>
                          <View style={styles.erDropdownItemInfo}>
                            <Text style={[styles.erDropdownItemName, selectedClientER?.id === client.id && styles.erDropdownItemNameSelected]}>
                              {getClientFullNameER(client) || client.email}
                            </Text>
                            {client.email && (
                              <Text style={styles.erDropdownItemEmail}>{client.email}</Text>
                            )}
                          </View>
                          {selectedClientER?.id === client.id && (
                            <Text style={styles.erDropdownCheckmark}>✓</Text>
                          )}
                        </TouchableOpacity>
                      ))
                    )}
                  </ScrollView>
                </View>
              )}
            </View>

            <View style={styles.erFormSection}>
              <Text style={styles.erFormSectionTitle}>Event Type</Text>
              <View style={styles.erEventTypeGrid}>
                {EVENT_TYPES_ER.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.erEventTypeCard, eventTypeER === type.value && styles.erEventTypeCardSelected]}
                    onPress={() => handleEventTypeChangeER(type.value)}
                  >
                    <Text style={styles.erEventTypeIcon}>{type.icon}</Text>
                    <Text style={[styles.erEventTypeLabel, eventTypeER === type.value && styles.erEventTypeLabelSelected]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.erFormSection}>
              <Text style={styles.erFormSectionTitle}>Event Details</Text>

              <Text style={styles.erFieldLabel}>Title *</Text>
              <TextInput
                style={styles.erInput}
                value={titleER}
                onChangeText={setTitleER}
                placeholder="e.g., Medical Deposition - Dr. Smith"
                placeholderTextColor="#666"
              />

              <Text style={styles.erFieldLabel}>Description</Text>
              <TextInput
                style={[styles.erInput, styles.erTextArea]}
                value={descriptionER}
                onChangeText={setDescriptionER}
                placeholder="Additional details about the event..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={3}
              />

              <View style={isDesktopER ? styles.erTwoColRow : null}>
                <View style={isDesktopER ? styles.erHalfCol : null}>
                  <Text style={styles.erFieldLabel}>Location</Text>
                  <View style={{ position: 'relative', zIndex: showLocationDropdownER ? 100 : 1 }}>
                    <TouchableOpacity
                      style={styles.erLocationSelector}
                      onPress={() => setShowLocationDropdownER(!showLocationDropdownER)}
                    >
                      <Text style={styles.erLocationSelectorIcon}>
                        {LOCATION_OPTIONS_ER.find(l => l.value === locationER)?.icon || '📍'}
                      </Text>
                      <Text style={[styles.erLocationSelectorText, !locationER && { color: '#666' }]}>
                        {locationER || 'Select location'}
                      </Text>
                      <Text style={styles.erDropdownArrowSmall}>{showLocationDropdownER ? '▲' : '▼'}</Text>
                    </TouchableOpacity>
                    {showLocationDropdownER && (
                      <View style={styles.erLocationDropdown}>
                        {LOCATION_OPTIONS_ER.map(opt => (
                          <TouchableOpacity
                            key={opt.value}
                            style={[styles.erLocationDropdownItem, locationER === opt.value && styles.erLocationDropdownItemSelected]}
                            onPress={() => { setLocationER(opt.value); setShowLocationDropdownER(false); }}
                          >
                            <Text style={styles.erLocationDropdownIcon}>{opt.icon}</Text>
                            <Text style={[styles.erLocationDropdownText, locationER === opt.value && styles.erLocationDropdownTextSelected]}>
                              {opt.label}
                            </Text>
                            {locationER === opt.value && <Text style={styles.erLocationDropdownCheck}>✓</Text>}
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
                <View style={isDesktopER ? styles.erHalfCol : null}>
                  <Text style={styles.erFieldLabel}>Duration</Text>
                  <View style={styles.erDurationRow}>
                    {DURATION_OPTIONS_ER.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.erDurationChip, durationMinutesER === opt.value && styles.erDurationChipSelected]}
                        onPress={() => setDurationMinutesER(opt.value)}
                      >
                        <Text style={[styles.erDurationChipText, durationMinutesER === opt.value && styles.erDurationChipTextSelected]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              <Text style={styles.erFieldLabel}>Internal Notes</Text>
              <TextInput
                style={[styles.erInput, styles.erTextArea]}
                value={notesER}
                onChangeText={setNotesER}
                placeholder="Notes visible only to your firm..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.erFormSection}>
              <Text style={styles.erFormSectionTitle}>Proposed Date & Time Options</Text>
              <Text style={styles.erFormSectionSubtext}>
                Provide 4 options for the client to choose from
              </Text>

              {dateTimeOptionsER.map((option, index) => (
                <View key={index} style={styles.erDateOptionCard}>
                  <View style={styles.erDateOptionHeaderRow}>
                    <View style={styles.erDateOptionBadge}>
                      <Text style={styles.erDateOptionBadgeText}>Option {index + 1}</Text>
                    </View>
                    <Text style={styles.erDateOptionPreview}>
                      {formatDateER(option.date)} at {getTimeLabelER(option.startTime)}
                    </Text>
                  </View>
                  <View style={styles.erDateTimeFieldsRow}>
                    <View style={styles.erDateFieldWrapper}>
                      <Text style={styles.erDateTimeFieldLabel}>Date</Text>
                      {Platform.OS === 'web' ? (
                        <View style={styles.erDateInputWrapper}>
                          <Text style={styles.erDateInputIcon}>📅</Text>
                          <input
                            type="date"
                            value={option.date ? `${option.date.getFullYear()}-${String(option.date.getMonth() + 1).padStart(2, '0')}-${String(option.date.getDate()).padStart(2, '0')}` : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                const parts = e.target.value.split('-');
                                const newDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]),
                                  option.startTime.getHours(), option.startTime.getMinutes());
                                const newOptions = [...dateTimeOptionsER];
                                newOptions[index].date = newDate;
                                newOptions[index].startTime = newDate;
                                setDateTimeOptionsER(newOptions);
                              }
                            }}
                            min={new Date().toISOString().split('T')[0]}
                            style={{
                              border: 'none',
                              backgroundColor: 'transparent',
                              color: '#C0C0C0',
                              fontSize: 14,
                              fontWeight: '600',
                              fontFamily: 'inherit',
                              padding: 0,
                              flex: 1,
                              cursor: 'pointer',
                              outline: 'none',
                            }}
                          />
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.erDateInputWrapper}
                          onPress={() => setShowDatePickerER({ visible: true, index, type: 'date' })}
                        >
                          <Text style={styles.erDateInputIcon}>📅</Text>
                          <Text style={styles.erDateInputValue}>{formatDateER(option.date)}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.erTimeFieldWrapper}>
                      <Text style={styles.erDateTimeFieldLabel}>Time</Text>
                      <View style={{ position: 'relative', zIndex: showTimeDropdownER.visible && showTimeDropdownER.index === index ? 200 : 1 }}>
                        <TouchableOpacity
                          style={styles.erTimeSelector}
                          onPress={() => setShowTimeDropdownER(prev =>
                            prev.visible && prev.index === index
                              ? { visible: false, index: -1 }
                              : { visible: true, index }
                          )}
                        >
                          <Text style={styles.erTimeSelectorIcon}>🕐</Text>
                          <Text style={styles.erTimeSelectorText}>{getTimeLabelER(option.startTime)}</Text>
                          <Text style={styles.erDropdownArrowSmall}>{showTimeDropdownER.visible && showTimeDropdownER.index === index ? '▲' : '▼'}</Text>
                        </TouchableOpacity>
                        {showTimeDropdownER.visible && showTimeDropdownER.index === index && (
                          <View style={styles.erTimeDropdown}>
                            <ScrollView style={styles.erTimeDropdownScroll} nestedScrollEnabled={true}>
                              {TIME_SLOTS_ER.map((slot, si) => {
                                const isActive = option.startTime &&
                                  option.startTime.getHours() === slot.hours &&
                                  option.startTime.getMinutes() === slot.minutes;
                                return (
                                  <TouchableOpacity
                                    key={si}
                                    style={[styles.erTimeDropdownItem, isActive && styles.erTimeDropdownItemActive]}
                                    onPress={() => handleTimeSlotSelectER(index, slot)}
                                  >
                                    <Text style={[styles.erTimeDropdownText, isActive && styles.erTimeDropdownTextActive]}>
                                      {slot.label}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              ))}

              {Platform.OS !== 'web' && showDatePickerER.visible && (
                <DateTimePicker
                  value={showDatePickerER.type === 'date'
                    ? dateTimeOptionsER[showDatePickerER.index].date
                    : dateTimeOptionsER[showDatePickerER.index].startTime}
                  mode={showDatePickerER.type}
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selectedValue) =>
                    handleDateTimeChangeER(event, selectedValue, showDatePickerER.index, showDatePickerER.type)
                  }
                  minimumDate={new Date()}
                />
              )}
            </View>
          </ScrollView>

          <View style={styles.erModalFooter}>
            <TouchableOpacity
              style={styles.erCancelBtn}
              onPress={() => { setShowAvailabilityRequestModal(false); resetFormER(); }}
            >
              <Text style={styles.erCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.erSubmitBtn, submittingER && styles.erSubmitBtnDisabled]}
              onPress={handleCreateRequestER}
              disabled={submittingER}
            >
              {submittingER ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.erSubmitBtnText}>Send Request</Text>
              )}
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
                <Text style={styles.detailRowIcon}>📅</Text>
                <Text style={styles.appointmentDetailText}>
                  {formatDateUSA(selectedAppointment.appointment_date)}
                </Text>
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
            <Text style={styles.modalLabel}>Share with Client (Optional)</Text>
            <Text style={styles.modalDescription}>
              Select a client to automatically add this event to their calendar and send a notification
            </Text>
            <View style={styles.compactClientSelector}>
              {newEvent.selectedClientId ? (
                <View style={styles.selectedClientTag}>
                  <Text style={styles.selectedClientTagText} numberOfLines={1}>
                    {(() => {
                      const selected = clients.find(c => c.id === newEvent.selectedClientId);
                      return selected ? `${selected.first_name || selected.firstName} ${selected.last_name || selected.lastName}` : 'Selected Client';
                    })()}
                  </Text>
                  <TouchableOpacity 
                    onPress={() => setNewEvent({ ...newEvent, selectedClientId: '' })}
                    style={styles.removeClientTagButton}
                  >
                    <Text style={styles.removeClientTagIcon}>✕</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.compactDropdownButton}
                  onPress={() => setShowClientPickerEvent(!showClientPickerEvent)}
                >
                  <Text style={styles.compactDropdownPlaceholder}>Don't share (optional)</Text>
                  <Text style={styles.compactDropdownArrow}>{showClientPickerEvent ? '▲' : '▼'}</Text>
                </TouchableOpacity>
              )}
              {showClientPickerEvent && (
                <View style={styles.compactDropdownMenu}>
                  <View style={styles.compactSearchRow}>
                    <Text style={styles.compactSearchIcon}>🔍</Text>
                    <TextInput
                      style={styles.compactSearchInput}
                      value={clientSearchEvent}
                      onChangeText={setClientSearchEvent}
                      placeholder="Search clients..."
                      placeholderTextColor="#999"
                    />
                    {clientSearchEvent.length > 0 && (
                      <TouchableOpacity onPress={() => setClientSearchEvent('')}>
                        <Text style={styles.compactClearIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <FlatList
                    data={filteredClientsEvent}
                    keyExtractor={(item) => item.id.toString()}
                    style={styles.compactClientList}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={styles.compactClientItem}
                        onPress={() => {
                          setNewEvent({ ...newEvent, selectedClientId: item.id });
                          setShowClientPickerEvent(false);
                          setClientSearchEvent('');
                        }}
                      >
                        <Text style={styles.compactClientItemText}>
                          {item.first_name || item.firstName} {item.last_name || item.lastName}
                        </Text>
                      </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                      <Text style={styles.compactNoClientsText}>No clients found</Text>
                    }
                  />
                </View>
              )}
            </View>

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
                  onPress={() => setNewEvent({ ...newEvent, eventType: type.value, title: type.label })}
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

            <DatePickerInput
              label="Date"
              value={newEvent.eventDate}
              onChange={(date) => setNewEvent({ ...newEvent, eventDate: date })}
              placeholder="Select date"
            />

            <View style={styles.dateTimeRow}>
              <TimePickerInput
                label="Start Time"
                value={newEvent.startTime}
                onChange={(time) => setNewEvent({ ...newEvent, startTime: time })}
                placeholder="Select start time"
                style={styles.dateTimeHalf}
              />
              <TimePickerInput
                label="End Time"
                value={newEvent.endTime}
                onChange={(time) => setNewEvent({ ...newEvent, endTime: time })}
                placeholder="Select end time"
                style={styles.dateTimeHalf}
              />
            </View>

            <Text style={styles.modalLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              placeholder="Event title"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Location (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={newEvent.location}
              onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              placeholder="Enter location"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Description (Optional)</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
              placeholder="Event details..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleAddEvent}>
              <Text style={styles.saveIcon}>📅</Text>
              <Text style={styles.saveButtonText}>Create Event</Text>
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
      
      <ScrollView style={styles.scrollView}>
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
        {renderCurrentAvailability()}
        {renderLegend()}
      </ScrollView>

      {renderAvailabilityModal()}
      {renderBlockTimeModal()}
      {renderAvailabilityRequestModal()}
      {renderAppointmentModal()}
      {renderSettingsModal()}
      {renderAddEventModal()}

      <Modal visible={showConflictModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scheduling Conflict</Text>
              <TouchableOpacity onPress={cancelConflictAction}>
                <Text style={styles.modalCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.conflictWarningText}>
                You already have {conflictEvents.length} event{conflictEvents.length !== 1 ? 's' : ''} scheduled at this time:
              </Text>
              {conflictEvents.map((conflict, index) => (
                <View key={index} style={styles.conflictEventCard}>
                  <Text style={styles.conflictEventTitle}>{conflict.title}</Text>
                  <Text style={styles.conflictEventTime}>
                    {formatConflictTime(conflict.startTime)} - {formatConflictTime(conflict.endTime)}
                  </Text>
                  <Text style={styles.conflictEventType}>{conflict.eventType}</Text>
                </View>
              ))}
              <Text style={styles.conflictPromptText}>
                Would you like to continue with the double booking or choose a different time?
              </Text>
            </ScrollView>
            <View style={styles.conflictButtonRow}>
              <TouchableOpacity style={styles.conflictCancelButton} onPress={cancelConflictAction}>
                <Text style={styles.conflictCancelButtonText}>Change Time</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.conflictContinueButton} onPress={proceedWithEventCreation}>
                <Text style={styles.conflictContinueButtonText}>Continue Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  actionButtonsWrapper: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8
  },
  actionButtonsSecondRow: {
    flexDirection: 'row',
    gap: 8
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)'
  },
  actionButtonWide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(192, 192, 192, 0.1)',
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
  backArrowText: {
    fontSize: 28,
    color: '#C0C0C0',
    fontWeight: '300',
    lineHeight: 28,
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
  dayEventsContainer: {
    marginTop: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.2)',
  },
  dayEventsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C0C0C0',
    marginBottom: 10,
  },
  dayEventCard: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 152, 219, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#3498db',
    marginBottom: 8,
  },
  dayEventCardShared: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderLeftColor: '#8b5cf6',
  },
  dayEventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayEventEmoji: {
    fontSize: 18,
  },
  dayEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  dayEventTime: {
    fontSize: 12,
    color: '#C0C0C0',
    marginTop: 2,
  },
  dayEventSource: {
    fontSize: 11,
    color: '#8b5cf6',
    marginTop: 4,
    fontStyle: 'italic',
  },
  dayEventDesc: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 4,
  },
  eventSourceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.3)',
  },
  eventSourceText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#c4b5fd',
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
  modalDescription: {
    color: '#999',
    fontSize: 12,
    marginBottom: 12,
    marginTop: -4
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
  compactClientSelector: {
    marginBottom: 8
  },
  selectedClientTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E3A5F',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignSelf: 'flex-start'
  },
  selectedClientTagText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
    maxWidth: 200
  },
  removeClientTagButton: {
    padding: 2
  },
  removeClientTagIcon: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  compactDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 12,
    padding: 14
  },
  compactDropdownPlaceholder: {
    color: '#999',
    fontSize: 16
  },
  compactDropdownArrow: {
    color: '#fff',
    fontSize: 12
  },
  compactDropdownMenu: {
    marginTop: 8,
    backgroundColor: 'rgba(26, 84, 144, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.5)',
    borderRadius: 12,
    overflow: 'hidden'
  },
  compactSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)'
  },
  compactSearchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  compactSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    paddingVertical: 6
  },
  compactClearIcon: {
    color: '#999',
    fontSize: 14,
    padding: 4
  },
  compactClientList: {
    maxHeight: 180
  },
  compactClientItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  compactClientItemText: {
    color: '#fff',
    fontSize: 15
  },
  compactNoClientsText: {
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
  durationSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16
  },
  optionsSectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4
  },
  optionsSectionSubtitle: {
    color: '#999',
    fontSize: 13,
    marginBottom: 16
  },
  optionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'visible',
    zIndex: 1
  },
  optionLabel: {
    color: '#C0C0C0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
    zIndex: 1
  },
  dateTimeHalf: {
    flex: 1
  },
  dateInputContainer: {
    flex: 2,
    position: 'relative',
    zIndex: 2
  },
  timeInputContainer: {
    flex: 1,
    position: 'relative',
    zIndex: 1
  },
  inputSubLabel: {
    color: '#999',
    fontSize: 12,
    marginBottom: 4
  },
  dateInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  timeInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  datePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 14
  },
  calendarDropdown: {
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 9999,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#1E3A5F',
    overflow: 'visible',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 100
  },
  timePickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  timePickerButtonText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  timeDropdown: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: '#1E3A5F',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxHeight: 200
  },
  timeDropdownScroll: {
    maxHeight: 200
  },
  timeSlotOption: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)'
  },
  timeSlotOptionActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)'
  },
  timeSlotText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center'
  },
  timeSlotTextActive: {
    color: '#FFD700',
    fontWeight: 'bold'
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
  },
  conflictWarningText: {
    color: '#FFD700',
    fontSize: 15,
    marginBottom: 12,
    lineHeight: 22
  },
  conflictEventCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderLeftWidth: 3,
    borderLeftColor: '#ef4444',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8
  },
  conflictEventTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4
  },
  conflictEventTime: {
    color: '#C0C0C0',
    fontSize: 13,
    marginBottom: 2
  },
  conflictEventType: {
    color: '#94a3b8',
    fontSize: 12,
    textTransform: 'capitalize'
  },
  conflictPromptText: {
    color: '#C0C0C0',
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20
  },
  conflictButtonRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)'
  },
  conflictCancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  conflictCancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  conflictContinueButton: {
    flex: 1,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center'
  },
  conflictContinueButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700'
  },
  erModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  erModalContent: {
    backgroundColor: '#0F2640',
    borderRadius: 16,
    width: '100%',
    maxWidth: 560,
    maxHeight: '92%',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  erModalContentDesktop: {
    maxWidth: 680,
  },
  erModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.2)',
    backgroundColor: '#152d4a',
  },
  erModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#C0C0C0',
    flex: 1,
  },
  erModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  erModalCloseBtnText: {
    fontSize: 16,
    color: '#C0C0C0',
    fontWeight: '600',
  },
  erModalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(192, 192, 192, 0.2)',
    backgroundColor: '#152d4a',
  },
  erFormScroll: {
    flex: 1,
  },
  erFormScrollContent: {
    padding: 24,
  },
  erFormSection: {
    marginBottom: 24,
  },
  erFormSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C0C0C0',
    marginBottom: 12,
  },
  erFormSectionSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: -8,
    marginBottom: 14,
  },
  erFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#C0C0C0',
    marginBottom: 6,
    marginTop: 4,
  },
  erInput: {
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#fff',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 12,
  },
  erTextArea: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  erTwoColRow: {
    flexDirection: 'row',
    gap: 16,
  },
  erHalfCol: {
    flex: 1,
  },
  erClientSelector: {
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  erSelectedClientDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  erClientAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1a5490',
    justifyContent: 'center',
    alignItems: 'center',
  },
  erClientAvatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  erSelectedClientInfo: {
    flex: 1,
  },
  erSelectedClientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  erSelectedClientEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  erClearClientBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  erClearClientBtnText: {
    fontSize: 13,
    color: '#C0C0C0',
    fontWeight: '600',
  },
  erClientSelectorPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  erClientSelectorPlaceholderIcon: {
    fontSize: 18,
  },
  erClientSelectorPlaceholderText: {
    flex: 1,
    fontSize: 15,
    color: '#999',
  },
  erDropdownArrow: {
    fontSize: 12,
    color: '#999',
  },
  erClientDropdown: {
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#152d4a',
    overflow: 'hidden',
    maxHeight: 260,
  },
  erDropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(192, 192, 192, 0.2)',
    paddingHorizontal: 12,
  },
  erDropdownSearchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#fff',
  },
  erDropdownClearBtn: {
    padding: 6,
  },
  erDropdownClearBtnText: {
    color: '#999',
    fontWeight: '600',
  },
  erDropdownList: {
    maxHeight: 200,
  },
  erDropdownEmpty: {
    padding: 20,
    alignItems: 'center',
  },
  erDropdownEmptyText: {
    color: '#999',
    fontSize: 14,
  },
  erDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  erDropdownItemSelected: {
    backgroundColor: 'rgba(26, 84, 144, 0.4)',
  },
  erDropdownAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  erDropdownAvatarSelected: {
    backgroundColor: '#1a5490',
  },
  erDropdownAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#999',
  },
  erDropdownAvatarTextSelected: {
    color: '#fff',
  },
  erDropdownItemInfo: {
    flex: 1,
  },
  erDropdownItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  erDropdownItemNameSelected: {
    color: '#C0C0C0',
  },
  erDropdownItemEmail: {
    fontSize: 12,
    color: '#999',
    marginTop: 1,
  },
  erDropdownCheckmark: {
    fontSize: 16,
    color: '#C0C0C0',
    fontWeight: '700',
  },
  erEventTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  erEventTypeCard: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(192, 192, 192, 0.2)',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  erEventTypeCardSelected: {
    borderColor: '#C0C0C0',
    backgroundColor: 'rgba(26, 84, 144, 0.4)',
  },
  erEventTypeIcon: {
    fontSize: 22,
    marginBottom: 6,
  },
  erEventTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    textAlign: 'center',
  },
  erEventTypeLabelSelected: {
    color: '#C0C0C0',
    fontWeight: '700',
  },
  erLocationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  erLocationSelectorIcon: {
    fontSize: 18,
  },
  erLocationSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#C0C0C0',
  },
  erDropdownArrowSmall: {
    fontSize: 10,
    color: '#999',
  },
  erLocationDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#152d4a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    marginTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    zIndex: 200,
    overflow: 'hidden',
  },
  erLocationDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  erLocationDropdownItemSelected: {
    backgroundColor: 'rgba(26, 84, 144, 0.4)',
  },
  erLocationDropdownIcon: {
    fontSize: 18,
  },
  erLocationDropdownText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  erLocationDropdownTextSelected: {
    fontWeight: '700',
    color: '#C0C0C0',
  },
  erLocationDropdownCheck: {
    fontSize: 14,
    color: '#C0C0C0',
    fontWeight: '700',
  },
  erDurationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  erDurationChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  erDurationChipSelected: {
    backgroundColor: '#1a5490',
    borderColor: '#C0C0C0',
  },
  erDurationChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
  },
  erDurationChipTextSelected: {
    color: '#fff',
  },
  erDateOptionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.2)',
  },
  erDateOptionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  erDateOptionBadge: {
    backgroundColor: '#1a5490',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  erDateOptionBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  erDateOptionPreview: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  erDateTimeFieldsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  erDateFieldWrapper: {
    flex: 1,
  },
  erTimeFieldWrapper: {
    flex: 1,
  },
  erDateTimeFieldLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  erDateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  erDateInputIcon: {
    fontSize: 16,
  },
  erDateInputValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C0C0C0',
  },
  erTimeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  erTimeSelectorIcon: {
    fontSize: 16,
  },
  erTimeSelectorText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#C0C0C0',
  },
  erTimeDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#152d4a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
    marginTop: 4,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    zIndex: 300,
  },
  erTimeDropdownScroll: {
    maxHeight: 200,
  },
  erTimeDropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  erTimeDropdownItemActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.5)',
  },
  erTimeDropdownText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  erTimeDropdownTextActive: {
    fontWeight: '700',
    color: '#C0C0C0',
  },
  erCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(192, 192, 192, 0.3)',
  },
  erCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#C0C0C0',
  },
  erSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 10,
    backgroundColor: '#1a5490',
    minWidth: 140,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C0C0C0',
  },
  erSubmitBtnDisabled: {
    opacity: 0.6,
  },
  erSubmitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default LawFirmCalendarScreen;
