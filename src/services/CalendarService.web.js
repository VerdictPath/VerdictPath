import { API_BASE_URL } from '../config/api';

class CalendarService {
  constructor() {
    this.defaultCalendarId = null;
  }

  isWebPlatform() {
    return true;
  }

  async requestPermissions() {
    return false;
  }

  async getDefaultCalendar() {
    return null;
  }

  async addEvent(eventDetails) {
    console.log('Device calendar not available on web');
    return null;
  }

  async createEvent(eventData) {
    console.log('Device calendar not available on web');
    return null;
  }

  async updateEvent(deviceEventId, eventData) {
    console.log('Device calendar not available on web');
    return false;
  }

  async deleteEvent(deviceEventId) {
    console.log('Device calendar not available on web');
    return false;
  }

  async removeEvent(eventId) {
    return false;
  }

  async getEvents(startDate, endDate) {
    return [];
  }

  async syncEvents(events) {
    return { synced: 0, failed: 0 };
  }

  async syncEventToDevice(event, authToken) {
    console.log('Device calendar sync not available on web');
    return null;
  }

  async unsyncEventFromDevice(event, authToken) {
    console.log('Device calendar unsync not available on web');
    return true;
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
      court_date: '\u2696\uFE0F',
      appointment: '\uD83D\uDCC5',
      deposition: '\uD83D\uDCDD',
      deadline: '\u23F0',
      reminder: '\uD83D\uDD14',
      default: '\uD83D\uDCCC'
    };

    return icons[eventType] || icons.default;
  }
}

const calendarService = new CalendarService();
export default calendarService;
