import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
  Platform, RefreshControl
} from 'react-native';
import { theme } from '../styles/theme';
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
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const lawFirmId = user?.lawFirmId || user?.id;

  useEffect(() => {
    fetchData();
  }, [selectedClient, statusFilter]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
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

  const getAppointmentsForDate = (date) => {
    if (!date) return [];
    return appointments.filter(apt =>
      new Date(apt.appointment_date).toDateString() === date.toDateString()
    );
  };

  const changeMonth = (delta) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + delta);
    setCurrentMonth(newMonth);
  };

  const groupAppointmentsByDate = () => {
    const grouped = {};
    appointments.forEach(apt => {
      const dateKey = apt.appointment_date;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(apt);
    });
    return Object.entries(grouped).sort((a, b) => new Date(a[0]) - new Date(b[0]));
  };

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.clientFilter}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedClient && styles.filterChipActive]}
          onPress={() => setSelectedClient(null)}
        >
          <Text style={[styles.filterChipText, !selectedClient && styles.filterChipTextActive]}>
            All Clients
          </Text>
        </TouchableOpacity>
        {clients.map((client) => (
          <TouchableOpacity
            key={client.id}
            style={[styles.filterChip, selectedClient === client.id && styles.filterChipActive]}
            onPress={() => setSelectedClient(client.id)}
          >
            <Text style={[styles.filterChipText, selectedClient === client.id && styles.filterChipTextActive]}>
              {client.first_name} {client.last_name?.charAt(0)}.
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
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
    </View>
  );

  const renderViewToggle = () => (
    <View style={styles.viewToggle}>
      <TouchableOpacity
        style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]}
        onPress={() => setViewMode('list')}
      >
        <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>
          List
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.viewToggleButton, viewMode === 'calendar' && styles.viewToggleButtonActive]}
        onPress={() => setViewMode('calendar')}
      >
        <Text style={[styles.viewToggleText, viewMode === 'calendar' && styles.viewToggleTextActive]}>
          Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderListView = () => {
    const groupedAppointments = groupAppointmentsByDate();

    if (appointments.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateIcon}>📅</Text>
          <Text style={styles.emptyStateText}>No appointments found</Text>
          <Text style={styles.emptyStateSubtext}>
            {selectedClient ? 'Try selecting a different client' : 'Your clients have no medical appointments scheduled'}
          </Text>
        </View>
      );
    }

    return (
      <View>
        {groupedAppointments.map(([date, dayAppointments]) => (
          <View key={date} style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{formatDate(date)}</Text>
            {dayAppointments.map((apt) => (
              <View key={apt.id} style={styles.appointmentCard}>
                <View style={styles.appointmentTop}>
                  <View style={styles.timeBlock}>
                    <Text style={styles.timeText}>{formatTime(apt.start_time)}</Text>
                    <Text style={styles.timeDivider}>-</Text>
                    <Text style={styles.timeText}>{formatTime(apt.end_time)}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[apt.status] }]}>
                    <Text style={styles.statusText}>{apt.status}</Text>
                  </View>
                </View>
                
                <View style={styles.appointmentDetails}>
                  <View style={styles.personRow}>
                    <Text style={styles.personLabel}>Client:</Text>
                    <Text style={styles.personName}>
                      {apt.patient_first_name} {apt.patient_last_name}
                    </Text>
                  </View>
                  <View style={styles.personRow}>
                    <Text style={styles.personLabel}>Provider:</Text>
                    <Text style={styles.personName}>{apt.provider_name}</Text>
                  </View>
                  {apt.specialty && (
                    <Text style={styles.specialty}>{apt.specialty}</Text>
                  )}
                  <Text style={styles.appointmentType}>
                    {apt.appointment_type || 'Consultation'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderCalendarView = () => {
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
          {days.map((date, idx) => {
            const dayAppointments = getAppointmentsForDate(date);
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <View key={idx} style={[styles.calendarDayCell, isToday && styles.todayCell]}>
                {date && (
                  <>
                    <Text style={[styles.calendarDayText, isToday && styles.todayText]}>
                      {date.getDate()}
                    </Text>
                    {dayAppointments.length > 0 && (
                      <View style={styles.appointmentIndicators}>
                        {dayAppointments.slice(0, 3).map((apt, i) => (
                          <View
                            key={i}
                            style={[styles.miniDot, { backgroundColor: STATUS_COLORS[apt.status] }]}
                          />
                        ))}
                        {dayAppointments.length > 3 && (
                          <Text style={styles.moreIndicator}>+{dayAppointments.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            );
          })}
        </View>
        
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
          <Text style={styles.statNumber}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: STATUS_COLORS.pending }]}>
          <Text style={[styles.statNumber, { color: STATUS_COLORS.pending }]}>{stats.pending}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: STATUS_COLORS.confirmed }]}>
          <Text style={[styles.statNumber, { color: STATUS_COLORS.confirmed }]}>{stats.confirmed}</Text>
          <Text style={styles.statLabel}>Confirmed</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: STATUS_COLORS.completed }]}>
          <Text style={[styles.statNumber, { color: STATUS_COLORS.completed }]}>{stats.completed}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loadingText}>Loading appointments...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Client Appointments</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
        }
      >
        {renderStats()}
        {renderFilters()}
        {renderViewToggle()}
        
        {viewMode === 'list' ? renderListView() : renderCalendarView()}
        
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
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#d4af37',
  },
  statNumber: {
    color: '#d4af37',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#a0aec0',
    fontSize: 10,
    marginTop: 2,
  },
  filtersContainer: {
    marginBottom: 16,
  },
  clientFilter: {
    marginBottom: 10,
  },
  statusFilter: {
    marginBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  filterChipActive: {
    backgroundColor: '#d4af37',
    borderColor: '#d4af37',
  },
  filterChipText: {
    color: '#a0aec0',
    fontSize: 14,
  },
  filterChipTextActive: {
    color: '#000',
    fontWeight: 'bold',
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
  },
  statusChipActive: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
  },
  statusChipText: {
    color: '#a0aec0',
    fontSize: 12,
  },
  statusChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  viewToggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  viewToggleButtonActive: {
    backgroundColor: '#d4af37',
  },
  viewToggleText: {
    color: '#a0aec0',
    fontSize: 14,
    fontWeight: '600',
  },
  viewToggleTextActive: {
    color: '#000',
  },
  emptyState: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  emptyStateSubtext: {
    color: '#a0aec0',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    color: '#d4af37',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  appointmentCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  appointmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  timeDivider: {
    color: '#6b7280',
    marginHorizontal: 4,
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
  appointmentDetails: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  personRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  personLabel: {
    color: '#6b7280',
    fontSize: 12,
    width: 60,
  },
  personName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  specialty: {
    color: '#a0aec0',
    fontSize: 12,
    marginTop: 4,
  },
  appointmentType: {
    color: '#d4af37',
    fontSize: 12,
    marginTop: 4,
    textTransform: 'capitalize',
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
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
  },
  todayCell: {
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    borderRadius: 8,
  },
  calendarDayText: {
    color: '#fff',
    fontSize: 12,
    marginBottom: 2,
  },
  todayText: {
    color: '#d4af37',
    fontWeight: 'bold',
  },
  appointmentIndicators: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 2,
  },
  miniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moreIndicator: {
    color: '#a0aec0',
    fontSize: 8,
  },
  legendContainer: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  legendTitle: {
    color: '#a0aec0',
    fontSize: 12,
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  legendText: {
    color: '#a0aec0',
    fontSize: 10,
    textTransform: 'capitalize',
  },
  bottomPadding: {
    height: 100,
  },
});

export default LawFirmClientAppointmentsScreen;
