// LawFirmClientAppointments.jsx
// Verdict Path Law Firm Client Medical Appointments View
// Pirate-themed with glass morphism design

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const LawFirmClientAppointments = ({ lawFirmId, clientId, navigation }) => {
  const [selectedClient, setSelectedClient] = useState(clientId);
  const [clients, setClients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    if (selectedClient) {
      loadClientAppointments();
    }
  }, [selectedClient]);

  const loadClients = async () => {
    try {
      // Load all clients for this law firm
      const response = await fetch(
        `${process.env.API_URL}/api/law-firms/${lawFirmId}/clients`
      );
      const data = await response.json();
      setClients(data);
      
      if (!clientId && data.length > 0) {
        setSelectedClient(data[0].id);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  const loadClientAppointments = async () => {
    try {
      setLoading(true);
      const startDate = moment().subtract(1, 'month').format('YYYY-MM-DD');
      const endDate = moment().add(3, 'months').format('YYYY-MM-DD');

      const response = await fetch(
        `${process.env.API_URL}/api/law-firms/${lawFirmId}/client-appointments?clientId=${selectedClient}&startDate=${startDate}&endDate=${endDate}`
      );
      const data = await response.json();
      setAppointments(data);

      // Mark dates on calendar
      const marked = {};
      data.forEach(appt => {
        const date = appt.appointment_date;
        if (!marked[date]) {
          marked[date] = { dots: [] };
        }
        marked[date].dots.push({
          color: appt.status === 'confirmed' ? '#10b981' : '#f59e0b'
        });
      });
      setMarkedDates(marked);

      setLoading(false);
    } catch (error) {
      console.error('Error loading appointments:', error);
      setLoading(false);
    }
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(a => a.appointment_date === date);
  };

  const upcomingAppointments = appointments
    .filter(a => moment(a.appointment_date).isSameOrAfter(moment(), 'day'))
    .sort((a, b) => moment(a.appointment_date).diff(moment(b.appointment_date)));

  const pastAppointments = appointments
    .filter(a => moment(a.appointment_date).isBefore(moment(), 'day'))
    .sort((a, b) => moment(b.appointment_date).diff(moment(a.appointment_date)));

  const currentClient = clients.find(c => c.id === selectedClient);

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
          <Icon name="gavel" size={32} color="#FFD700" />
          <Text style={styles.headerTitle}>Client Medical</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Client Selector */}
      {clients.length > 1 && (
        <View style={styles.clientSelector}>
          <Text style={styles.clientSelectorLabel}>Select Client:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {clients.map(client => (
              <TouchableOpacity
                key={client.id}
                style={[
                  styles.clientChip,
                  selectedClient === client.id && styles.clientChipActive
                ]}
                onPress={() => setSelectedClient(client.id)}
              >
                <Icon
                  name="account"
                  size={16}
                  color={selectedClient === client.id ? '#FFD700' : '#fff'}
                />
                <Text
                  style={[
                    styles.clientChipText,
                    selectedClient === client.id && styles.clientChipTextActive
                  ]}
                >
                  {client.first_name} {client.last_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Current Client Info */}
      {currentClient && (
        <View style={styles.clientInfoCard}>
          <View style={styles.clientAvatar}>
            <Icon name="account-circle" size={40} color="#FFD700" />
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {currentClient.first_name} {currentClient.last_name}
            </Text>
            <Text style={styles.clientCase}>
              Case: {currentClient.case_number || 'N/A'}
            </Text>
          </View>
          <View style={styles.appointmentCounts}>
            <View style={styles.countBadge}>
              <Text style={styles.countNumber}>{upcomingAppointments.length}</Text>
              <Text style={styles.countLabel}>Upcoming</Text>
            </View>
          </View>
        </View>
      )}

      {/* View Mode Toggle */}
      <View style={styles.viewModeContainer}>
        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('list')}
        >
          <Icon name="format-list-bulleted" size={20} color={viewMode === 'list' ? '#FFD700' : '#fff'} />
          <Text style={[styles.viewModeText, viewMode === 'list' && styles.viewModeTextActive]}>
            List
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewModeButton, viewMode === 'calendar' && styles.viewModeButtonActive]}
          onPress={() => setViewMode('calendar')}
        >
          <Icon name="calendar-month" size={20} color={viewMode === 'calendar' ? '#FFD700' : '#fff'} />
          <Text style={[styles.viewModeText, viewMode === 'calendar' && styles.viewModeTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {viewMode === 'calendar' ? (
            <View style={styles.calendarView}>
              <Calendar
                current={selectedDate || moment().format('YYYY-MM-DD')}
                onDayPress={(day) => setSelectedDate(day.dateString)}
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
                  calendarBackground: 'rgba(255, 255, 255, 0.05)',
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

              {selectedDate && (
                <View style={styles.selectedDateAppointments}>
                  <Text style={styles.selectedDateTitle}>
                    {moment(selectedDate).format('MMMM Do, YYYY')}
                  </Text>
                  {getAppointmentsForDate(selectedDate).length === 0 ? (
                    <Text style={styles.noAppointmentsText}>No appointments</Text>
                  ) : (
                    getAppointmentsForDate(selectedDate).map(appt => (
                      <AppointmentCard key={appt.id} appointment={appt} compact />
                    ))
                  )}
                </View>
              )}
            </View>
          ) : (
            <View style={styles.listView}>
              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <View style={styles.appointmentsSection}>
                  <View style={styles.sectionHeader}>
                    <Icon name="calendar-clock" size={24} color="#FFD700" />
                    <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
                  </View>
                  {upcomingAppointments.map(appt => (
                    <AppointmentCard key={appt.id} appointment={appt} />
                  ))}
                </View>
              )}

              {/* Past Appointments */}
              {pastAppointments.length > 0 && (
                <View style={styles.appointmentsSection}>
                  <View style={styles.sectionHeader}>
                    <Icon name="history" size={24} color="#999" />
                    <Text style={[styles.sectionTitle, { color: '#999' }]}>
                      Past Appointments
                    </Text>
                  </View>
                  {pastAppointments.slice(0, 10).map(appt => (
                    <AppointmentCard key={appt.id} appointment={appt} past />
                  ))}
                </View>
              )}

              {appointments.length === 0 && (
                <View style={styles.noAppointmentsContainer}>
                  <Icon name="calendar-blank" size={64} color="#666" />
                  <Text style={styles.noAppointmentsTitle}>
                    No Medical Appointments
                  </Text>
                  <Text style={styles.noAppointmentsSubtext}>
                    This client hasn't scheduled any medical appointments yet
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
};

// Appointment Card Component
const AppointmentCard = ({ appointment, past, compact }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'cancelled': return '#ef4444';
      case 'completed': return '#6366f1';
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

  return (
    <View style={[styles.appointmentCard, past && styles.appointmentCardPast]}>
      <View style={styles.appointmentCardHeader}>
        <View style={styles.appointmentDateBadge}>
          <Text style={styles.appointmentMonth}>
            {moment(appointment.appointment_date).format('MMM')}
          </Text>
          <Text style={styles.appointmentDay}>
            {moment(appointment.appointment_date).format('DD')}
          </Text>
        </View>

        <View style={styles.appointmentCardDetails}>
          <Text style={styles.appointmentProvider}>
            {appointment.provider_name}
          </Text>
          <Text style={styles.appointmentSpecialty}>
            {appointment.provider_specialty}
          </Text>
          <View style={styles.appointmentTimeRow}>
            <Icon name="clock-outline" size={14} color="#FFD700" />
            <Text style={styles.appointmentTime}>
              {moment(appointment.start_time, 'HH:mm:ss').format('h:mm A')}
            </Text>
          </View>
        </View>

        <View style={styles.appointmentStatusBadge}>
          <Icon
            name={getStatusIcon(appointment.status)}
            size={20}
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

      {!compact && appointment.appointment_type && (
        <View style={styles.appointmentFooter}>
          <Icon name="medical-bag" size={14} color="#999" />
          <Text style={styles.appointmentTypeText}>
            {appointment.appointment_type}
          </Text>
        </View>
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
  clientSelector: {
    padding: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  clientSelectorLabel: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8
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
  clientChipActive: {
    backgroundColor: 'rgba(26, 84, 144, 0.6)',
    borderColor: '#FFD700'
  },
  clientChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500'
  },
  clientChipTextActive: {
    color: '#FFD700',
    fontWeight: 'bold'
  },
  clientInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(26, 84, 144, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    gap: 12
  },
  clientAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  clientInfo: {
    flex: 1
  },
  clientName: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4
  },
  clientCase: {
    color: '#fff',
    fontSize: 14
  },
  appointmentCounts: {
    alignItems: 'center'
  },
  countBadge: {
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.2)'
  },
  countNumber: {
    color: '#FFD700',
    fontSize: 24,
    fontWeight: 'bold'
  },
  countLabel: {
    color: '#fff',
    fontSize: 11
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
  scrollView: {
    flex: 1
  },
  calendarView: {
    padding: 16
  },
  selectedDateAppointments: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  selectedDateTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12
  },
  listView: {
    padding: 16
  },
  appointmentsSection: {
    marginBottom: 24
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
  appointmentCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    marginBottom: 12
  },
  appointmentCardPast: {
    opacity: 0.6
  },
  appointmentCardHeader: {
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
  appointmentCardDetails: {
    flex: 1
  },
  appointmentProvider: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  appointmentSpecialty: {
    color: '#999',
    fontSize: 13,
    marginBottom: 4
  },
  appointmentTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  appointmentTime: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600'
  },
  appointmentStatusBadge: {
    alignItems: 'center',
    gap: 4
  },
  appointmentStatusText: {
    fontSize: 11,
    fontWeight: '600'
  },
  appointmentFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)'
  },
  appointmentTypeText: {
    color: '#999',
    fontSize: 13
  },
  noAppointmentsContainer: {
    alignItems: 'center',
    padding: 60
  },
  noAppointmentsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8
  },
  noAppointmentsSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center'
  },
  noAppointmentsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    padding: 20
  }
});

export default LawFirmClientAppointments;
