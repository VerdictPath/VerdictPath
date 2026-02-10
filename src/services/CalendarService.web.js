import { Platform } from 'react-native';

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
    console.log('Calendar not available on web');
    return null;
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
}

const calendarService = new CalendarService();
export default calendarService;
