import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Platform, RefreshControl, TextInput, FlatList
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import moment from 'moment';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { API_BASE_URL } from '../config/api';

const STATUS_COLORS = {
  pending: '#f59e0b',
  confirmed: '#10b981',
  completed: '#6366f1',
  cancelled: '#ef4444',
  no_show: '#6b7280'
};

const LawFirmClientAppointmentsScreen = ({ user, onNavigate, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [selectedDate, setSelectedDate] = useState(null);
  const [markedDates, setMarkedDates] = useState({});
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');

  const lawFirmId = user?.lawFirmId || user?.id;

  useEffect(() => {
    fetchData();
  }, [selectedClient, statusFilter]);

  useEffect(() => {
    updateMarkedDates();
  }, [appointments]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAppointments(),
        fetchClients()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppointments = async () => {
    try {
      let url = `${API_BASE_URL}/api/medical-calendar/law-firms/${lawFirmId}/client-appointments`;
      const params = new URLSearchParams();
      if (selectedClient) params.append('clientId', selectedClient);
      if (statusFilter) params.append('status', statusFilter);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
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

  const updateMarkedDates = () => {
    const marked = {};
    appointments.forEach(appt => {
      const date = appt.appointment_date;
      if (!marked[date]) {
        marked[date] = { dots: [] };
      }
      marked[date].dots.push({
        key: `appt-${appt.id}`,
        color: STATUS_COLORS[appt.status] || '#6b7280'
      });
    });
    setMarkedDates(marked);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const getAppointmentsForDate = (date) => {
    return appointments.filter(a => a.appointment_date === date);
  };

  const upcomingAppointments = appointments
    .filter(a => moment(a.appointment_date).isSameOrAfter(moment(), 'day') && a.status !== 'cancelled')
    .sort((a, b) => moment(a.appointment_date).diff(moment(b.appointment_date)));

  const pastAppointments = appointments
    .filter(a => moment(a.appointment_date).isBefore(moment(), 'day') || a.status === 'cancelled')
    .sort((a, b) => moment(b.appointment_date).diff(moment(a.appointment_date)));

  const currentClient = clients.find(c => c.id === selectedClient);

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

  const getClientDisplayName = (client) => {
    const firstName = client.first_name || client.firstName || '';
    const lastName = client.last_name || client.lastName || '';
    return `${lastName}, ${firstName}`;
  };

  const getSelectedClientName = () => {
    if (!selectedClient) return 'All Clients';
    const client = clients.find(c => c.id === selectedClient);
    return client ? getClientDisplayName(client) : 'Select a client...';
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
        <Icon name="calendar-month" size={28} color="#FFD700" />
        <Text style={styles.headerTitle}>Calendar</Text>
      </View>
      <TouchableOpacity 
        style={styles.calendarSettingsButton} 
        onPress={() => onNavigate('lawfirm-calendar')}
      >
        <Icon name="cog" size={24} color="#FFD700" />
      </TouchableOpacity>
    </View>
  );

  const renderClientSelector = () => (
    <View style={styles.clientSelector}>
      <Text style={styles.clientSelectorLabel}>Select Client:</Text>
      <TouchableOpacity
        style={styles.clientDropdownButton}
        onPress={() => setShowClientDropdown(!showClientDropdown)}
      >
        <Icon name={selectedClient ? "account" : "account-group"} size={20} color="#1E3A5F" />
        <Text style={styles.clientDropdownButtonText} numberOfLines={1}>
          {getSelectedClientName()}
        </Text>
        <Icon name={showClientDropdown ? "chevron-up" : "chevron-down"} size={20} color="#1E3A5F" />
      </TouchableOpacity>
      {showClientDropdown && (
        <View style={styles.clientDropdownList}>
          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search clients..."
              placeholderTextColor="#94A3B8"
              value={clientSearch}
              onChangeText={setClientSearch}
              autoCapitalize="none"
            />
            {clientSearch.length > 0 && (
              <TouchableOpacity onPress={() => setClientSearch('')} style={styles.clearSearchButton}>
                <Icon name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[styles.clientDropdownItem, !selectedClient && styles.clientDropdownItemActive]}
            onPress={() => {
              setSelectedClient(null);
              setShowClientDropdown(false);
              setClientSearch('');
            }}
          >
            <Icon name="account-group" size={18} color={!selectedClient ? '#1E3A5F' : '#64748B'} />
            <Text style={[styles.clientDropdownItemText, !selectedClient && styles.clientDropdownItemTextActive]}>
              All Clients
            </Text>
          </TouchableOpacity>
          <FlatList
            data={filteredClients}
            keyExtractor={(item) => item.id.toString()}
            style={styles.clientList}
            nestedScrollEnabled={true}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.clientDropdownItem,
                  selectedClient === item.id && styles.clientDropdownItemActive
                ]}
                onPress={() => {
                  setSelectedClient(item.id);
                  setShowClientDropdown(false);
                  setClientSearch('');
                }}
              >
                <Icon name="account" size={18} color={selectedClient === item.id ? '#1E3A5F' : '#64748B'} />
                <Text style={[
                  styles.clientDropdownItemText,
                  selectedClient === item.id && styles.clientDropdownItemTextActive
                ]}>
                  {getClientDisplayName(item)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptySearchResult}>
                <Text style={styles.emptySearchText}>No clients found</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );

  const renderClientInfoCard = () => {
    if (!currentClient) return null;

    return (
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
    );
  };

  const renderStats = () => {
    const stats = {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
    };

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Icon name="calendar-multiple" size={24} color="#FFD700" />
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, styles.statCardPending]}>
          <Icon name="clock-outline" size={24} color="#f59e0b" />
          <Text style={[styles.statNumber, { color: '#f59e0b' }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, styles.statCardConfirmed]}>
          <Icon name="check-circle" size={24} color="#10b981" />
          <Text style={[styles.statNumber, { color: '#10b981' }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCompleted]}>
          <Icon name="check-all" size={24} color="#6366f1" />
          <Text style={[styles.statNumber, { color: '#6366f1' }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
    );
  };

  const renderStatusFilter = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusFilter}>
      <TouchableOpacity
        style={[styles.statusChip, !statusFilter && styles.statusChipActive]}
        onPress={() => setStatusFilter(null)}
      >
        <Text style={[styles.statusChipText, !statusFilter && styles.statusChipTextActive]}>All</Text>
      </TouchableOpacity>
      {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.statusChip,
            statusFilter === status && styles.statusChipActive,
            { borderColor: STATUS_COLORS[status] }
          ]}
          onPress={() => setStatusFilter(statusFilter === status ? null : status)}
        >
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
          <Text style={[styles.statusChipText, statusFilter === status && styles.statusChipTextActive]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const renderViewModeToggle = () => (
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
  );

  const renderAppointmentCard = (appointment, isPast = false) => (
    <View key={appointment.id} style={[styles.appointmentCard, isPast && styles.appointmentCardPast]}>
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
          <Text style={styles.appointmentClientName}>
            {appointment.patient_first_name} {appointment.patient_last_name}
          </Text>
          <Text style={styles.appointmentProvider}>
            {appointment.provider_name}
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
            color={STATUS_COLORS[appointment.status]}
          />
          <Text style={[styles.appointmentStatusText, { color: STATUS_COLORS[appointment.status] }]}>
            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
          </Text>
        </View>
      </View>

      {appointment.appointment_type && (
        <View style={styles.appointmentFooter}>
          <Icon name="medical-bag" size={14} color="#999" />
          <Text style={styles.appointmentTypeText}>
            {appointment.appointment_type}
          </Text>
        </View>
      )}
    </View>
  );

  const renderCalendarView = () => (
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
          <View style={styles.sectionHeader}>
            <Icon name="calendar-star" size={20} color="#FFD700" />
            <Text style={styles.selectedDateTitle}>
              {moment(selectedDate).format('MMMM Do, YYYY')}
            </Text>
          </View>
          {getAppointmentsForDate(selectedDate).length === 0 ? (
            <View style={styles.noAppointmentsSmall}>
              <Icon name="calendar-blank" size={32} color="#666" />
              <Text style={styles.noAppointmentsText}>No appointments on this date</Text>
            </View>
          ) : (
            getAppointmentsForDate(selectedDate).map(appt => renderAppointmentCard(appt))
          )}
        </View>
      )}

      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Status Legend:</Text>
        <View style={styles.legendItems}>
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: color }]} />
              <Text style={styles.legendText}>{status}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  const renderListView = () => (
    <View style={styles.listView}>
      {upcomingAppointments.length > 0 && (
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="calendar-clock" size={24} color="#FFD700" />
            <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
          </View>
          {upcomingAppointments.map(appt => renderAppointmentCard(appt))}
        </View>
      )}

      {pastAppointments.length > 0 && (
        <View style={styles.appointmentsSection}>
          <View style={styles.sectionHeader}>
            <Icon name="history" size={24} color="#999" />
            <Text style={[styles.sectionTitle, { color: '#999' }]}>Past Appointments</Text>
          </View>
          {pastAppointments.slice(0, 10).map(appt => renderAppointmentCard(appt, true))}
        </View>
      )}

      {appointments.length === 0 && (
        <View style={styles.noAppointmentsContainer}>
          <Icon name="calendar-blank" size={64} color="#666" />
          <Text style={styles.noAppointmentsTitle}>No Medical Appointments</Text>
          <Text style={styles.noAppointmentsSubtext}>
            {selectedClient
              ? 'This client hasn\'t scheduled any medical appointments yet'
              : 'Your clients have no medical appointments scheduled'}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.fullLoadingContainer}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      {renderClientSelector()}
      {renderClientInfoCard()}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFD700" />
        }
      >
        {renderStats()}
        {renderStatusFilter()}
        {renderViewModeToggle()}

        {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16
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
  calendarSettingsButton: {
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
  clientDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10
  },
  clientDropdownButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#1E3A5F',
    fontWeight: '500'
  },
  clientDropdownList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxHeight: 300,
    overflow: 'hidden'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1E3A5F',
    padding: 0
  },
  clearSearchButton: {
    padding: 4
  },
  clientDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F7FA',
    gap: 10
  },
  clientDropdownItemActive: {
    backgroundColor: '#EDF1F7'
  },
  clientDropdownItemText: {
    fontSize: 15,
    color: '#64748B'
  },
  clientDropdownItemTextActive: {
    color: '#1E3A5F',
    fontWeight: '600'
  },
  clientList: {
    maxHeight: 200
  },
  emptySearchResult: {
    padding: 20,
    alignItems: 'center'
  },
  emptySearchText: {
    color: '#94A3B8',
    fontSize: 14
  },
  clientInfoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    marginTop: 0,
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
  scrollView: {
    flex: 1
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    gap: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)'
  },
  statCardPending: {
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  statCardConfirmed: {
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  statCardCompleted: {
    borderColor: 'rgba(99, 102, 241, 0.3)'
  },
  statNumber: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4
  },
  statLabel: {
    color: '#a0aec0',
    fontSize: 10,
    marginTop: 2
  },
  statusFilter: {
    paddingHorizontal: 16,
    marginBottom: 12
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)'
  },
  statusChipActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: '#FFD700'
  },
  statusChipText: {
    color: '#a0aec0',
    fontSize: 12
  },
  statusChipTextActive: {
    color: '#FFD700',
    fontWeight: '600'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  viewModeContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 4,
    gap: 8
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
    fontWeight: 'bold'
  },
  noAppointmentsSmall: {
    alignItems: 'center',
    padding: 20
  },
  noAppointmentsText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8
  },
  legendContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)'
  },
  legendTitle: {
    color: '#a0aec0',
    fontSize: 12,
    marginBottom: 8
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  legendText: {
    color: '#999',
    fontSize: 11,
    textTransform: 'capitalize'
  },
  listView: {
    padding: 16,
    paddingTop: 0
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
  appointmentClientName: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2
  },
  appointmentProvider: {
    color: '#fff',
    fontSize: 14,
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
    fontWeight: '600',
    textTransform: 'capitalize'
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
  bottomPadding: {
    height: 100
  }
});

export default LawFirmClientAppointmentsScreen;
