import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, ActivityIndicator, Platform
} from 'react-native';
import alert from '../utils/alert';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import Icon from '../components/CrossPlatformIcon';
import DatePickerInput from '../components/DatePickerInput';
import TimePickerInput from '../components/TimePickerInput';
import { API_BASE_URL } from '../config/api';
import CalendarService from '../services/CalendarService';

const CATEGORY_COLORS = {
  medical: '#10b981',
  lawfirm: '#3b82f6',
  task: '#f59e0b',
  request: '#8b5cf6',
  court_date: '#e74c3c',
  appointment: '#3498db',
  deposition: '#9b59b6',
  deadline: '#f39c12',
  reminder: '#1abc9c',
};

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: 'calendar-month' },
  { key: 'medical', label: 'Medical', icon: 'hospital-building' },
  { key: 'lawfirm', label: 'Law Firm', icon: 'scale-balance' },
  { key: 'tasks', label: 'Tasks', icon: 'clipboard-check' },
  { key: 'requests', label: 'Requests', icon: 'calendar-question' },
  { key: 'personal', label: 'Personal', icon: 'account' },
];

const APPOINTMENT_TYPES = [
  { value: 'Initial Consultation', icon: 'account-search' },
  { value: 'Follow-up', icon: 'calendar-check' },
  { value: 'Treatment', icon: 'medical-bag' },
  { value: 'Evaluation', icon: 'clipboard-text' },
  { value: 'Therapy Session', icon: 'heart-pulse' },
  { value: 'Imaging/X-Ray', icon: 'radioactive' },
  { value: 'Other', icon: 'dots-horizontal' }
];

const LAW_FIRM_APPOINTMENT_TYPES = [
  { value: 'consultation', label: 'Consultation', icon: 'account-tie' },
  { value: 'case_review', label: 'Case Review', icon: 'file-document-outline' },
  { value: 'deposition', label: 'Deposition', icon: 'microphone' },
  { value: 'mediation', label: 'Mediation', icon: 'handshake' },
  { value: 'court_hearing', label: 'Court Hearing', icon: 'gavel' },
  { value: 'settlement_conference', label: 'Settlement Conference', icon: 'scale-balance' }
];

const EVENT_TYPES = [
  { value: 'court_date', label: 'Court Date', icon: 'gavel' },
  { value: 'appointment', label: 'Appointment', icon: 'calendar' },
  { value: 'deposition', label: 'Deposition', icon: 'file-document' },
  { value: 'deadline', label: 'Deadline', icon: 'clock-alert' },
  { value: 'reminder', label: 'Reminder', icon: 'bell' }
];

