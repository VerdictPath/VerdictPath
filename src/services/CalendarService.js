import * as Calendar from 'expo-calendar';
import { Platform, Alert } from 'react-native';
import { API_BASE_URL } from '../config/api';

class CalendarService {
  constructor() {
    this.defaultCalendarId = null;
  }

  async requestPermissions() {
    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Calendar Permission Required',
          'Please enable calendar access in your device settings to sync events.'
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting calendar permissions:', error);
      return false;
    }
  }

  async getDefaultCalendar() {
    try {
      if (this.defaultCalendarId) {
        return this.defaultCalendarId;
      }

      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return null;

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      
      let defaultCalendar = calendars.find(
        cal => cal.source?.name === 'Default' || cal.isPrimary
      );

      if (!defaultCalendar) {
        defaultCalendar = calendars.find(cal => cal.allowsModifications);
      }

      if (!defaultCalendar && Platform.OS === 'ios') {
        const defaultSource = await Calendar.getDefaultCalendarAsync();
        this.defaultCalendarId = defaultSource.id;
        return defaultSource.id;
      }

      if (defaultCalendar) {
        this.defaultCalendarId = defaultCalendar.id;
        return defaultCalendar.id;
      }

      if (Platform.OS === 'android' && calendars.length > 0) {
        this.defaultCalendarId = calendars[0].id;
        return calendars[0].id;
      }

      return null;
    } catch (error) {
      console.error('Error getting default calendar:', error);
      return null;
    }
  }

  async createEvent(eventData) {
    try {
      const calendarId = await this.getDefaultCalendar();
      if (!calendarId) {
        throw new Error('No calendar available');
      }

      const {
        title,
        notes,
        location,
        startDate,
        endDate,
        allDay = false,
        alarms = []
      } = eventData;

      const eventId = await Calendar.createEventAsync(calendarId, {
        title,
        notes,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        allDay,
        alarms,
        timeZone: 'America/New_York'
      });

      return eventId;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(deviceEventId, eventData) {
    try {
      const {
        title,
        notes,
        location,
        startDate,
        endDate,
        allDay = false,
        alarms = []
      } = eventData;

      await Calendar.updateEventAsync(deviceEventId, {
        title,
        notes,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate || startDate),
        allDay,
        alarms
      });

      return true;
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  async deleteEvent(deviceEventId) {
    try {
      await Calendar.deleteEventAsync(deviceEventId);
      return true;
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  async syncEventToDevice(event, authToken) {
    try {
      const alarms = [];
      if (event.reminder_enabled && event.reminder_minutes_before) {
        alarms.push({
          relativeOffset: -event.reminder_minutes_before
        });
      }

      const deviceEventId = await this.createEvent({
        title: event.title,
        notes: event.description,
        location: event.location,
        startDate: event.start_time,
        endDate: event.end_time,
        allDay: event.all_day,
        alarms
      });

      await this.updateBackendSyncStatus(event.id, deviceEventId, authToken);

      return deviceEventId;
    } catch (error) {
      console.error('Error syncing event to device:', error);
      throw error;
    }
  }

  async unsyncEventFromDevice(event, authToken) {
    try {
      if (event.device_event_id) {
        await this.deleteEvent(event.device_event_id);
      }
      
      await this.updateBackendSyncStatus(event.id, null, authToken);
      
      return true;
    } catch (error) {
      console.error('Error unsyncing event from device:', error);
      throw error;
    }
  }

  async updateBackendSyncStatus(eventId, deviceEventId, authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events/${eventId}/sync`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          deviceEventId,
          syncedToDevice: !!deviceEventId,
          lastSyncedAt: new Date().toISOString()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update sync status');
      }

      return data;
    } catch (error) {
      console.error('Error updating backend sync status:', error);
      throw error;
    }
  }

  async fetchEvents(authToken, options = {}) {
    try {
      const { startDate, endDate, eventType } = options;
      
      const queryParams = new URLSearchParams();
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      if (eventType) queryParams.append('eventType', eventType);

      const response = await fetch(
        `${API_BASE_URL}/api/calendar/events?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch events');
      }

      return data.events || [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  async createEventInBackend(eventData, authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(eventData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create event');
      }

      return data.event;
    } catch (error) {
      console.error('Error creating event in backend:', error);
      throw error;
    }
  }

  async deleteEventFromBackend(eventId, authToken) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/calendar/events/${eventId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete event');
      }

      return true;
    } catch (error) {
      console.error('Error deleting event from backend:', error);
      throw error;
    }
  }

  formatEventForDisplay(event) {
    const startDate = new Date(event.start_time);
    const endDate = event.end_time ? new Date(event.end_time) : null;
    
    const timeOptions = { hour: 'numeric', minute: '2-digit' };
    const dateOptions = { month: 'short', day: 'numeric', year: 'numeric' };

    return {
      ...event,
      displayDate: startDate.toLocaleDateString('en-US', dateOptions),
      displayTime: event.all_day 
        ? 'All Day' 
        : startDate.toLocaleTimeString('en-US', timeOptions),
      displayEndTime: endDate && !event.all_day
        ? endDate.toLocaleTimeString('en-US', timeOptions)
        : null
    };
  }

  getEventTypeIcon(eventType) {
    const icons = {
      court_date: '⚖️',
      appointment: '📅',
      deposition: '📝',
      deadline: '⏰',
      reminder: '🔔',
      default: '📌'
    };

    return icons[eventType] || icons.default;
  }
}

export default new CalendarService();
