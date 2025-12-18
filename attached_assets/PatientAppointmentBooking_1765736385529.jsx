// PatientAppointmentBooking.jsx
// Verdict Path Patient Appointment Booking Component
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

const PatientAppointmentBooking = ({ patientId, providerId, caseId, lawFirmId, navigation }) => {
  const [selectedDate, setSelectedDate] = useState(moment().format('YYYY-MM-DD'));
  const [availableSlots, setAvailableSlots] = useState([]);
  const [myAppointments, setMyAppointments] = useState([]);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [appointmentType, setAppointmentType] = useState('');
  const [notes, setNotes] = useState('');
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadProviderInfo();
    loadMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadProviderInfo = async () => {
    try {
      const response = await fetch(
        `${process.env.API_URL}/api/providers/${providerId}`
      );
      const data = await response.json();
      setProviderInfo(data);
    } catch (error) {
      console.error('Error loading provider info:', error);
    }
  };

  const loadMyAppointments = async () => {
    try {
      const startDate = moment().startOf('month').format('YYYY-MM-DD');
      const endDate = moment().endOf('month').add(2, 'months').format('YYYY-MM-DD');

      const response = await fetch(
        `${process.env.API_URL}/api/patients/${patientId}/appointments?startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      setMyAppointments(data);

      // Mark appointment dates
      const marked = {};
      data.forEach(appt => {
        marked[appt.appointment_date] = {
          marked: true,
          dotColor: appt.status === 'confirmed' ? '#10b981' : '#f59e0b'
        };
      });
      setMarkedDates(marked);

      setLoading(false);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.API_URL}/api/providers/${providerId}/available-slots?date=${selectedDate}`
      );
      const data = await response.json();
      setAvailableSlots(data.slots || []);
      setLoading(false);
    } catch (error) {
      console.error('Error loading slots:', error);
      Alert.alert('Error', 'Failed to load available slots');
      setLoading(false);
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

    try {
      const response = await fetch(
        `${process.env.API_URL}/api/appointments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId,
            providerId,
            lawFirmId,
            caseId,
            appointmentDate: selectedDate,
            startTime: bookingSlot.startTime,
            endTime: bookingSlot.endTime,
            appointmentType,
            notes,
            createdBy: patientId
          })
        }
      );

      if (response.ok) {
        Alert.alert(
          'Success! 🏴‍☠️',
          'Your appointment has been requested. You\'ll receive a confirmation via email and SMS once the provider confirms.',
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
        Alert.alert('Error', 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert('Error', 'Failed to book appointment');
    }
  };

  const appointmentTypes = [
    { value: 'Initial Consultation', icon: 'account-search' },
    { value: 'Follow-up', icon: 'calendar-check' },
    { value: 'Treatment', icon: 'medical-bag' },
    { value: 'Evaluation', icon: 'clipboard-text' },
    { value: 'Therapy Session', icon: 'heart-pulse' },
    { value: 'Other', icon: 'dots-horizontal' }
  ];

  return (
    <View style={styles.container}>
      {/* Pirate-themed Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#FFD700" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Icon name="hospital-building" size={32} color="#FFD700" />
          <Text style={styles.headerTitle}>Book Appointment</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Provider Info Card */}
      {providerInfo && (
        <View style={styles.providerCard}>
          <View style={styles.providerIconContainer}>
            <Icon name="doctor" size={40} color="#FFD700" />
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{providerInfo.name}</Text>
            <Text style={styles.providerSpecialty}>{providerInfo.specialty}</Text>
            {providerInfo.address && (
              <Text style={styles.providerAddress}>{providerInfo.address}</Text>
            )}
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollView}>
        {/* Calendar */}
        <View style={styles.calendarSection}>
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
              markedDates={{
                ...markedDates,
                [selectedDate]: {
                  ...markedDates[selectedDate],
                  selected: true,
                  selectedColor: '#1a5490'
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

        {/* Available Time Slots */}
        <View style={styles.slotsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="clock-outline" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>
              Available Times - {moment(selectedDate).format('MMMM Do')}
            </Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FFD700" />
              <Text style={styles.loadingText}>Finding available slots...</Text>
            </View>
          ) : availableSlots.length === 0 ? (
            <View style={styles.noSlotsContainer}>
              <Icon name="skull-crossbones" size={48} color="#666" />
              <Text style={styles.noSlotsText}>
                No available slots for this date
              </Text>
              <Text style={styles.noSlotsSubtext}>
                Try selecting a different date, matey!
              </Text>
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

        {/* My Upcoming Appointments */}
        <View style={styles.myAppointmentsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar-star" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>My Upcoming Appointments</Text>
          </View>

          {myAppointments.length === 0 ? (
            <View style={styles.noAppointmentsContainer}>
              <Icon name="calendar-blank" size={48} color="#666" />
              <Text style={styles.noAppointmentsText}>
                No upcoming appointments
              </Text>
            </View>
          ) : (
            <View style={styles.appointmentsList}>
              {myAppointments
                .filter(a => moment(a.appointment_date).isSameOrAfter(moment(), 'day'))
                .sort((a, b) => moment(a.appointment_date).diff(moment(b.appointment_date)))
                .slice(0, 5)
                .map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onRefresh={loadMyAppointments}
                  />
                ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Booking Modal */}
      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚓ Book Appointment</Text>
              <TouchableOpacity onPress={() => setShowBookingModal(false)}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Selected Time Display */}
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

              {/* Appointment Type Selection */}
              <Text style={styles.modalLabel}>Type of Appointment</Text>
              <View style={styles.appointmentTypesGrid}>
                {appointmentTypes.map((type) => (
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
                        styles.appointmentTypeText,
                        appointmentType === type.value && styles.appointmentTypeTextActive
                      ]}
                    >
                      {type.value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Notes */}
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

              {/* Info Box */}
              <View style={styles.infoBox}>
                <Icon name="information" size={20} color="#FFD700" />
                <Text style={styles.infoText}>
                  You'll receive a confirmation via email and text message once the provider accepts your appointment request.
                </Text>
              </View>

              {/* Book Button */}
              <TouchableOpacity
                style={styles.bookButton}
                onPress={handleBookAppointment}
              >
                <Icon name="anchor" size={20} color="#fff" />
                <Text style={styles.bookButtonText}>Request Appointment</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment, onRefresh }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'confirmed': return 'check-circle';
      case 'pending': return 'clock-outline';
      case 'cancelled': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const handleCancel = () => {
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
                `${process.env.API_URL}/api/appointments/${appointment.id}/cancel`,
                {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    cancellationReason: 'Cancelled by patient'
                  })
                }
              );

              if (response.ok) {
                Alert.alert('Success', 'Appointment cancelled');
                onRefresh();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.appointmentCard}>
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
            {appointment.appointment_type}
          </Text>
        </View>

        <View style={styles.appointmentStatus}>
          <Icon
            name={getStatusIcon(appointment.status)}
            size={24}
            color={getStatusColor(appointment.status)}
          />
          <Text
            style={[
              styles.appointmentStatusText,
              { color: getStatusColor(appointment.status) }
            ]}
          >
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      {appointment.status !== 'cancelled' && (
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
        >
          <Icon name="close-circle-outline" size={16} color="#ef4444" />
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a1628'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFD700'
  },
  providerCard: {
    flexDirection: 'row',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 16
  },
  providerIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  providerInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  providerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 4
  },
  providerSpecialty: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 2
  },
  providerAddress: {
    fontSize: 12,
    color: '#999'
  },
  scrollView: {
    flex: 1
  },
  calendarSection: {
    margin: 16
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
  calendarContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    padding: 8
  },
  slotsSection: {
    margin: 16,
    marginTop: 0
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
  noSlotsContainer: {
    padding: 40,
    alignItems: 'center'
  },
  noSlotsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center'
  },
  noSlotsSubtext: {
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
  myAppointmentsSection: {
    margin: 16,
    marginTop: 0
  },
  noAppointmentsContainer: {
    padding: 40,
    alignItems: 'center'
  },
  noAppointmentsText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 12
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
  appointmentHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
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
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4
  },
  appointmentTime: {
    color: '#FFD700',
    fontSize: 14,
    marginBottom: 2
  },
  appointmentTypeText: {
    color: '#999',
    fontSize: 12
  },
  appointmentStatus: {
    alignItems: 'center',
    gap: 4
  },
  appointmentStatusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444'
  },
  cancelButtonText: {
    color: '#ef4444',
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
    maxHeight: '85%',
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
  selectedTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(26, 84, 144, 0.5)',
    borderWidth: 1,
    borderColor: '#FFD700',
    marginBottom: 24
  },
  selectedTimeInfo: {
    flex: 1
  },
  selectedDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  selectedTime: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12
  },
  appointmentTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24
  },
  appointmentTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: '45%'
  },
  appointmentTypeButtonActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#FFD700'
  },
  appointmentTypeText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    flex: 1
  },
  appointmentTypeTextActive: {
    color: '#FFD700',
    fontWeight: 'bold'
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16
  },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 24
  },
  infoText: {
    flex: 1,
    color: '#fff',
    fontSize: 12,
    lineHeight: 18
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1a5490',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700'
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default PatientAppointmentBooking;
