import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, TextInput, Alert, ActivityIndicator, Platform
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

const APPOINTMENT_TYPES = [
  { value: 'Initial Consultation', icon: 'account-search' },
  { value: 'Follow-up', icon: 'calendar-check' },
  { value: 'Treatment', icon: 'medical-bag' },
  { value: 'Evaluation', icon: 'clipboard-text' },
  { value: 'Therapy Session', icon: 'heart-pulse' },
  { value: 'Imaging/X-Ray', icon: 'radioactive' },
  { value: 'Other', icon: 'dots-horizontal' }
];

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

  const patientId = user?.id;

  useEffect(() => {
    loadConnectedProviders();
    loadMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedProvider && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedProvider, selectedDate]);

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

        const marked = {};
        appointments.forEach(appt => {
          marked[appt.appointment_date] = {
            marked: true,
            dotColor: appt.status === 'confirmed' ? '#10b981' : '#f59e0b'
          };
        });
        setMarkedDates(marked);
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    }
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

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Icon name="arrow-left" size={24} color="#FFD700" />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Icon name="hospital-building" size={28} color="#FFD700" />
        <Text style={styles.headerTitle}>Book Appointment</Text>
      </View>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabBar}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'book' && styles.activeTab]}
        onPress={() => setActiveTab('book')}
      >
        <Icon name="calendar-plus" size={20} color={activeTab === 'book' ? '#FFD700' : '#a0aec0'} />
        <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>Book New</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
        onPress={() => setActiveTab('appointments')}
      >
        <Icon name="calendar-star" size={20} color={activeTab === 'appointments' ? '#FFD700' : '#a0aec0'} />
        <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>My Appointments</Text>
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
        ) : (
          renderMyAppointments()
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {renderBookingModal()}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
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
    fontSize: 14,
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
