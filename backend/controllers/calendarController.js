const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const calendarController = {
  async getEvents(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;
      const { startDate, endDate, eventType } = req.query;

      let query = `
        SELECT * FROM calendar_events
        WHERE 
      `;

      const params = [];
      
      if (userType === 'individual') {
        query += 'user_id = $1';
        params.push(userId);
      } else if (userType === 'law_firm' || userType === 'lawfirm') {
        query += 'law_firm_id = $1';
        params.push(userId);
      } else if (userType === 'medical_provider') {
        query += 'medical_provider_id = $1';
        params.push(userId);
      } else {
        query += '1 = 0';
      }

      if (startDate) {
        params.push(startDate);
        query += ` AND start_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        query += ` AND start_time <= $${params.length}`;
      }

      if (eventType) {
        params.push(eventType);
        query += ` AND event_type = $${params.length}`;
      }

      query += ' ORDER BY start_time ASC';

      const result = await pool.query(query, params);

      res.json({
        success: true,
        events: result.rows
      });
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      res.status(500).json({
        error: 'Failed to fetch calendar events',
        details: error.message
      });
    }
  },

  async createEvent(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;
      let {
        eventType,
        title,
        description,
        location,
        startTime,
        start_time,
        endTime,
        end_time,
        allDay,
        all_day,
        reminderEnabled,
        reminder_enabled,
        reminderMinutesBefore,
        reminder_minutes_before,
        recurring = false,
        recurrenceRule,
        recurrence_rule,
        caseRelated,
        case_related,
        litigationStageId,
        litigation_stage_id
      } = req.body;

      startTime = startTime || start_time;
      endTime = endTime || end_time;
      allDay = allDay !== undefined ? allDay : (all_day !== undefined ? all_day : false);
      reminderEnabled = reminderEnabled !== undefined ? reminderEnabled : (reminder_enabled !== undefined ? reminder_enabled : true);
      reminderMinutesBefore = reminderMinutesBefore || reminder_minutes_before || 60;
      recurrenceRule = recurrenceRule || recurrence_rule;
      caseRelated = caseRelated !== undefined ? caseRelated : (case_related !== undefined ? case_related : false);
      litigationStageId = litigationStageId || litigation_stage_id;

      if (!title || !startTime) {
        return res.status(400).json({
          error: 'Title and start time are required'
        });
      }

      if (userType === 'individual' && userId) {
        // Valid
      } else if (userType === 'law_firm' && userId) {
        // Valid  
      } else if (userType === 'medical_provider' && userId) {
        // Valid
      } else {
        return res.status(400).json({
          error: 'Invalid user type or missing user ID'
        });
      }

      let insertQuery = `
        INSERT INTO calendar_events (
      `;
      
      const values = [];
      const columns = [];

      if (userType === 'individual') {
        columns.push('user_id');
        values.push(userId);
      } else if (userType === 'law_firm') {
        columns.push('law_firm_id');
        values.push(userId);
      } else if (userType === 'medical_provider') {
        columns.push('medical_provider_id');
        values.push(userId);
      }

      columns.push('event_type', 'title', 'description', 'location', 'start_time', 'end_time', 'all_day', 'reminder_enabled', 'reminder_minutes_before', 'created_by_type', 'created_by_id', 'recurring', 'recurrence_rule', 'case_related', 'litigation_stage_id');
      
      values.push(
        eventType || 'reminder',
        title,
        description,
        location,
        startTime,
        endTime,
        allDay,
        reminderEnabled,
        reminderMinutesBefore,
        userType,
        userId,
        recurring,
        recurrenceRule,
        caseRelated,
        litigationStageId
      );

      insertQuery += columns.join(', ') + ') VALUES (';
      insertQuery += columns.map((_, i) => `$${i + 1}`).join(', ');
      insertQuery += ') RETURNING *';

      const result = await pool.query(insertQuery, values);

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event: result.rows[0]
      });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({
        error: 'Failed to create calendar event',
        details: error.message
      });
    }
  },

  async updateEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;
      const updateData = req.body;

      const eventCheck = await pool.query(
        `SELECT * FROM calendar_events WHERE id = $1`,
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventCheck.rows[0];
      
      const isOwner = 
        (userType === 'individual' && event.user_id === userId) ||
        (userType === 'law_firm' && event.law_firm_id === userId) ||
        (userType === 'medical_provider' && event.medical_provider_id === userId);

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to modify this event' });
      }

      const allowedFields = ['title', 'description', 'location', 'start_time', 'end_time', 'all_day', 'reminder_enabled', 'reminder_minutes_before', 'event_type'];
      const updates = [];
      const values = [];
      let paramIndex = 1;

      for (const field of allowedFields) {
        const snakeField = field;
        if (updateData[snakeField] !== undefined) {
          updates.push(`${snakeField} = $${paramIndex}`);
          values.push(updateData[snakeField]);
          paramIndex++;
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(eventId);

      const updateQuery = `
        UPDATE calendar_events
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(updateQuery, values);

      res.json({
        success: true,
        message: 'Event updated successfully',
        event: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating calendar event:', error);
      res.status(500).json({
        error: 'Failed to update calendar event',
        details: error.message
      });
    }
  },

  async deleteEvent(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;

      const eventCheck = await pool.query(
        `SELECT * FROM calendar_events WHERE id = $1`,
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventCheck.rows[0];
      
      const isOwner = 
        (userType === 'individual' && event.user_id === userId) ||
        (userType === 'law_firm' && event.law_firm_id === userId) ||
        (userType === 'medical_provider' && event.medical_provider_id === userId);

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to delete this event' });
      }

      await pool.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

      res.json({
        success: true,
        message: 'Event deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      res.status(500).json({
        error: 'Failed to delete calendar event',
        details: error.message
      });
    }
  },

  async updateSyncStatus(req, res) {
    try {
      const { eventId } = req.params;
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;
      let { deviceEventId, device_event_id, syncedToDevice, synced_to_device, lastSyncedAt, last_synced_at } = req.body;

      deviceEventId = deviceEventId || device_event_id;
      syncedToDevice = syncedToDevice !== undefined ? syncedToDevice : synced_to_device;
      lastSyncedAt = lastSyncedAt || last_synced_at;

      const eventCheck = await pool.query(
        `SELECT * FROM calendar_events WHERE id = $1`,
        [eventId]
      );

      if (eventCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Event not found' });
      }

      const event = eventCheck.rows[0];
      
      const isOwner = 
        (userType === 'individual' && event.user_id === userId) ||
        (userType === 'law_firm' && event.law_firm_id === userId) ||
        (userType === 'medical_provider' && event.medical_provider_id === userId);

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to update this event' });
      }

      const result = await pool.query(
        `UPDATE calendar_events
         SET device_event_id = $1,
             synced_to_device = $2,
             last_synced_at = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [deviceEventId, syncedToDevice, lastSyncedAt, eventId]
      );

      res.json({
        success: true,
        message: 'Sync status updated successfully',
        event: result.rows[0]
      });
    } catch (error) {
      console.error('Error updating sync status:', error);
      res.status(500).json({
        error: 'Failed to update sync status',
        details: error.message
      });
    }
  }
};

module.exports = calendarController;