const UnifiedCalendarScreen = ({ user, onBack, onNavigate }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('calendar');

  const [medicalAppointments, setMedicalAppointments] = useState([]);
  const [lawFirmAppointments, setLawFirmAppointments] = useState([]);
  const [personalEvents, setPersonalEvents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [eventRequests, setEventRequests] = useState([]);

  const [providers, setProviders] = useState([]);
  const [lawFirms, setLawFirms] = useState([]);

  const [showBookMedicalModal, setShowBookMedicalModal] = useState(false);
  const [showBookLawFirmModal, setShowBookLawFirmModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showRequestDetailModal, setShowRequestDetailModal] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [booking, setBooking] = useState(false);

  const [selectedLawFirm, setSelectedLawFirm] = useState(null);
  const [lawFirmSlots, setLawFirmSlots] = useState([]);
  const [loadingLawFirmSlots, setLoadingLawFirmSlots] = useState(false);
  const [lawFirmBookingSlot, setLawFirmBookingSlot] = useState(null);
  const [lawFirmAppointmentType, setLawFirmAppointmentType] = useState('consultation');
  const [lawFirmNotes, setLawFirmNotes] = useState('');
  const [bookingLawFirm, setBookingLawFirm] = useState(false);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [proposedDates, setProposedDates] = useState([
    { startTime: null, endTime: null },
    { startTime: null, endTime: null },
    { startTime: null, endTime: null }
  ]);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', location: '',
    eventType: 'reminder', startDate: '', startTime: '', endDate: '', endTime: '',
    allDay: false, reminderEnabled: true, reminderMinutesBefore: 60
  });

  const patientId = user?.id;

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadMedicalAppointments(),
      loadLawFirmAppointments(),
      loadPersonalEvents(),
      loadTasks(),
      loadEventRequests(),
      loadConnectedProviders(),
      loadConnectedLawFirms(),
    ]);
    setLoading(false);
  };

  const loadMedicalAppointments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/patients/${patientId}/appointments`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setMedicalAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error loading medical appointments:', error);
    }
  };

  const loadLawFirmAppointments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/clients/${patientId}/appointments`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setLawFirmAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error loading law firm appointments:', error);
    }
  };

  const loadPersonalEvents = async () => {
    try {
      const fetchedEvents = await CalendarService.fetchEvents(user.token, {});
      setPersonalEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading personal events:', error);
    }
  };

  const loadTasks = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/tasks/my-tasks`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setTasks((data.tasks || []).filter(t => t.due_date));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadEventRequests = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/event-requests`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEventRequests(data.eventRequests || []);
      }
    } catch (error) {
      console.error('Error loading event requests:', error);
    }
  };

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
    }
  };

  const loadConnectedLawFirms = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/clients/${patientId}/connected-law-firms`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setLawFirms(data.lawFirms || []);
      }
    } catch (error) {
      console.error('Error loading law firms:', error);
    }
  };

  const allItems = useMemo(() => {
    const items = [];

    medicalAppointments.forEach(a => {
      if (!a || !a.appointment_date) return;
      items.push({
        id: `med-${a.id}`, type: 'medical', category: 'medical',
        title: a.provider_name || 'Medical Appointment',
        subtitle: a.appointment_type || '',
        date: a.appointment_date,
        time: a.start_time ? moment(a.start_time, 'HH:mm:ss').format('h:mm A') : '',
        status: a.status,
        color: a.status === 'confirmed' ? '#10b981' : a.status === 'pending' ? '#f59e0b' : '#6b7280',
        icon: 'hospital-building',
        raw: a, cancellable: a.status !== 'cancelled' && a.status !== 'completed'
      });
    });

    lawFirmAppointments.forEach(a => {
      if (!a || !a.appointment_date) return;
      items.push({
        id: `law-${a.id}`, type: 'lawfirm', category: 'lawfirm',
        title: a.firm_name || 'Law Firm Appointment',
        subtitle: (a.appointment_type || '').replace(/_/g, ' '),
        date: a.appointment_date,
        time: a.start_time ? moment(a.start_time, 'HH:mm:ss').format('h:mm A') : '',
        status: a.status,
        color: a.status === 'confirmed' ? '#3b82f6' : a.status === 'pending' ? '#8b5cf6' : '#6b7280',
        icon: 'scale-balance',
        raw: a, cancellable: a.status !== 'cancelled' && a.status !== 'completed'
      });
    });

    personalEvents.forEach(e => {
      if (!e || !e.start_time) return;
      const parsedDate = moment(e.start_time);
      if (!parsedDate.isValid()) return;
      const eventDate = parsedDate.format('YYYY-MM-DD');
      const sourceLabel = e.event_source === 'law_firm' ? `From: ${e.shared_by_name || 'Law Firm'}` :
                          e.event_source === 'medical_provider' ? `From: ${e.shared_by_name || 'Provider'}` : null;
      items.push({
        id: `evt-${e.id}`, type: 'personal', category: 'personal',
        title: e.title || 'Untitled Event',
        subtitle: sourceLabel || (e.event_type || '').replace('_', ' ').toUpperCase(),
        date: eventDate,
        time: parsedDate.format('h:mm A'),
        status: null,
        color: e.is_shared ? '#8b5cf6' : (CATEGORY_COLORS[e.event_type] || '#FFD700'),
        icon: getEventTypeIcon(e.event_type),
        raw: e, syncable: true, synced: e.synced_to_device,
        location: e.location, description: e.description,
        eventSource: e.event_source, sharedByName: e.shared_by_name, isShared: e.is_shared
      });
    });

    tasks.forEach(t => {
      if (!t || !t.due_date) return;
      const parsedTaskDate = moment(t.due_date);
      if (!parsedTaskDate.isValid()) return;
      const taskDate = parsedTaskDate.format('YYYY-MM-DD');
      items.push({
        id: `task-${t.id}`, type: 'task', category: 'tasks',
        title: t.title || 'Untitled Task',
        subtitle: `Priority: ${t.priority || 'Normal'}`,
        date: taskDate,
        time: '',
        status: t.status,
        color: '#f59e0b',
        icon: 'clipboard-check',
        raw: t, coinReward: t.coin_reward
      });
    });

    eventRequests.forEach(r => {
      if (!r) return;
      const parsedReqDate = moment(r.createdAt);
      items.push({
        id: `req-${r.id}`, type: 'request', category: 'requests',
        title: r.title || 'Event Request',
        subtitle: `From: ${r.lawFirmName || 'Unknown'}`,
        date: parsedReqDate.isValid() ? parsedReqDate.format('YYYY-MM-DD') : moment().format('YYYY-MM-DD'),
        time: '',
        status: r.status,
        color: '#8b5cf6',
        icon: 'calendar-question',
        raw: r
      });
    });

    return items;
  }, [medicalAppointments, lawFirmAppointments, personalEvents, tasks, eventRequests]);

  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') return allItems;
    return allItems.filter(item => item.category === activeFilter);
  }, [allItems, activeFilter]);

  const itemsForSelectedDate = useMemo(() => {
    return filteredItems.filter(item => item.date === selectedDate);
  }, [filteredItems, selectedDate]);

  const agendaGrouped = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    const upcoming = filteredItems
      .filter(i => i.date >= today && i.status !== 'cancelled')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));
    const groups = {};
    upcoming.forEach(item => {
      if (!groups[item.date]) groups[item.date] = [];
      groups[item.date].push(item);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [filteredItems]);

  const markedDates = useMemo(() => {
    const marked = {};
    filteredItems.forEach(item => {
      if (!item.date) return;
      if (!marked[item.date]) {
        marked[item.date] = { dots: [], marked: true };
      }
      if (marked[item.date].dots.length < 4) {
        marked[item.date].dots.push({ key: item.id, color: item.color });
      }
    });

    if (selectedDate) {
      marked[selectedDate] = {
        ...(marked[selectedDate] || {}),
        selected: true,
        selectedColor: '#1a5490',
        dots: marked[selectedDate]?.dots || []
      };
    }
    return marked;
  }, [filteredItems, selectedDate]);

  const getEventTypeIcon = (type) => {
    const found = EVENT_TYPES.find(t => t.value === type);
    return found ? found.icon : 'calendar';
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

  const getRequestStatusLabel = (status) => {
    switch (status) {
      case 'pending': return 'Action Required';
      case 'dates_offered': return 'Select a Date';
      case 'dates_submitted': return 'Awaiting Confirmation';
      case 'confirmed': return 'Confirmed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  const handleCancelMedicalAppointment = (appointmentId) => {
    alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/medical-calendar/appointments/${appointmentId}/cancel`,
              {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Cancelled by patient' })
              }
            );
            if (response.ok) {
              alert('Success', 'Appointment cancelled');
              loadMedicalAppointments();
            }
          } catch (error) { alert('Error', 'Failed to cancel appointment'); }
        }
      }
    ]);
  };

  const handleCancelLawFirmAppointment = (appointmentId) => {
    alert('Cancel Appointment', 'Are you sure you want to cancel this appointment?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(
              `${API_BASE_URL}/api/law-firm-calendar/appointments/${appointmentId}/cancel`,
              {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: 'Cancelled by client' })
              }
            );
            if (response.ok) {
              alert('Success', 'Appointment cancelled');
              loadLawFirmAppointments();
            }
          } catch (error) { alert('Error', 'Failed to cancel appointment'); }
        }
      }
    ]);
  };

  const handleSyncToDevice = async (event) => {
    if (Platform.OS === 'web') {
      alert('Mobile Feature', 'Syncing to device calendar is only available on the mobile app.');
      return;
    }
    try {
      const hasPermission = await CalendarService.requestPermissions();
      if (!hasPermission) {
        alert('Permission Required', 'Calendar permission is required to sync events to your device calendar');
        return;
      }
      await CalendarService.syncEventToDevice(event, user.token);
      alert('Success', 'Event synced to your device calendar!');
      loadPersonalEvents();
    } catch (error) {
      alert('Error', 'Failed to sync event to device calendar');
    }
  };

  const handleUnsyncFromDevice = async (event) => {
    try {
      await CalendarService.unsyncEventFromDevice(event, user.token);
      alert('Success', 'Event removed from device calendar');
      loadPersonalEvents();
    } catch (error) {
      alert('Error', 'Failed to remove event from device calendar');
    }
  };

  const handleDeleteEvent = (event) => {
    alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            if (event.synced_to_device && Platform.OS !== 'web') {
              await CalendarService.unsyncEventFromDevice(event, user.token);
            }
            await CalendarService.deleteEventFromBackend(event.id, user.token);
            alert('Success', 'Event deleted');
            loadPersonalEvents();
          } catch (error) { alert('Error', 'Failed to delete event'); }
        }
      }
    ]);
  };

  // --- Medical Booking ---
  const loadAvailableSlots = async (providerId, date) => {
    setLoadingSlots(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/available-slots?date=${date}`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      }
    } catch (error) {
      alert('Error', 'Failed to load available slots');
    } finally { setLoadingSlots(false); }
  };

  const handleBookMedicalAppointment = async () => {
    if (!appointmentType.trim()) { alert('Required', 'Please select an appointment type'); return; }
    if (!selectedProvider || !bookingSlot) { alert('Required', 'Please select a provider and time slot'); return; }
    setBooking(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/medical-calendar/appointments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: selectedProvider.id, appointmentDate: bookingDate,
          startTime: bookingSlot.startTime, endTime: bookingSlot.endTime,
          appointmentType, patientNotes: bookingNotes
        })
      });
      if (response.ok) {
        alert('Success!', 'Your appointment has been requested.', [{
          text: 'Great!', onPress: () => {
            setShowBookMedicalModal(false);
            resetBookingState();
            loadMedicalAppointments();
          }
        }]);
      } else {
        const data = await response.json();
        alert('Error', data.error || 'Failed to book appointment');
      }
    } catch (error) { alert('Error', 'Failed to book appointment'); }
    finally { setBooking(false); }
  };

  // --- Law Firm Booking ---
  const loadLawFirmAvailableSlots = async (firmId, date) => {
    setLoadingLawFirmSlots(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/law-firm-calendar/law-firms/${firmId}/available-slots?date=${date}`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setLawFirmSlots(data.slots || []);
      }
    } catch (error) { alert('Error', 'Failed to load available slots'); }
    finally { setLoadingLawFirmSlots(false); }
  };

  const handleBookLawFirmAppointment = async () => {
    if (!lawFirmAppointmentType) { alert('Required', 'Please select an appointment type'); return; }
    if (!selectedLawFirm || !lawFirmBookingSlot) { alert('Required', 'Please select a law firm and time slot'); return; }
    setBookingLawFirm(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/law-firm-calendar/appointments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lawFirmId: selectedLawFirm.id, appointmentDate: bookingDate,
          startTime: lawFirmBookingSlot.startTime, endTime: lawFirmBookingSlot.endTime,
          appointmentType: lawFirmAppointmentType, clientNotes: lawFirmNotes
        })
      });
      if (response.ok) {
        alert('Success!', 'Your appointment has been requested.', [{
          text: 'Great!', onPress: () => {
            setShowBookLawFirmModal(false);
            resetLawFirmBookingState();
            loadLawFirmAppointments();
          }
        }]);
      } else {
        const data = await response.json();
        alert('Error', data.error || 'Failed to book appointment');
      }
    } catch (error) { alert('Error', 'Failed to book appointment'); }
    finally { setBookingLawFirm(false); }
  };

  // --- Personal Event ---
  const parseDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return null;
    const parsed = moment(dateTimeStr, ['YYYY-MM-DD HH:mm', 'YYYY-MM-DD HH:MM', moment.ISO_8601], true);
    return parsed.isValid() ? parsed.toISOString() : null;
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startDate || !newEvent.startTime) {
      alert('Required', 'Please provide a title, start date, and start time');
      return;
    }
    const parsedStart = moment(newEvent.startDate + ' ' + newEvent.startTime, 'YYYY-MM-DD HH:mm');
    if (!parsedStart.isValid()) {
      alert('Invalid Date', 'Please select a valid start date and time');
      return;
    }
    const parsedStartTime = parsedStart.toISOString();
    let parsedEndTime = null;
    if (newEvent.endDate && newEvent.endTime) {
      const parsedEnd = moment(newEvent.endDate + ' ' + newEvent.endTime, 'YYYY-MM-DD HH:mm');
      parsedEndTime = parsedEnd.isValid() ? parsedEnd.toISOString() : null;
    }
    try {
      await CalendarService.createEventInBackend({
        title: newEvent.title, description: newEvent.description, location: newEvent.location,
        event_type: newEvent.eventType, start_time: parsedStartTime, end_time: parsedEndTime,
        all_day: newEvent.allDay, reminder_enabled: newEvent.reminderEnabled,
        reminder_minutes_before: newEvent.reminderMinutesBefore
      }, user.token);
      setShowAddEventModal(false);
      resetNewEvent();
      loadPersonalEvents();
      alert('Success', 'Event created successfully!');
    } catch (error) {
      alert('Error', error.message || 'Failed to create event');
    }
  };

  // --- Event Requests ---
  const handleViewRequestDetails = async (request) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/event-requests/${request.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedRequest(data);
        if (data.proposedDates && data.proposedDates.length === 3) {
          setProposedDates(data.proposedDates.map(d => ({
            startTime: new Date(d.proposedStartTime), endTime: new Date(d.proposedEndTime)
          })));
        } else {
          setProposedDates([
            { startTime: null, endTime: null },
            { startTime: null, endTime: null },
            { startTime: null, endTime: null }
          ]);
        }
        setShowRequestDetailModal(true);
      }
    } catch (error) {
      alert('Error', 'Failed to load request details');
    }
  };

  const handleSubmitDates = async () => {
    const allDatesValid = proposedDates.every(d => d.startTime && d.endTime);
    if (!allDatesValid) { alert('Error', 'Please select start and end times for all 3 dates'); return; }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/event-requests/${selectedRequest.eventRequest.id}/propose-dates`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposedDates: proposedDates.map(d => ({
              startTime: d.startTime.toISOString(), endTime: d.endTime.toISOString()
            }))
          })
        }
      );
      if (response.ok) {
        alert('Success', 'Your available dates have been sent');
        setShowRequestDetailModal(false);
        loadEventRequests();
      } else {
        const error = await response.json();
        alert('Error', error.error || 'Failed to submit dates');
      }
    } catch (error) { alert('Error', 'Failed to submit dates'); }
  };

  const handleSelectOfferedDate = async (proposedDateId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/event-requests/${selectedRequest.eventRequest.id}/select-date`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${user.token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ proposedDateId })
        }
      );
      if (response.ok) {
        alert('Success', 'Date selected! The event has been added to your calendar.');
        setShowRequestDetailModal(false);
        loadEventRequests();
        loadPersonalEvents();
      } else {
        const error = await response.json();
        alert('Error', error.error || 'Failed to select date');
      }
    } catch (error) { alert('Error', 'Failed to select date'); }
  };

  const resetBookingState = () => {
    setSelectedProvider(null); setBookingSlot(null); setAppointmentType('');
    setBookingNotes(''); setAvailableSlots([]);
  };

  const resetLawFirmBookingState = () => {
    setSelectedLawFirm(null); setLawFirmBookingSlot(null);
    setLawFirmAppointmentType('consultation'); setLawFirmNotes(''); setLawFirmSlots([]);
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: '', description: '', location: '', eventType: 'reminder',
      startDate: '', startTime: '', endDate: '', endTime: '', allDay: false, reminderEnabled: true, reminderMinutesBefore: 60
    });
  };

  const renderItemCard = (item) => {
    return (
      <View key={item.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.itemTypeBadge, { backgroundColor: item.color }]}>
            <Icon name={item.icon} size={20} color="#fff" />
          </View>
          <View style={styles.itemInfo}>
            <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
            {item.subtitle ? <Text style={styles.itemSubtitle} numberOfLines={1}>{item.subtitle}</Text> : null}
          </View>
          {item.status && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          )}
          {item.isShared && (
            <View style={styles.sharedSourceBadge}>
              <Text style={styles.sharedSourceText}>
                {item.eventSource === 'law_firm' ? 'Law Firm' : item.eventSource === 'medical_provider' ? 'Provider' : ''}
              </Text>
            </View>
          )}
          {item.synced && (
            <View style={styles.syncedBadge}>
              <Icon name="check" size={12} color="#fff" />
            </View>
          )}
        </View>

        {(item.time || item.location) && (
          <View style={styles.itemDetails}>
            {item.time ? (
              <View style={styles.detailRow}>
                <Icon name="clock-outline" size={14} color="#FFD700" />
                <Text style={styles.detailText}>{item.time}</Text>
              </View>
            ) : null}
            {item.location && (
              <View style={styles.detailRow}>
                <Icon name="map-marker" size={14} color="#FFD700" />
                <Text style={styles.detailText}>{item.location}</Text>
              </View>
            )}
          </View>
        )}

        {item.description && (
          <Text style={styles.itemDescription} numberOfLines={2}>{item.description}</Text>
        )}

        {item.coinReward ? (
          <View style={styles.coinRewardRow}>
            <Icon name="circle" size={14} color="#FFD700" />
            <Text style={styles.coinRewardText}>{item.coinReward} coins reward</Text>
          </View>
        ) : null}

        <View style={styles.itemActions}>
          {item.type === 'medical' && item.cancellable && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelMedicalAppointment(item.raw.id)}>
              <Icon name="close-circle" size={14} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {item.type === 'lawfirm' && item.cancellable && (
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelLawFirmAppointment(item.raw.id)}>
              <Icon name="close-circle" size={14} color="#ef4444" />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
          {item.type === 'personal' && (
            <>
              {!item.synced ? (
                <TouchableOpacity style={styles.syncBtn} onPress={() => handleSyncToDevice(item.raw)}>
                  <Icon name="cellphone-link" size={14} color="#fff" />
                  <Text style={styles.syncBtnText}>Sync</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.unsyncBtn} onPress={() => handleUnsyncFromDevice(item.raw)}>
                  <Icon name="cellphone-off" size={14} color="#fff" />
                  <Text style={styles.syncBtnText}>Unsync</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteEvent(item.raw)}>
                <Icon name="delete" size={14} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          {item.type === 'request' && item.status !== 'confirmed' && item.status !== 'cancelled' && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => handleViewRequestDetails(item.raw)}>
              <Icon name="calendar-edit" size={14} color="#FFD700" />
              <Text style={styles.actionBtnText}>
                {item.status === 'pending' ? 'Propose Dates' : item.status === 'dates_offered' ? 'Select Date' : 'View'}
              </Text>
            </TouchableOpacity>
          )}
          {item.type === 'task' && item.status !== 'completed' && onNavigate && (
            <TouchableOpacity style={styles.actionBtn} onPress={() => onNavigate('task-detail', { taskId: item.raw.id })}>
              <Icon name="eye" size={14} color="#FFD700" />
              <Text style={styles.actionBtnText}>View Task</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsBar}>
      <TouchableOpacity style={styles.quickActionButton} onPress={() => { setBookingDate(selectedDate); setShowBookMedicalModal(true); setShowQuickActions(false); }}>
        <Icon name="hospital-building" size={18} color="#10b981" />
        <Text style={styles.quickActionLabel}>Medical</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionButton} onPress={() => { setBookingDate(selectedDate); setShowBookLawFirmModal(true); setShowQuickActions(false); }}>
        <Icon name="scale-balance" size={18} color="#3b82f6" />
        <Text style={styles.quickActionLabel}>Law Firm</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.quickActionButton} onPress={() => { setShowAddEventModal(true); setShowQuickActions(false); }}>
        <Icon name="calendar-plus" size={18} color="#FFD700" />
        <Text style={styles.quickActionLabel}>Personal</Text>
      </TouchableOpacity>
    </View>
  );

  const renderBookMedicalModal = () => (
    <Modal visible={showBookMedicalModal} animationType="slide" transparent onRequestClose={() => setShowBookMedicalModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Icon name="hospital-building" size={24} color="#FFD700" />
            <Text style={styles.modalTitle}>Book Medical Appointment</Text>
            <TouchableOpacity onPress={() => { setShowBookMedicalModal(false); resetBookingState(); }}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalLabel}>Select Provider</Text>
            {providers.length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyBoxText}>No connected providers</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {providers.map(p => (
                  <TouchableOpacity key={p.id} style={[styles.providerChip, selectedProvider?.id === p.id && styles.providerChipActive]}
                    onPress={() => { setSelectedProvider(p); loadAvailableSlots(p.id, bookingDate); }}>
                    <Icon name="doctor" size={20} color={selectedProvider?.id === p.id ? '#FFD700' : '#a0aec0'} />
                    <Text style={[styles.providerChipText, selectedProvider?.id === p.id && styles.providerChipTextActive]} numberOfLines={1}>{p.provider_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedProvider && (
              <>
                <Text style={styles.modalLabel}>Date: {moment(bookingDate).format('MMMM Do, YYYY')}</Text>
                <Calendar
                  current={bookingDate}
                  minDate={moment().format('YYYY-MM-DD')}
                  maxDate={moment().add(3, 'months').format('YYYY-MM-DD')}
                  onDayPress={(day) => { setBookingDate(day.dateString); loadAvailableSlots(selectedProvider.id, day.dateString); }}
                  markedDates={{ [bookingDate]: { selected: true, selectedColor: '#1a5490' } }}
                  theme={calendarTheme}
                />

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>Available Times</Text>
                {loadingSlots ? (
                  <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 20 }} />
                ) : availableSlots.length === 0 ? (
                  <Text style={styles.noSlotsText}>No slots available for this date</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {availableSlots.map((slot, i) => (
                      <TouchableOpacity key={i} style={[styles.slotButton, bookingSlot === slot && styles.slotButtonActive]}
                        onPress={() => setBookingSlot(slot)}>
                        <Text style={styles.slotTime}>{moment(slot.startTime, 'HH:mm').format('h:mm A')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {bookingSlot && (
                  <>
                    <Text style={[styles.modalLabel, { marginTop: 16 }]}>Appointment Type *</Text>
                    <View style={styles.typesGrid}>
                      {APPOINTMENT_TYPES.map(type => (
                        <TouchableOpacity key={type.value}
                          style={[styles.typeBtn, appointmentType === type.value && styles.typeBtnActive]}
                          onPress={() => setAppointmentType(type.value)}>
                          <Icon name={type.icon} size={16} color={appointmentType === type.value ? '#FFD700' : '#a0aec0'} />
                          <Text style={[styles.typeBtnText, appointmentType === type.value && styles.typeBtnTextActive]}>{type.value}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalLabel}>Notes (Optional)</Text>
                    <TextInput style={styles.modalInput} placeholder="Any notes for the provider..." placeholderTextColor="#666"
                      multiline value={bookingNotes} onChangeText={setBookingNotes} />

                    <TouchableOpacity style={[styles.confirmButton, booking && styles.confirmButtonDisabled]}
                      onPress={handleBookMedicalAppointment} disabled={booking}>
                      {booking ? <ActivityIndicator color="#fff" /> : (
                        <><Icon name="check" size={20} color="#fff" /><Text style={styles.confirmButtonText}>Request Appointment</Text></>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderBookLawFirmModal = () => (
    <Modal visible={showBookLawFirmModal} animationType="slide" transparent onRequestClose={() => setShowBookLawFirmModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Icon name="scale-balance" size={24} color="#FFD700" />
            <Text style={styles.modalTitle}>Book Law Firm Appointment</Text>
            <TouchableOpacity onPress={() => { setShowBookLawFirmModal(false); resetLawFirmBookingState(); }}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalLabel}>Select Law Firm</Text>
            {lawFirms.length === 0 ? (
              <View style={styles.emptyBox}><Text style={styles.emptyBoxText}>No connected law firms</Text></View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {lawFirms.map(f => (
                  <TouchableOpacity key={f.id} style={[styles.providerChip, selectedLawFirm?.id === f.id && styles.providerChipActive]}
                    onPress={() => { setSelectedLawFirm(f); loadLawFirmAvailableSlots(f.id, bookingDate); }}>
                    <Icon name="gavel" size={20} color={selectedLawFirm?.id === f.id ? '#FFD700' : '#a0aec0'} />
                    <Text style={[styles.providerChipText, selectedLawFirm?.id === f.id && styles.providerChipTextActive]} numberOfLines={1}>{f.firm_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {selectedLawFirm && (
              <>
                <Text style={styles.modalLabel}>Date: {moment(bookingDate).format('MMMM Do, YYYY')}</Text>
                <Calendar
                  current={bookingDate}
                  minDate={moment().format('YYYY-MM-DD')}
                  maxDate={moment().add(3, 'months').format('YYYY-MM-DD')}
                  onDayPress={(day) => { setBookingDate(day.dateString); loadLawFirmAvailableSlots(selectedLawFirm.id, day.dateString); }}
                  markedDates={{ [bookingDate]: { selected: true, selectedColor: '#1a5490' } }}
                  theme={calendarTheme}
                />

                <Text style={[styles.modalLabel, { marginTop: 16 }]}>Available Times</Text>
                {loadingLawFirmSlots ? (
                  <ActivityIndicator size="large" color="#FFD700" style={{ marginVertical: 20 }} />
                ) : lawFirmSlots.length === 0 ? (
                  <Text style={styles.noSlotsText}>No slots available for this date</Text>
                ) : (
                  <View style={styles.slotsGrid}>
                    {lawFirmSlots.map((slot, i) => (
                      <TouchableOpacity key={i} style={[styles.slotButton, lawFirmBookingSlot === slot && styles.slotButtonActive]}
                        onPress={() => setLawFirmBookingSlot(slot)}>
                        <Text style={styles.slotTime}>{moment(slot.startTime, 'HH:mm').format('h:mm A')}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {lawFirmBookingSlot && (
                  <>
                    <Text style={[styles.modalLabel, { marginTop: 16 }]}>Appointment Type *</Text>
                    <View style={styles.typesGrid}>
                      {LAW_FIRM_APPOINTMENT_TYPES.map(type => (
                        <TouchableOpacity key={type.value}
                          style={[styles.typeBtn, lawFirmAppointmentType === type.value && styles.typeBtnActive]}
                          onPress={() => setLawFirmAppointmentType(type.value)}>
                          <Icon name={type.icon} size={16} color={lawFirmAppointmentType === type.value ? '#FFD700' : '#a0aec0'} />
                          <Text style={[styles.typeBtnText, lawFirmAppointmentType === type.value && styles.typeBtnTextActive]}>{type.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.modalLabel}>Notes (Optional)</Text>
                    <TextInput style={styles.modalInput} placeholder="Any notes..." placeholderTextColor="#666"
                      multiline value={lawFirmNotes} onChangeText={setLawFirmNotes} />

                    <TouchableOpacity style={[styles.confirmButton, bookingLawFirm && styles.confirmButtonDisabled]}
                      onPress={handleBookLawFirmAppointment} disabled={bookingLawFirm}>
                      {bookingLawFirm ? <ActivityIndicator color="#fff" /> : (
                        <><Icon name="check" size={20} color="#fff" /><Text style={styles.confirmButtonText}>Confirm Booking</Text></>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderAddEventModal = () => (
    <Modal visible={showAddEventModal} animationType="slide" transparent onRequestClose={() => setShowAddEventModal(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Icon name="calendar-plus" size={24} color="#FFD700" />
            <Text style={styles.modalTitle}>Add Personal Event</Text>
            <TouchableOpacity onPress={() => { setShowAddEventModal(false); resetNewEvent(); }}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.modalLabel}>Event Type</Text>
            <View style={styles.typesGrid}>
              {EVENT_TYPES.map(type => (
                <TouchableOpacity key={type.value}
                  style={[styles.typeBtn, newEvent.eventType === type.value && styles.typeBtnActive, { borderColor: CATEGORY_COLORS[type.value] || '#FFD700' }]}
                  onPress={() => setNewEvent({ ...newEvent, eventType: type.value })}>
                  <Icon name={type.icon} size={16} color={newEvent.eventType === type.value ? '#fff' : CATEGORY_COLORS[type.value]} />
                  <Text style={[styles.typeBtnText, newEvent.eventType === type.value && styles.typeBtnTextActive]}>{type.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Title *</Text>
            <TextInput style={styles.modalInput} value={newEvent.title}
              onChangeText={t => setNewEvent({ ...newEvent, title: t })} placeholder="e.g., Court Hearing" placeholderTextColor="#999" />

            <Text style={styles.modalLabel}>Description</Text>
            <TextInput style={[styles.modalInput, styles.textArea]} value={newEvent.description}
              onChangeText={t => setNewEvent({ ...newEvent, description: t })} placeholder="Event details..." placeholderTextColor="#999" multiline numberOfLines={3} />

            <Text style={styles.modalLabel}>Location</Text>
            <TextInput style={styles.modalInput} value={newEvent.location}
              onChangeText={t => setNewEvent({ ...newEvent, location: t })} placeholder="e.g., Courthouse Room 101" placeholderTextColor="#999" />

            <View style={styles.dateTimeRow}>
              <DatePickerInput label="Start Date *" value={newEvent.startDate}
                onChange={d => setNewEvent({ ...newEvent, startDate: d })}
                placeholder="Select date" minDate={moment().format('YYYY-MM-DD')} style={styles.dateTimeHalf} />
              <TimePickerInput label="Start Time *" value={newEvent.startTime}
                onChange={t => setNewEvent({ ...newEvent, startTime: t })}
                placeholder="Select time" style={styles.dateTimeHalf} />
            </View>

            <View style={styles.dateTimeRow}>
              <DatePickerInput label="End Date" value={newEvent.endDate}
                onChange={d => setNewEvent({ ...newEvent, endDate: d })}
                placeholder="Select date" minDate={newEvent.startDate || moment().format('YYYY-MM-DD')} style={styles.dateTimeHalf} />
              <TimePickerInput label="End Time" value={newEvent.endTime}
                onChange={t => setNewEvent({ ...newEvent, endTime: t })}
                placeholder="Select time" style={styles.dateTimeHalf} />
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleAddEvent}>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Create Event</Text>
            </TouchableOpacity>
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderRequestDetailModal = () => {
    if (!selectedRequest) return null;
    const req = selectedRequest.eventRequest || selectedRequest;
    const dates = selectedRequest.proposedDates || [];

    return (
      <Modal visible={showRequestDetailModal} animationType="slide" transparent onRequestClose={() => setShowRequestDetailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Icon name="calendar-question" size={24} color="#FFD700" />
              <Text style={styles.modalTitle}>Event Request</Text>
              <TouchableOpacity onPress={() => setShowRequestDetailModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <Text style={styles.requestDetailTitle}>{req.title}</Text>
              <Text style={styles.requestDetailSub}>From: {req.lawFirmName || selectedRequest.lawFirmName || 'Law Firm'}</Text>
              {req.description && <Text style={styles.requestDetailDesc}>{req.description}</Text>}

              <View style={[styles.statusRow, { backgroundColor: getStatusColor(req.status) + '20' }]}>
                <Text style={[styles.statusRowText, { color: getStatusColor(req.status) }]}>
                  {getRequestStatusLabel(req.status)}
                </Text>
              </View>

              {req.status === 'pending' && (
                <View style={styles.proposeDatesSection}>
                  <Text style={styles.modalLabel}>Propose 3 Available Dates</Text>
                  <Text style={styles.hintText}>Select dates and times for your availability</Text>
                  {proposedDates.map((d, i) => (
                    <View key={i} style={styles.dateProposalRow}>
                      <Text style={styles.dateProposalLabel}>Option {i + 1}</Text>
                      <View style={styles.dateTimeRow}>
                        <DatePickerInput label="Start Date" value={d.startTime ? moment(d.startTime).format('YYYY-MM-DD') : ''}
                          onChange={dateStr => {
                            const newDates = [...proposedDates];
                            const existingTime = d.startTime ? moment(d.startTime).format('HH:mm') : '09:00';
                            const parsed = moment(dateStr + ' ' + existingTime, 'YYYY-MM-DD HH:mm');
                            newDates[i].startTime = parsed.isValid() ? parsed.toDate() : null;
                            if (parsed.isValid() && req.durationMinutes) {
                              newDates[i].endTime = moment(parsed).add(req.durationMinutes, 'minutes').toDate();
                            }
                            setProposedDates(newDates);
                          }}
                          placeholder="Select date" minDate={moment().format('YYYY-MM-DD')} style={styles.dateTimeHalf} />
                        <TimePickerInput label="Start Time" value={d.startTime ? moment(d.startTime).format('HH:mm') : ''}
                          onChange={timeStr => {
                            const newDates = [...proposedDates];
                            const existingDate = d.startTime ? moment(d.startTime).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
                            const parsed = moment(existingDate + ' ' + timeStr, 'YYYY-MM-DD HH:mm');
                            newDates[i].startTime = parsed.isValid() ? parsed.toDate() : null;
                            if (parsed.isValid() && req.durationMinutes) {
                              newDates[i].endTime = moment(parsed).add(req.durationMinutes, 'minutes').toDate();
                            }
                            setProposedDates(newDates);
                          }}
                          placeholder="Select time" style={styles.dateTimeHalf} />
                      </View>
                      <View style={styles.dateTimeRow}>
                        <DatePickerInput label="End Date" value={d.endTime ? moment(d.endTime).format('YYYY-MM-DD') : ''}
                          onChange={dateStr => {
                            const newDates = [...proposedDates];
                            const existingTime = d.endTime ? moment(d.endTime).format('HH:mm') : '10:00';
                            const parsed = moment(dateStr + ' ' + existingTime, 'YYYY-MM-DD HH:mm');
                            newDates[i].endTime = parsed.isValid() ? parsed.toDate() : null;
                            setProposedDates(newDates);
                          }}
                          placeholder="Select date" minDate={moment().format('YYYY-MM-DD')} style={styles.dateTimeHalf} />
                        <TimePickerInput label="End Time" value={d.endTime ? moment(d.endTime).format('HH:mm') : ''}
                          onChange={timeStr => {
                            const newDates = [...proposedDates];
                            const existingDate = d.endTime ? moment(d.endTime).format('YYYY-MM-DD') : moment().format('YYYY-MM-DD');
                            const parsed = moment(existingDate + ' ' + timeStr, 'YYYY-MM-DD HH:mm');
                            newDates[i].endTime = parsed.isValid() ? parsed.toDate() : null;
                            setProposedDates(newDates);
                          }}
                          placeholder="Select time" style={styles.dateTimeHalf} />
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.confirmButton} onPress={handleSubmitDates}>
                    <Icon name="send" size={20} color="#fff" />
                    <Text style={styles.confirmButtonText}>Submit Dates</Text>
                  </TouchableOpacity>
                </View>
              )}

              {req.status === 'dates_offered' && dates.length > 0 && (
                <View style={styles.proposeDatesSection}>
                  <Text style={styles.modalLabel}>Select a Date</Text>
                  {dates.map((d, i) => (
                    <TouchableOpacity key={d.id || i} style={styles.offeredDateCard} onPress={() => handleSelectOfferedDate(d.id)}>
                      <Icon name="calendar-check" size={20} color="#FFD700" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.offeredDateText}>
                          {moment(d.proposedStartTime).format('MMM D, YYYY h:mm A')} - {moment(d.proposedEndTime).format('h:mm A')}
                        </Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="#FFD700" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  const upcomingCount = useMemo(() => {
    const today = moment().format('YYYY-MM-DD');
    return allItems.filter(i => i.date >= today && i.status !== 'cancelled' && i.status !== 'completed').length;
  }, [allItems]);

  const pendingRequestCount = useMemo(() => {
    return eventRequests.filter(r => r.status === 'pending' || r.status === 'dates_offered').length;
  }, [eventRequests]);

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingScreenText}>Loading your calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Icon name="arrow-left" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="calendar-month" size={28} color="#FFD700" />
          <Text style={styles.headerTitle}>Calendar</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'calendar' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('calendar')}>
            <Icon name="calendar-month" size={18} color={viewMode === 'calendar' ? '#0d2f54' : '#FFD700'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleBtn, viewMode === 'agenda' && styles.viewToggleBtnActive]}
            onPress={() => setViewMode('agenda')}>
            <Icon name="view-list" size={18} color={viewMode === 'agenda' ? '#0d2f54' : '#FFD700'} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowQuickActions(!showQuickActions)}>
            <Icon name={showQuickActions ? 'close' : 'plus'} size={24} color="#FFD700" />
          </TouchableOpacity>
        </View>
      </View>

      {showQuickActions && renderQuickActions()}

      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {FILTER_TABS.map(tab => (
            <TouchableOpacity key={tab.key}
              style={[styles.filterChip, activeFilter === tab.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(tab.key)}>
              <Icon name={tab.icon} size={14} color={activeFilter === tab.key ? '#0d2f54' : '#a0aec0'} />
              <Text style={[styles.filterChipText, activeFilter === tab.key && styles.filterChipTextActive]}>
                {tab.label}
                {tab.key === 'requests' && pendingRequestCount > 0 ? ` (${pendingRequestCount})` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {viewMode === 'calendar' ? (
          <>
            <View style={styles.calendarSection}>
              <Calendar
                current={selectedDate}
                onDayPress={(day) => setSelectedDate(day.dateString)}
                markingType="multi-dot"
                markedDates={markedDates}
                theme={calendarTheme}
              />
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#10b981' }]} /><Text style={styles.legendText}>Medical</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#3b82f6' }]} /><Text style={styles.legendText}>Law Firm</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>Tasks</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#8b5cf6' }]} /><Text style={styles.legendText}>Requests</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#e74c3c' }]} /><Text style={styles.legendText}>Personal</Text></View>
            </View>

            <View style={styles.daySection}>
              <View style={styles.daySectionHeader}>
                <Text style={styles.daySectionTitle}>
                  {moment(selectedDate).format('dddd, MMMM D')}
                </Text>
                <Text style={styles.daySectionCount}>
                  {itemsForSelectedDate.length} {itemsForSelectedDate.length === 1 ? 'item' : 'items'}
                </Text>
              </View>

              {itemsForSelectedDate.length === 0 ? (
                <View style={styles.emptyDay}>
                  <Icon name="calendar-blank" size={48} color="#4a5568" />
                  <Text style={styles.emptyDayText}>Nothing scheduled</Text>
                  <Text style={styles.emptyDaySubtext}>Tap + to add an event</Text>
                </View>
              ) : (
                itemsForSelectedDate.map(item => renderItemCard(item))
              )}
            </View>
          </>
        ) : (
          <View style={styles.agendaContainer}>
            <View style={styles.agendaHeader}>
              <Icon name="view-list" size={22} color="#FFD700" />
              <Text style={styles.agendaHeaderTitle}>All Upcoming Events</Text>
              <View style={styles.agendaCountBadge}>
                <Text style={styles.agendaCountText}>
                  {agendaGrouped.reduce((sum, g) => sum + g.items.length, 0)}
                </Text>
              </View>
            </View>

            {agendaGrouped.length === 0 ? (
              <View style={styles.emptyDay}>
                <Icon name="calendar-blank" size={48} color="#4a5568" />
                <Text style={styles.emptyDayText}>No upcoming events</Text>
                <Text style={styles.emptyDaySubtext}>Tap + to add an event</Text>
              </View>
            ) : (
              agendaGrouped.map(group => {
                const isToday = group.date === moment().format('YYYY-MM-DD');
                const isTomorrow = group.date === moment().add(1, 'day').format('YYYY-MM-DD');
                const dateLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : moment(group.date).format('ddd, MMM D');
                return (
                  <View key={group.date} style={styles.agendaDateGroup}>
                    <View style={styles.agendaDateRow}>
                      <View style={[styles.agendaDateBubble, isToday && styles.agendaDateBubbleToday]}>
                        <Text style={[styles.agendaDateDay, isToday && styles.agendaDateDayToday]}>
                          {moment(group.date).format('D')}
                        </Text>
                        <Text style={[styles.agendaDateMonth, isToday && styles.agendaDateMonthToday]}>
                          {moment(group.date).format('MMM')}
                        </Text>
                      </View>
                      <View style={styles.agendaDateInfo}>
                        <Text style={[styles.agendaDateLabel, isToday && { color: '#FFD700' }]}>{dateLabel}</Text>
                        <Text style={styles.agendaDateSublabel}>
                          {group.items.length} {group.items.length === 1 ? 'event' : 'events'}
                        </Text>
                      </View>
                    </View>
                    {group.items.map(item => renderItemCard(item))}
                  </View>
                );
              })
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {renderBookMedicalModal()}
      {renderBookLawFirmModal()}
      {renderAddEventModal()}
      {renderRequestDetailModal()}
    </View>
  );
};

const calendarTheme = {
  backgroundColor: 'transparent',
  calendarBackground: 'rgba(255, 255, 255, 0.05)',
  textSectionTitleColor: '#FFD700',
  selectedDayBackgroundColor: '#1a5490',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#FFD700',
  dayTextColor: '#ffffff',
  textDisabledColor: '#666',
  monthTextColor: '#FFD700',
  arrowColor: '#FFD700',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a1628' },
  loadingScreen: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a1628' },
  loadingScreenText: { color: '#fff', marginTop: 12, fontSize: 16 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#0d2f54', padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 8 } })
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,215,0,0.2)', alignItems: 'center', justifyContent: 'center' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFD700' },
  quickActionsBar: {
    flexDirection: 'row', justifyContent: 'space-around', padding: 12,
    backgroundColor: '#0d2f54', borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.2)'
  },
  quickActionButton: { alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)' },
  quickActionLabel: { color: '#fff', fontSize: 11, fontWeight: '600' },
  filterBar: { paddingVertical: 10, backgroundColor: '#0d2f54' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)'
  },
  filterChipActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  filterChipText: { fontSize: 13, color: '#a0aec0' },
  filterChipTextActive: { color: '#0d2f54', fontWeight: '600' },
  scrollView: { flex: 1 },
  calendarSection: { margin: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', padding: 8 },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, paddingVertical: 8, gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: '#a0aec0', fontSize: 11 },
  daySection: { marginHorizontal: 16, marginTop: 8 },
  daySectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  daySectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700' },
  daySectionCount: { color: '#a0aec0', fontSize: 13 },
  emptyDay: { alignItems: 'center', paddingVertical: 32 },
  emptyDayText: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptyDaySubtext: { color: '#666', fontSize: 13, marginTop: 4 },
  itemCard: { padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.15)', marginBottom: 10 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemTypeBadge: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  itemSubtitle: { color: '#a0aec0', fontSize: 12, marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  sharedSourceBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: 'rgba(139, 92, 246, 0.3)' },
  sharedSourceText: { fontSize: 10, fontWeight: '600', color: '#c4b5fd' },
  syncedBadge: { backgroundColor: '#10b981', width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  itemDetails: { marginTop: 8, gap: 4 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { color: '#d4d4d4', fontSize: 13 },
  itemDescription: { color: '#a0aec0', fontSize: 12, fontStyle: 'italic', marginTop: 6 },
  coinRewardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  coinRewardText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
  cancelBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '600' },
  syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#1a5490' },
  unsyncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#6b7280' },
  syncBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  deleteBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#ef4444' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  actionBtnText: { color: '#FFD700', fontSize: 12, fontWeight: '600' },
  upcomingSection: { marginHorizontal: 16, marginTop: 24 },
  upcomingSectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', marginBottom: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#0d2f54', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.2)' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', flex: 1, marginLeft: 12 },
  modalBody: { padding: 20 },
  modalLabel: { color: '#FFD700', fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  modalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 14 },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  providerChip: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', marginRight: 8 },
  providerChipActive: { borderColor: '#FFD700', backgroundColor: 'rgba(255,215,0,0.1)' },
  providerChipText: { color: '#a0aec0', fontSize: 13, maxWidth: 120 },
  providerChipTextActive: { color: '#FFD700', fontWeight: '600' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  slotButton: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, backgroundColor: 'rgba(26,84,144,0.5)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' },
  slotButtonActive: { backgroundColor: '#1a5490', borderColor: '#FFD700' },
  slotTime: { color: '#fff', fontSize: 13, fontWeight: '600' },
  noSlotsText: { color: '#666', fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  typesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  typeBtnActive: { backgroundColor: 'rgba(255,215,0,0.15)', borderColor: '#FFD700' },
  typeBtnText: { color: '#a0aec0', fontSize: 12 },
  typeBtnTextActive: { color: '#FFD700', fontWeight: '600' },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 12, backgroundColor: '#1a5490', marginTop: 8 },
  confirmButtonDisabled: { opacity: 0.6 },
  confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  emptyBox: { padding: 20, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, marginBottom: 16 },
  emptyBoxText: { color: '#666', fontSize: 14 },
  requestDetailTitle: { color: '#FFD700', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  requestDetailSub: { color: '#a0aec0', fontSize: 14, marginBottom: 8 },
  requestDetailDesc: { color: '#d4d4d4', fontSize: 14, marginBottom: 12 },
  statusRow: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, marginBottom: 16, alignSelf: 'flex-start' },
  statusRowText: { fontSize: 13, fontWeight: '600' },
  proposeDatesSection: { marginTop: 8 },
  hintText: { color: '#666', fontSize: 12, marginBottom: 12 },
  dateProposalRow: { marginBottom: 12 },
  dateProposalLabel: { color: '#FFD700', fontSize: 13, fontWeight: '600', marginBottom: 4 },
  dateProposalInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 6 },
  offeredDateCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.1)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', marginBottom: 8 },
  offeredDateText: { color: '#fff', fontSize: 14 },
  viewToggleBtn: {
    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)'
  },
  viewToggleBtnActive: { backgroundColor: '#FFD700', borderColor: '#FFD700' },
  agendaContainer: { marginHorizontal: 16, marginTop: 12 },
  agendaHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,215,0,0.2)'
  },
  agendaHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFD700', flex: 1 },
  agendaCountBadge: {
    backgroundColor: '#1a5490', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12,
    minWidth: 28, alignItems: 'center'
  },
  agendaCountText: { color: '#FFD700', fontSize: 13, fontWeight: 'bold' },
  agendaDateGroup: { marginBottom: 20 },
  agendaDateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  agendaDateBubble: {
    width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)'
  },
  agendaDateBubbleToday: { backgroundColor: 'rgba(255,215,0,0.15)', borderColor: '#FFD700' },
  agendaDateDay: { color: '#fff', fontSize: 18, fontWeight: 'bold', lineHeight: 20 },
  agendaDateDayToday: { color: '#FFD700' },
  agendaDateMonth: { color: '#a0aec0', fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
  agendaDateMonthToday: { color: '#FFD700' },
  agendaDateInfo: { flex: 1 },
  agendaDateLabel: { color: '#fff', fontSize: 15, fontWeight: '600' },
  agendaDateSublabel: { color: '#a0aec0', fontSize: 12, marginTop: 2 },
  dateTimeRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  dateTimeHalf: { flex: 1 },
});

export default UnifiedCalendarScreen;
