import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  TextInput, Alert, Modal, Platform
} from 'react-native';
import { theme } from '../styles/theme';
import { API_BASE_URL } from '../config/api';

const APPOINTMENT_TYPES = [
  { id: 'consultation', label: 'Initial Consultation', icon: '🩺' },
  { id: 'follow_up', label: 'Follow-up Visit', icon: '📋' },
  { id: 'treatment', label: 'Treatment', icon: '💊' },
  { id: 'evaluation', label: 'Evaluation', icon: '📊' },
  { id: 'imaging', label: 'Imaging/X-Ray', icon: '🔬' }
];

const PatientAppointmentBookingScreen = ({ user, onNavigate, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [appointmentType, setAppointmentType] = useState('consultation');
  const [patientNotes, setPatientNotes] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [activeTab, setActiveTab] = useState('book');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [booking, setBooking] = useState(false);

  const patientId = user?.id;

  useEffect(() => {
    fetchConnectedProviders();
    fetchMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedProvider && selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedProvider, selectedDate]);

  const fetchConnectedProviders = async () => {
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
      console.error('Error fetching providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyAppointments = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/patients/${patientId}/appointments`,
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

  const fetchAvailableSlots = async () => {
    if (!selectedProvider || !selectedDate) return;
    
    setLoadingSlots(true);
    try {
      const dateStr = formatDate(selectedDate);
      const response = await fetch(
        `${API_BASE_URL}/api/medical-calendar/providers/${selectedProvider.id}/available-slots?date=${dateStr}`,
        { headers: { 'Authorization': `Bearer ${user.token}` } }
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.slots || []);
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedProvider || !selectedDate || !selectedSlot) {
      Alert.alert('Missing Information', 'Please select a provider, date, and time slot');
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
            appointmentDate: formatDate(selectedDate),
            startTime: selectedSlot.startTime,
            endTime: selectedSlot.endTime,
            appointmentType,
            patientNotes
          })
        }
      );

      if (response.ok) {
        Alert.alert(
          'Appointment Booked!',
          'Your appointment has been successfully scheduled. The provider will confirm shortly.',
          [{ text: 'OK', onPress: () => {
            setSelectedSlot(null);
            setPatientNotes('');
            setActiveTab('appointments');
            fetchMyAppointments();
          }}]
        );
      } else {
        const data = await response.json();
        Alert.alert('Error', data.error || 'Failed to book appointment');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to book appointment');
    } finally {
      setBooking(false);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
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
                fetchMyAppointments();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel appointment');
            }
          }
        }
      ]
    );
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

  const isPast = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date) => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
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

  const renderProviderSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Select Provider</Text>
      {providers.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>👨‍⚕️</Text>
          <Text style={styles.emptyStateText}>No connected providers</Text>
          <Text style={styles.emptyStateSubtext}>Connect with a medical provider first</Text>
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
                setSelectedDate(null);
                setSelectedSlot(null);
                setAvailableSlots([]);
              }}
            >
              <View style={styles.providerAvatar}>
                <Text style={styles.providerInitial}>
                  {provider.provider_name?.charAt(0) || 'P'}
                </Text>
              </View>
              <Text style={styles.providerName} numberOfLines={1}>
                {provider.provider_name}
              </Text>
              <Text style={styles.providerSpecialty} numberOfLines={1}>
                {provider.specialty || 'Medical Provider'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderCalendar = () => {
    if (!selectedProvider) return null;
    
    const days = getDaysInMonth(currentMonth);
    const monthName = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Date</Text>
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
                  isSelected(date) && styles.selectedCell,
                  isPast(date) && styles.pastCell
                ]}
                onPress={() => date && !isPast(date) && setSelectedDate(date)}
                disabled={!date || isPast(date)}
              >
                {date && (
                  <Text style={[
                    styles.dayText,
                    isToday(date) && styles.todayText,
                    isSelected(date) && styles.selectedDayText,
                    isPast(date) && styles.pastDayText
                  ]}>
                    {date.getDate()}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderTimeSlots = () => {
    if (!selectedDate) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Available Times</Text>
        {loadingSlots ? (
          <ActivityIndicator size="small" color="#d4af37" />
        ) : availableSlots.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>⏰</Text>
            <Text style={styles.emptyStateText}>No available slots</Text>
            <Text style={styles.emptyStateSubtext}>Try selecting another date</Text>
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {availableSlots.map((slot, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.slotButton,
                  selectedSlot?.startTime === slot.startTime && styles.slotButtonSelected
                ]}
                onPress={() => setSelectedSlot(slot)}
              >
                <Text style={[
                  styles.slotText,
                  selectedSlot?.startTime === slot.startTime && styles.slotTextSelected
                ]}>
                  {formatTime(slot.startTime)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAppointmentType = () => {
    if (!selectedSlot) return null;
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appointment Type</Text>
        <View style={styles.typeGrid}>
          {APPOINTMENT_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                appointmentType === type.id && styles.typeCardSelected
              ]}
              onPress={() => setAppointmentType(type.id)}
            >
              <Text style={styles.typeIcon}>{type.icon}</Text>
              <Text style={[
                styles.typeLabel,
                appointmentType === type.id && styles.typeLabelSelected
              ]}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Notes for Provider (Optional)</Text>
        <TextInput
          style={styles.notesInput}
          value={patientNotes}
          onChangeText={setPatientNotes}
          placeholder="Any information you'd like the provider to know..."
          placeholderTextColor="#666"
          multiline
          numberOfLines={3}
        />
        
        <TouchableOpacity
          style={[styles.bookButton, booking && styles.bookButtonDisabled]}
          onPress={handleBookAppointment}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.bookButtonText}>Book Appointment</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderMyAppointments = () => {
    const upcomingAppointments = appointments.filter(apt => 
      new Date(apt.appointment_date) >= new Date() && apt.status !== 'cancelled'
    );
    const pastAppointments = appointments.filter(apt => 
      new Date(apt.appointment_date) < new Date() || apt.status === 'cancelled'
    );

    return (
      <View style={styles.appointmentsContainer}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        {upcomingAppointments.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>No upcoming appointments</Text>
          </View>
        ) : (
          upcomingAppointments.map((apt) => (
            <View key={apt.id} style={styles.appointmentCard}>
              <View style={styles.appointmentHeader}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) }]}>
                  <Text style={styles.statusText}>{apt.status}</Text>
                </View>
                {['pending', 'confirmed'].includes(apt.status) && (
                  <TouchableOpacity
                    style={styles.cancelLink}
                    onPress={() => handleCancelAppointment(apt.id)}
                  >
                    <Text style={styles.cancelLinkText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.appointmentProvider}>{apt.provider_name}</Text>
              <Text style={styles.appointmentDate}>
                {new Date(apt.appointment_date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              <Text style={styles.appointmentTime}>
                {formatTime(apt.start_time)} - {formatTime(apt.end_time)}
              </Text>
              <Text style={styles.appointmentType}>{apt.appointment_type || 'Consultation'}</Text>
            </View>
          ))
        )}

        {pastAppointments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Past Appointments</Text>
            {pastAppointments.slice(0, 5).map((apt) => (
              <View key={apt.id} style={[styles.appointmentCard, styles.pastAppointmentCard]}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(apt.status) }]}>
                  <Text style={styles.statusText}>{apt.status}</Text>
                </View>
                <Text style={styles.appointmentProvider}>{apt.provider_name}</Text>
                <Text style={styles.appointmentDate}>
                  {new Date(apt.appointment_date).toLocaleDateString()}
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Medical Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'book' && styles.activeTab]}
          onPress={() => setActiveTab('book')}
        >
          <Text style={[styles.tabText, activeTab === 'book' && styles.activeTabText]}>
            Book New
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'appointments' && styles.activeTab]}
          onPress={() => setActiveTab('appointments')}
        >
          <Text style={[styles.tabText, activeTab === 'appointments' && styles.activeTabText]}>
            My Appointments
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'book' ? (
          <>
            {renderProviderSelection()}
            {renderCalendar()}
            {renderTimeSlots()}
            {renderAppointmentType()}
          </>
        ) : (
          renderMyAppointments()
        )}
        <View style={styles.bottomPadding} />
      </ScrollView>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  providerCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  providerCardSelected: {
    borderColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#d4af37',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  providerInitial: {
    color: '#000',
    fontSize: 24,
    fontWeight: 'bold',
  },
  providerName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  providerSpecialty: {
    color: '#a0aec0',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  calendarContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
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
  pastCell: {
    opacity: 0.3,
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
  pastDayText: {
    color: '#6b7280',
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
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  slotButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  slotButtonSelected: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  slotText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  slotTextSelected: {
    color: '#000',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  typeCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  typeCardSelected: {
    borderColor: '#d4af37',
    backgroundColor: 'rgba(212, 175, 55, 0.1)',
  },
  typeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeLabel: {
    color: '#a0aec0',
    fontSize: 12,
    textAlign: 'center',
  },
  typeLabelSelected: {
    color: '#d4af37',
    fontWeight: '600',
  },
  notesInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  bookButton: {
    backgroundColor: '#d4af37',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    marginTop: 20,
  },
  bookButtonDisabled: {
    opacity: 0.7,
  },
  bookButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: 'bold',
  },
  appointmentsContainer: {
    paddingBottom: 100,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  pastAppointmentCard: {
    opacity: 0.7,
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  cancelLink: {
    padding: 4,
  },
  cancelLinkText: {
    color: '#ef4444',
    fontSize: 14,
  },
  appointmentProvider: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appointmentDate: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  appointmentTime: {
    color: '#a0aec0',
    fontSize: 14,
    marginBottom: 4,
  },
  appointmentType: {
    color: '#6b7280',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: 100,
  },
});

export default PatientAppointmentBookingScreen;
