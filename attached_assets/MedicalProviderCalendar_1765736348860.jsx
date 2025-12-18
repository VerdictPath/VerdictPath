// MedicalProviderCalendar.jsx
// Verdict Path Medical Provider Calendar Component
// Pirate-themed with glass morphism design

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MedicalProviderCalendar = ({ providerId, navigation }) => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [appointments, setAppointments] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [blockedTimes, setBlockedTimes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState({});
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  
  // Modals
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadCalendarData();
  }, [selectedDate]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      const startDate = moment(selectedDate).startOf('month').format('YYYY-MM-DD');
      const endDate = moment(selectedDate).endOf('month').format('YYYY-MM-DD');

      const response = await fetch(
        `${process.env.API_URL}/api/providers/${providerId}/availability?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();

      setAvailability(data.recurring);
      setBlockedTimes(data.blocked);
      setAppointments(data.appointments);

      // Generate marked dates for calendar
      const marked = generateMarkedDates(data.appointments, data.blocked);
      setMarkedDates(marked);

      setLoading(false);
    } catch (error) {
      console.error('Error loading calendar data:', error);
      Alert.alert('Error', 'Failed to load calendar data');
      setLoading(false);
    }
  };

  const generateMarkedDates = (appts, blocked) => {
    const marked = {};
    
    // Mark appointments
    appts.forEach(appt => {
      const date = appt.appointment_date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      
      // Color code by status
      const color = appt.status === 'confirmed' ? '#10b981' : 
                    appt.status === 'pending' ? '#f59e0b' : 
                    '#6b7280';
      
      marked[date].dots.push({ color });
    });

    // Mark blocked times
    blocked.forEach(block => {
      const startDate = moment(block.start_datetime).format('YYYY-MM-DD');
      const endDate = moment(block.end_datetime).format('YYYY-MM-DD');
      
      let current = moment(startDate);
      while (current.isSameOrBefore(endDate)) {
        const date = current.format('YYYY-MM-DD');
        if (!marked[date]) {
          marked[date] = { dots: [] };
        }
        marked[date].dots.push({ color: '#ef4444' });
        current.add(1, 'day');
      }
    });

    return marked;
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    setViewMode('day');
  };

  return (
    <View style={styles.container}>
      {/* Pirate-themed Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="anchor" size={32} color="#FFD700" />
          <Text style={styles.headerTitle}>Medical Calendar</Text>
          <Icon name="ship-wheel" size={28} color="#FFD700" />
        </View>
        <Text style={styles.headerSubtitle}>Chart Your Course 🏴‍☠️</Text>
      </View>

      {/* View Mode Selector */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'month' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('month')}
        >
          <Icon name="calendar-month" size={20} color={viewMode === 'month' ? '#FFD700' : '#fff'} />
          <Text style={[styles.viewModeText, viewMode === 'month' && styles.viewModeTextActive]}>
            Month
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'week' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('week')}
        >
          <Icon name="calendar-week" size={20} color={viewMode === 'week' ? '#FFD700' : '#fff'} />
          <Text style={[styles.viewModeText, viewMode === 'week' && styles.viewModeTextActive]}>
            Week
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'day' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('day')}
        >
          <Icon name="calendar-today" size={20} color={viewMode === 'day' ? '#FFD700' : '#fff'} />
          <Text style={[styles.viewModeText, viewMode === 'day' && styles.viewModeTextActive]}>
            Day
          </Text>
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowAvailabilityModal(true)}
        >
          <Icon name="clock-outline" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Set Hours</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowBlockTimeModal(true)}
        >
          <Icon name="block-helper" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Block Time</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => setShowImportModal(true)}
        >
          <Icon name="upload" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Import</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading calendar...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {/* Calendar View */}
          {viewMode === 'month' && (
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
          )}

          {/* Day View - Shows time slots and appointments */}
          {viewMode === 'day' && (
            <DayView
              date={selectedDate}
              appointments={appointments.filter(
                a => a.appointment_date === selectedDate
              )}
              availability={availability}
              blockedTimes={blockedTimes}
              providerId={providerId}
              onRefresh={loadCalendarData}
            />
          )}

          {/* Week View */}
          {viewMode === 'week' && (
            <WeekView
              selectedDate={selectedDate}
              appointments={appointments}
              onDayPress={setSelectedDate}
            />
          )}

          {/* Legend */}
          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>⚓ Legend</Text>
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
        </ScrollView>
      )}

      {/* Modals */}
      <AvailabilityModal
        visible={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        providerId={providerId}
        onSave={loadCalendarData}
      />

      <BlockTimeModal
        visible={showBlockTimeModal}
        onClose={() => setShowBlockTimeModal(false)}
        providerId={providerId}
        onSave={loadCalendarData}
      />

      <ImportCalendarModal
        visible={showImportModal}
        onClose={() => setShowImportModal(false)}
        providerId={providerId}
        onImport={loadCalendarData}
      />
    </View>
  );
};

// Day View Component
const DayView = ({ date, appointments, availability, blockedTimes, providerId, onRefresh }) => {
  const dayOfWeek = moment(date).day();
  const dayAvailability = availability.find(a => a.day_of_week === dayOfWeek);

  const timeSlots = generateTimeSlots(dayAvailability, appointments, blockedTimes, date);

  return (
    <View style={styles.dayViewContainer}>
      <View style={styles.dayViewHeader}>
        <Icon name="calendar-star" size={24} color="#FFD700" />
        <Text style={styles.dayViewTitle}>
          {moment(date).format('dddd, MMMM Do, YYYY')}
        </Text>
      </View>

      {!dayAvailability ? (
        <View style={styles.noAvailabilityContainer}>
          <Icon name="skull-crossbones" size={48} color="#666" />
          <Text style={styles.noAvailabilityText}>
            No availability set for this day
          </Text>
          <Text style={styles.noAvailabilitySubtext}>
            Set your hours to start accepting appointments
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.timeSlotsContainer}>
          {timeSlots.map((slot, index) => (
            <TimeSlot
              key={index}
              slot={slot}
              providerId={providerId}
              date={date}
              onRefresh={onRefresh}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// Time Slot Component
const TimeSlot = ({ slot, providerId, date, onRefresh }) => {
  const handleSlotPress = () => {
    if (slot.appointment) {
      // Show appointment details
      Alert.alert(
        'Appointment Details',
        `Patient: ${slot.appointment.patient_first_name} ${slot.appointment.patient_last_name}\n` +
        `Time: ${moment(slot.startTime, 'HH:mm').format('h:mm A')} - ${moment(slot.endTime, 'HH:mm').format('h:mm A')}\n` +
        `Status: ${slot.appointment.status}\n` +
        `Type: ${slot.appointment.appointment_type || 'N/A'}`,
        [
          { text: 'Close', style: 'cancel' },
          {
            text: 'Cancel Appointment',
            style: 'destructive',
            onPress: () => cancelAppointment(slot.appointment.id, onRefresh)
          }
        ]
      );
    }
  };

  const getSlotStyle = () => {
    if (slot.appointment) {
      return slot.appointment.status === 'confirmed'
        ? styles.slotConfirmed
        : styles.slotPending;
    }
    if (slot.blocked) return styles.slotBlocked;
    return styles.slotAvailable;
  };

  const getSlotIcon = () => {
    if (slot.appointment) return 'account-check';
    if (slot.blocked) return 'block-helper';
    return 'calendar-blank';
  };

  return (
    <TouchableOpacity
      style={[styles.timeSlot, getSlotStyle()]}
      onPress={handleSlotPress}
      disabled={!slot.appointment}
    >
      <View style={styles.timeSlotTime}>
        <Text style={styles.timeSlotTimeText}>
          {moment(slot.startTime, 'HH:mm').format('h:mm A')}
        </Text>
      </View>

      <View style={styles.timeSlotContent}>
        <Icon name={getSlotIcon()} size={24} color="#fff" />
        {slot.appointment ? (
          <View style={styles.appointmentInfo}>
            <Text style={styles.appointmentPatientName}>
              {slot.appointment.patient_first_name} {slot.appointment.patient_last_name}
            </Text>
            <Text style={styles.appointmentType}>
              {slot.appointment.appointment_type || 'Medical Appointment'}
            </Text>
          </View>
        ) : slot.blocked ? (
          <Text style={styles.slotLabel}>Blocked - {slot.blocked.reason}</Text>
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
  );
};

// Week View Component
const WeekView = ({ selectedDate, appointments, onDayPress }) => {
  const weekStart = moment(selectedDate).startOf('week');
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    weekStart.clone().add(i, 'days')
  );

  return (
    <View style={styles.weekViewContainer}>
      {weekDays.map(day => {
        const dayAppointments = appointments.filter(
          a => a.appointment_date === day.format('YYYY-MM-DD')
        );

        return (
          <TouchableOpacity
            key={day.format('YYYY-MM-DD')}
            style={styles.weekDay}
            onPress={() => onDayPress(day.format('YYYY-MM-DD'))}
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

// Availability Modal Component
const AvailabilityModal = ({ visible, onClose, providerId, onSave }) => {
  const [selectedDay, setSelectedDay] = useState(1); // Monday
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');

  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ];

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/providers/${providerId}/availability`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek: selectedDay,
            startTime,
            endTime,
            isRecurring: true
          })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Availability saved!');
        onSave();
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save availability');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>⚓ Set Availability</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Day of Week</Text>
            <View style={styles.daySelector}>
              {daysOfWeek.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayButton,
                    selectedDay === day.value && styles.dayButtonActive
                  ]}
                  onPress={() => setSelectedDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      selectedDay === day.value && styles.dayButtonTextActive
                    ]}
                  >
                    {day.label.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Start Time</Text>
            <TextInput
              style={styles.modalInput}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Time</Text>
            <TextInput
              style={styles.modalInput}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="17:00"
              placeholderTextColor="#999"
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Icon name="content-save" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Availability</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Block Time Modal
const BlockTimeModal = ({ visible, onClose, providerId, onSave }) => {
  const [startDate, setStartDate] = useState(moment().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(moment().format('YYYY-MM-DD'));
  const [reason, setReason] = useState('');

  const handleSave = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/providers/${providerId}/block-time`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDatetime: `${startDate}T00:00:00`,
            endDatetime: `${endDate}T23:59:59`,
            reason
          })
        }
      );

      if (response.ok) {
        Alert.alert('Success', 'Time blocked successfully!');
        onSave();
        onClose();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to block time');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🚫 Block Time</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalLabel}>Start Date</Text>
            <TextInput
              style={styles.modalInput}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>End Date</Text>
            <TextInput
              style={styles.modalInput}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#999"
            />

            <Text style={styles.modalLabel}>Reason</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={reason}
              onChangeText={setReason}
              placeholder="Vacation, Conference, etc."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Icon name="block-helper" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Block Time</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// Import Calendar Modal
const ImportCalendarModal = ({ visible, onClose, providerId, onImport }) => {
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    // In a real implementation, this would use DocumentPicker
    Alert.alert(
      'Import Calendar',
      'Select your calendar file (.ics) from Google Calendar, Outlook, or Apple Calendar',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Choose File',
          onPress: async () => {
            // Placeholder - would use react-native-document-picker
            setImporting(true);
            setTimeout(() => {
              setImporting(false);
              Alert.alert('Success', 'Calendar imported successfully!');
              onImport();
              onClose();
            }, 2000);
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>📤 Import Calendar</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.importInfo}>
              <Icon name="information" size={48} color="#FFD700" />
              <Text style={styles.importInfoText}>
                Import your existing calendar from:
              </Text>
              <Text style={styles.importSource}>• Google Calendar (.ics)</Text>
              <Text style={styles.importSource}>• Outlook Calendar (.ics)</Text>
              <Text style={styles.importSource}>• Apple Calendar (.ics)</Text>
              <Text style={styles.importInfoSubtext}>
                Your availability will be automatically configured based on your calendar.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleImport}
              disabled={importing}
            >
              {importing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Icon name="upload" size={20} color="#fff" />
                  <Text style={styles.saveButtonText}>Choose Calendar File</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Helper Functions
const generateTimeSlots = (availability, appointments, blockedTimes, date) => {
  if (!availability) return [];

  const slots = [];
  const start = moment(availability.start_time, 'HH:mm:ss');
  const end = moment(availability.end_time, 'HH:mm:ss');
  const slotDuration = 30; // 30 minutes

  let current = start.clone();

  while (current.clone().add(slotDuration, 'minutes').isSameOrBefore(end)) {
    const slotStart = current.format('HH:mm');
    const slotEnd = current.clone().add(slotDuration, 'minutes').format('HH:mm');

    // Check for appointment
    const appointment = appointments.find(a => 
      moment(a.start_time, 'HH:mm:ss').format('HH:mm') === slotStart
    );

    // Check if blocked
    const blocked = blockedTimes.find(b => {
      const blockStart = moment(b.start_datetime);
      const blockEnd = moment(b.end_datetime);
      const slotTime = moment(`${date} ${slotStart}`);
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

const cancelAppointment = async (appointmentId, onRefresh) => {
  try {
    const response = await fetch(
      `${process.env.API_URL}/api/appointments/${appointmentId}/cancel`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellationReason: 'Cancelled by provider' })
      }
    );

    if (response.ok) {
      Alert.alert('Success', 'Appointment cancelled');
      onRefresh();
    }
  } catch (error) {
    Alert.alert('Error', 'Failed to cancel appointment');
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628'
  },
  header: {
    background: 'linear-gradient(135deg, #1a5490 0%, #0d2f54 100%)',
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
  headerTitle: {
    fontSize: 28,
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
  appointmentType: {
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
  }
});

export default MedicalProviderCalendar;
