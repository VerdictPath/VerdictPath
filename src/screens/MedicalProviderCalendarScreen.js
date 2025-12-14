import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, Modal, Platform
} from 'react-native';
import { theme } from '../styles/theme';
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
  const [activeTab, setActiveTab] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [settings, setSettings] = useState(null);
  
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  const [newAvailability, setNewAvailability] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    slotDuration: 30,
    bufferMinutes: 15
  });
  
  const [newBlockedTime, setNewBlockedTime] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    blockType: 'personal',
    isAllDay: true
  });

  const providerId = user?.medicalProviderId || user?.id;

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
        fetchSettings()
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
      }
    } catch (error) {
      console.error('Error fetching blocked times:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const dateStr = formatDate(selectedDate);
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/appointments?date=${dateStr}`,
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

  const handleAddAvailability = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${providerId}/availability`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${user.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newAvailability)
        }
      );
      if (response.ok) {
        Alert.alert('Success', 'Availability added successfully!');
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
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to add availability');
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
            startDatetime: newBlockedTime.startDate,
            endDatetime: newBlockedTime.endDate,
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
          startDate: '',
          endDate: '',
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

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const isToday = (date) => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date) => {
    if (!date) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const hasAppointmentsOnDate = (date) => {
    if (!date) return false;
    return appointments.some(apt => 
      new Date(apt.appointment_date).toDateString() === date.toDateString()
    );
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const renderCalendar = () => {
    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)} style={styles.monthNavButton}>
            <Text style={styles.monthNavText}>{'<'}</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{monthName}</Text>
          <TouchableOpacity onPress={() => changeMonth(1)} style={styles.monthNavButton}>
            <Text style={styles.monthNavText}>{'>'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.weekDaysRow}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
            <Text key={idx} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.daysGrid}>
          {days.map((date, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.dayCell,
                isToday(date) && styles.todayCell,
                isSelected(date) && styles.selectedCell
              ]}
              onPress={() => date && setSelectedDate(date)}
              disabled={!date}
            >
              {date && (
                <>
                  <Text style={[
                    styles.dayText,
                    isToday(date) && styles.todayText,
                    isSelected(date) && styles.selectedDayText
                  ]}>
                    {date.getDate()}
                  </Text>
                  {hasAppointmentsOnDate(date) && (
                    <View style={styles.appointmentDot} />
                  )}
                </>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderAppointmentsList = () => {
    const dateAppointments = appointments.filter(apt =>
      new Date(apt.appointment_date).toDateString() === selectedDate.toDateString()
    );

    return (
      <View style={styles.appointmentsSection}>
        <Text style={styles.sectionTitle}>
          Appointments for {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </Text>
        
        {dateAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>No appointments scheduled</Text>
          </View>
        ) : (
          dateAppointments.map((apt) => (
            <TouchableOpacity
              key={apt.id}
              style={styles.appointmentCard}
              onPress={() => {
                setSelectedAppointment(apt);
                setShowAppointmentModal(true);
              }}
            >
              <View style={styles.appointmentTime}>
                <Text style={styles.timeText}>{formatTime(apt.start_time)}</Text>
                <Text style={styles.timeDivider}>-</Text>
                <Text style={styles.timeText}>{formatTime(apt.end_time)}</Text>
              </View>
              <View style={styles.appointmentDetails}>
                <Text style={styles.patientName}>
                  {apt.patient_first_name} {apt.patient_last_name}
                </Text>
                <Text style={styles.appointmentType}>{apt.appointment_type || 'Consultation'}</Text>
                {apt.law_firm_name && (
                  <Text style={styles.lawFirmText}>Via: {apt.law_firm_name}</Text>
                )}
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[apt.status] || '#6b7280' }]}>
                <Text style={styles.statusText}>{apt.status}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    );
  };

  const renderAvailabilityTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Weekly Availability</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAvailabilityModal(true)}
        >
          <Text style={styles.addButtonText}>+ Add Hours</Text>
        </TouchableOpacity>
      </View>
      
      {availability.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🕐</Text>
          <Text style={styles.emptyStateText}>No availability set</Text>
          <Text style={styles.emptyStateSubtext}>Add your working hours to allow patients to book appointments</Text>
        </View>
      ) : (
        availability.map((slot) => (
          <View key={slot.id} style={styles.availabilityCard}>
            <View style={styles.availabilityInfo}>
              <Text style={styles.dayName}>{DAYS_OF_WEEK[slot.day_of_week]}</Text>
              <Text style={styles.hoursText}>
                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
              </Text>
              <Text style={styles.slotInfo}>
                {slot.slot_duration_minutes || 30}min slots, {slot.buffer_minutes || 15}min buffer
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteAvailability(slot.id)}
            >
              <Text style={styles.deleteButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
      
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Blocked Time</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowBlockTimeModal(true)}
        >
          <Text style={styles.addButtonText}>+ Block Time</Text>
        </TouchableOpacity>
      </View>
      
      {blockedTimes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>🏖️</Text>
          <Text style={styles.emptyStateText}>No blocked time</Text>
        </View>
      ) : (
        blockedTimes.map((block) => (
          <View key={block.id} style={styles.blockedTimeCard}>
            <View style={styles.blockedTimeInfo}>
              <Text style={styles.blockedReason}>{block.reason || 'Blocked'}</Text>
              <Text style={styles.blockedDates}>
                {new Date(block.start_datetime).toLocaleDateString()} - {new Date(block.end_datetime).toLocaleDateString()}
              </Text>
              <Text style={styles.blockType}>{block.block_type}</Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteBlockedTime(block.id)}
            >
              <Text style={styles.deleteButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );

  const renderAvailabilityModal = () => (
    <Modal
      visible={showAvailabilityModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowAvailabilityModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Add Availability</Text>
          
          <Text style={styles.inputLabel}>Day of Week</Text>
          <View style={styles.daySelector}>
            {DAYS_OF_WEEK.map((day, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayOption,
                  newAvailability.dayOfWeek === idx && styles.dayOptionSelected
                ]}
                onPress={() => setNewAvailability({ ...newAvailability, dayOfWeek: idx })}
              >
                <Text style={[
                  styles.dayOptionText,
                  newAvailability.dayOfWeek === idx && styles.dayOptionTextSelected
                ]}>
                  {day.substring(0, 3)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={newAvailability.startTime}
                onChangeText={(text) => setNewAvailability({ ...newAvailability, startTime: text })}
                placeholder="09:00"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>End Time</Text>
              <TextInput
                style={styles.input}
                value={newAvailability.endTime}
                onChangeText={(text) => setNewAvailability({ ...newAvailability, endTime: text })}
                placeholder="17:00"
                placeholderTextColor="#666"
              />
            </View>
          </View>
          
          <View style={styles.timeRow}>
            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>Slot Duration (min)</Text>
              <TextInput
                style={styles.input}
                value={String(newAvailability.slotDuration)}
                onChangeText={(text) => setNewAvailability({ ...newAvailability, slotDuration: parseInt(text) || 30 })}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
            <View style={styles.timeInput}>
              <Text style={styles.inputLabel}>Buffer (min)</Text>
              <TextInput
                style={styles.input}
                value={String(newAvailability.bufferMinutes)}
                onChangeText={(text) => setNewAvailability({ ...newAvailability, bufferMinutes: parseInt(text) || 15 })}
                keyboardType="numeric"
                placeholderTextColor="#666"
              />
            </View>
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAvailabilityModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleAddAvailability}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderBlockTimeModal = () => (
    <Modal
      visible={showBlockTimeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowBlockTimeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Block Time</Text>
          
          <Text style={styles.inputLabel}>Start Date & Time</Text>
          <TextInput
            style={styles.input}
            value={newBlockedTime.startDate}
            onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, startDate: text })}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>End Date & Time</Text>
          <TextInput
            style={styles.input}
            value={newBlockedTime.endDate}
            onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, endDate: text })}
            placeholder="YYYY-MM-DD HH:MM"
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>Reason</Text>
          <TextInput
            style={styles.input}
            value={newBlockedTime.reason}
            onChangeText={(text) => setNewBlockedTime({ ...newBlockedTime, reason: text })}
            placeholder="Vacation, Conference, etc."
            placeholderTextColor="#666"
          />
          
          <Text style={styles.inputLabel}>Type</Text>
          <View style={styles.typeSelector}>
            {['personal', 'vacation', 'conference', 'other'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeOption,
                  newBlockedTime.blockType === type && styles.typeOptionSelected
                ]}
                onPress={() => setNewBlockedTime({ ...newBlockedTime, blockType: type })}
              >
                <Text style={[
                  styles.typeOptionText,
                  newBlockedTime.blockType === type && styles.typeOptionTextSelected
                ]}>
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBlockTimeModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleBlockTime}
            >
              <Text style={styles.saveButtonText}>Block</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderAppointmentModal = () => {
    if (!selectedAppointment) return null;
    
    return (
      <Modal
        visible={showAppointmentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Appointment Details</Text>
            
            <View style={styles.appointmentDetailRow}>
              <Text style={styles.detailLabel}>Patient:</Text>
              <Text style={styles.detailValue}>
                {selectedAppointment.patient_first_name} {selectedAppointment.patient_last_name}
              </Text>
            </View>
            
            <View style={styles.appointmentDetailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedAppointment.appointment_date).toLocaleDateString()}
              </Text>
            </View>
            
            <View style={styles.appointmentDetailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>
                {formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}
              </Text>
            </View>
            
            <View style={styles.appointmentDetailRow}>
              <Text style={styles.detailLabel}>Type:</Text>
              <Text style={styles.detailValue}>
                {selectedAppointment.appointment_type || 'Consultation'}
              </Text>
            </View>
            
            <View style={styles.appointmentDetailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[selectedAppointment.status] }]}>
                <Text style={styles.statusText}>{selectedAppointment.status}</Text>
              </View>
            </View>
            
            {selectedAppointment.patient_notes && (
              <View style={styles.notesSection}>
                <Text style={styles.detailLabel}>Patient Notes:</Text>
                <Text style={styles.notesText}>{selectedAppointment.patient_notes}</Text>
              </View>
            )}
            
            <View style={styles.actionButtons}>
              {selectedAppointment.status === 'pending' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => handleConfirmAppointment(selectedAppointment.id)}
                >
                  <Text style={styles.actionButtonText}>Confirm</Text>
                </TouchableOpacity>
              )}
              
              {selectedAppointment.status === 'confirmed' && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => handleCompleteAppointment(selectedAppointment.id, '')}
                >
                  <Text style={styles.actionButtonText}>Complete</Text>
                </TouchableOpacity>
              )}
              
              {['pending', 'confirmed'].includes(selectedAppointment.status) && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.cancelActionButton]}
                  onPress={() => {
                    Alert.prompt(
                      'Cancel Appointment',
                      'Please provide a reason:',
                      (reason) => handleCancelAppointment(selectedAppointment.id, reason),
                      'plain-text'
                    );
                  }}
                >
                  <Text style={styles.cancelActionButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
            
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => setShowAppointmentModal(false)}
            >
              <Text style={styles.closeModalButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.warmGold} />
        <Text style={styles.loadingText}>Loading calendar...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Calendar</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.activeTab]}
          onPress={() => setActiveTab('calendar')}
        >
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.activeTabText]}>
            Calendar
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'availability' && styles.activeTab]}
          onPress={() => setActiveTab('availability')}
        >
          <Text style={[styles.tabText, activeTab === 'availability' && styles.activeTabText]}>
            Availability
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'calendar' ? (
          <>
            {renderCalendar()}
            {renderAppointmentsList()}
          </>
        ) : (
          renderAvailabilityTab()
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
      
      {renderAvailabilityModal()}
      {renderBlockTimeModal()}
      {renderAppointmentModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a1628',
  },
  loadingText: {
    color: '#d4af37',
    marginTop: 10,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    backgroundColor: '#0d2f54',
    borderBottomWidth: 2,
    borderBottomColor: '#d4af37',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSpacer: {
    width: 60,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0d2f54',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#d4af37',
  },
  tabText: {
    color: '#a0aec0',
    fontSize: 16,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  monthNavButton: {
    padding: 8,
  },
  monthNavText: {
    color: '#d4af37',
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    color: '#d4af37',
    fontWeight: 'bold',
    fontSize: 14,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  todayCell: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
  },
  selectedCell: {
    backgroundColor: '#d4af37',
    borderRadius: 8,
  },
  dayText: {
    color: '#fff',
    fontSize: 14,
  },
  todayText: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  selectedDayText: {
    color: '#000',
    fontWeight: 'bold',
  },
  appointmentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginTop: 2,
  },
  appointmentsSection: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 16,
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  emptyStateText: {
    color: '#a0aec0',
    fontSize: 16,
  },
  emptyStateSubtext: {
    color: '#6b7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  appointmentTime: {
    marginRight: 16,
    alignItems: 'center',
  },
  timeText: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  timeDivider: {
    color: '#6b7280',
    fontSize: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  patientName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  appointmentType: {
    color: '#a0aec0',
    fontSize: 14,
  },
  lawFirmText: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  tabContent: {
    paddingBottom: 100,
  },
  addButton: {
    backgroundColor: '#d4af37',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  availabilityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  availabilityInfo: {
    flex: 1,
  },
  dayName: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  hoursText: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  slotInfo: {
    color: '#6b7280',
    fontSize: 12,
  },
  deleteButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
  },
  blockedTimeCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  blockedTimeInfo: {
    flex: 1,
  },
  blockedReason: {
    color: '#f87171',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  blockedDates: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  blockType: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1a2744',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#d4af37',
  },
  modalTitle: {
    color: '#d4af37',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  daySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  dayOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  dayOptionSelected: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  dayOptionText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
  },
  dayOptionTextSelected: {
    color: '#000',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  typeOptionSelected: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  typeOptionText: {
    color: '#a0aec0',
    fontSize: 12,
    fontWeight: '600',
  },
  typeOptionTextSelected: {
    color: '#000',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInput: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  cancelButtonText: {
    color: '#a0aec0',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#d4af37',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  appointmentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#a0aec0',
    fontSize: 14,
  },
  detailValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
  },
  notesText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10b981',
  },
  completeButton: {
    backgroundColor: '#6366f1',
  },
  cancelActionButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelActionButtonText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: 'bold',
  },
  closeModalButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  closeModalButtonText: {
    color: '#a0aec0',
    fontSize: 14,
  },
  bottomPadding: {
    height: 100,
  },
});

export default MedicalProviderCalendarScreen;
