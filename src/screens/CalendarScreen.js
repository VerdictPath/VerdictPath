import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { theme } from '../styles/theme';
import CalendarService from '../services/CalendarService';

const CalendarScreen = ({ user, onBack }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState('all');
  
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    location: '',
    eventType: 'reminder',
    startTime: '',
    endTime: '',
    allDay: false,
    reminderEnabled: true,
    reminderMinutesBefore: 60
  });

  useEffect(() => {
    loadEvents();
  }, [filter]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const options = {};
      if (filter !== 'all') {
        options.eventType = filter;
      }
      
      const fetchedEvents = await CalendarService.fetchEvents(user.token, options);
      setEvents(fetchedEvents);
    } catch (error) {
      console.error('Error loading events:', error);
      Alert.alert('Error', 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.startTime) {
      Alert.alert('Validation Error', 'Please provide a title and start time');
      return;
    }

    try {
      const eventData = {
        ...newEvent,
        startTime: newEvent.startTime || new Date().toISOString(),
        endTime: newEvent.endTime || null
      };

      const createdEvent = await CalendarService.createEventInBackend(eventData, user.token);
      
      setEvents(prev => [createdEvent, ...prev]);
      setShowAddModal(false);
      resetNewEvent();
      
      Alert.alert('Success', 'Event created successfully!');
    } catch (error) {
      console.error('Error creating event:', error);
      Alert.alert('Error', 'Failed to create event');
    }
  };

  const handleSyncToDevice = async (event) => {
    try {
      const hasPermission = await CalendarService.requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Calendar permission is required to sync events to your device calendar'
        );
        return;
      }

      await CalendarService.syncEventToDevice(event, user.token);
      
      setEvents(prev => 
        prev.map(e => 
          e.id === event.id 
            ? { ...e, synced_to_device: true }
            : e
        )
      );
      
      Alert.alert('Success', 'Event synced to your device calendar!');
      loadEvents();
    } catch (error) {
      console.error('Error syncing event:', error);
      Alert.alert('Error', 'Failed to sync event to device calendar');
    }
  };

  const handleUnsyncFromDevice = async (event) => {
    try {
      await CalendarService.unsyncEventFromDevice(event, user.token);
      
      setEvents(prev => 
        prev.map(e => 
          e.id === event.id 
            ? { ...e, synced_to_device: false, device_event_id: null }
            : e
        )
      );
      
      Alert.alert('Success', 'Event removed from device calendar');
      loadEvents();
    } catch (error) {
      console.error('Error unsyncing event:', error);
      Alert.alert('Error', 'Failed to remove event from device calendar');
    }
  };

  const handleDeleteEvent = async (event) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (event.synced_to_device) {
                await CalendarService.unsyncEventFromDevice(event, user.token);
              }
              
              await CalendarService.deleteEventFromBackend(event.id, user.token);
              setEvents(prev => prev.filter(e => e.id !== event.id));
              Alert.alert('Success', 'Event deleted');
            } catch (error) {
              console.error('Error deleting event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          }
        }
      ]
    );
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      description: '',
      location: '',
      eventType: 'reminder',
      startTime: '',
      endTime: '',
      allDay: false,
      reminderEnabled: true,
      reminderMinutesBefore: 60
    });
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const renderEventCard = (event) => {
    const formattedEvent = CalendarService.formatEventForDisplay(event);
    
    return (
      <View key={event.id} style={styles.eventCard}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventIcon}>
            {CalendarService.getEventTypeIcon(event.event_type)}
          </Text>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventType}>
              {event.event_type.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
          {event.synced_to_device && (
            <Text style={styles.syncedBadge}>✓ Synced</Text>
          )}
        </View>

        <Text style={styles.eventDate}>
          📅 {formattedEvent.displayDate} at {formattedEvent.displayTime}
        </Text>

        {event.location && (
          <Text style={styles.eventLocation}>📍 {event.location}</Text>
        )}

        {event.description && (
          <Text style={styles.eventDescription}>{event.description}</Text>
        )}

        <View style={styles.eventActions}>
          {!event.synced_to_device ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.syncButton]}
              onPress={() => handleSyncToDevice(event)}
            >
              <Text style={styles.actionButtonText}>📲 Sync to Device</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionButton, styles.unsyncButton]}
              onPress={() => handleUnsyncFromDevice(event)}
            >
              <Text style={styles.actionButtonText}>Remove from Device</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeleteEvent(event)}
          >
            <Text style={styles.actionButtonText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.homeButton}>
          <Text style={styles.navIcon}>🏠</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📅 Calendar</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => setShowAddModal(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onBack} style={styles.minimizeButton}>
            <Text style={styles.navIcon}>◀️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'court_date', 'appointment', 'deposition', 'deadline', 'reminder'].map(type => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filter === type && styles.filterChipActive
              ]}
              onPress={() => setFilter(type)}
            >
              <Text style={[
                styles.filterChipText,
                filter === type && styles.filterChipTextActive
              ]}>
                {type === 'all' ? 'All Events' : type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.eventsList}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading events...</Text>
          </View>
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>📅</Text>
            <Text style={styles.emptyStateText}>No events yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap the "+ Add Event" button to create your first event
            </Text>
          </View>
        ) : (
          events.map(event => renderEventCard(event))
        )}
      </ScrollView>

      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add New Event</Text>

            <ScrollView>
              <Text style={styles.label}>Event Type *</Text>
              <View style={styles.typeSelector}>
                {['court_date', 'appointment', 'deposition', 'deadline', 'reminder'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeOption,
                      newEvent.eventType === type && styles.typeOptionActive
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, eventType: type })}
                  >
                    <Text style={[
                      styles.typeOptionText,
                      newEvent.eventType === type && styles.typeOptionTextActive
                    ]}>
                      {CalendarService.getEventTypeIcon(type)} {type.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Court Hearing"
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Event details..."
                value={newEvent.description}
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Courthouse Room 101"
                value={newEvent.location}
                onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              />

              <Text style={styles.label}>Start Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM (e.g., 2025-11-15 14:00)"
                value={newEvent.startTime}
                onChangeText={(text) => setNewEvent({ ...newEvent, startTime: text })}
              />

              <Text style={styles.label}>End Date & Time (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM"
                value={newEvent.endTime}
                onChangeText={(text) => setNewEvent({ ...newEvent, endTime: text })}
              />

              <Text style={styles.note}>
                Note: Use format YYYY-MM-DD HH:MM (e.g., 2025-11-15 14:00)
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => {
                    setShowAddModal(false);
                    resetNewEvent();
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.createButton]}
                  onPress={handleAddEvent}
                >
                  <Text style={styles.createButtonText}>Create Event</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5E6D3',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: '#8B4513',
  },
  homeButton: {
    padding: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  minimizeButton: {
    padding: 8,
  },
  navIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#2ECC71',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  filterChip: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  eventIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  eventTitleContainer: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  syncedBadge: {
    backgroundColor: '#2ECC71',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventDate: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  eventLocation: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
  },
  eventDescription: {
    fontSize: 13,
    color: '#777',
    marginTop: 8,
    fontStyle: 'italic',
  },
  eventActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  syncButton: {
    backgroundColor: theme.colors.primary,
  },
  unsyncButton: {
    backgroundColor: '#95A5A6',
  },
  deleteButton: {
    backgroundColor: '#E74C3C',
    flex: 0.5,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  typeOption: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  typeOptionActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  typeOptionText: {
    fontSize: 12,
    color: '#666',
  },
  typeOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  note: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#95A5A6',
  },
  createButton: {
    backgroundColor: theme.colors.primary,
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CalendarScreen;
