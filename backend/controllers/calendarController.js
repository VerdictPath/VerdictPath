const { Pool } = require('pg');
const { syncNotificationToFirebase, updateUnreadCount } = require('../services/firebaseSync');
const { sendCalendarEventEmail } = require('../services/emailService');
const { sendNotificationSMS } = require('../services/smsService');
const encryptionService = require('../services/encryption');

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

      let query = '';
      const params = [];
      
      if (userType === 'individual') {
        query = `
          SELECT DISTINCT ON (id) * FROM (
            SELECT ce.*, 
              NULL as shared_by_type, 
              NULL::integer as shared_by_id,
              NULL::text as shared_by_name,
              false as is_shared,
              'self' as event_source
            FROM calendar_events ce
            WHERE ce.user_id = $1
            
            UNION ALL
            
            SELECT ce.*, 
              'law_firm' as shared_by_type,
              ce.law_firm_id as shared_by_id,
              (SELECT firm_name FROM law_firms WHERE id = ce.law_firm_id) as shared_by_name,
              true as is_shared,
              'law_firm' as event_source
            FROM calendar_events ce
            JOIN shared_calendar_events sce ON sce.event_id = ce.id
            WHERE sce.shared_with_user_id = $1
            AND ce.law_firm_id IS NOT NULL
            AND (ce.user_id IS NULL OR ce.user_id != $1)
            
            UNION ALL
            
            SELECT ce.*, 
              'medical_provider' as shared_by_type,
              ce.medical_provider_id as shared_by_id,
              (SELECT provider_name FROM medical_providers WHERE id = ce.medical_provider_id) as shared_by_name,
              true as is_shared,
              'medical_provider' as event_source
            FROM calendar_events ce
            JOIN shared_calendar_events sce ON sce.event_id = ce.id
            WHERE sce.shared_with_user_id = $1
            AND ce.medical_provider_id IS NOT NULL
            AND (ce.user_id IS NULL OR ce.user_id != $1)
          ) AS all_events ORDER BY id, is_shared ASC
        `;
        params.push(userId);
      } else if (userType === 'law_firm' || userType === 'lawfirm') {
        query = `
          SELECT DISTINCT ON (id) * FROM (
            SELECT ce.*, 
              NULL as shared_by_type, 
              NULL::integer as shared_by_id,
              NULL::text as shared_by_name,
              false as is_shared,
              'self' as event_source
            FROM calendar_events ce
            WHERE ce.law_firm_id = $1
            
            UNION ALL
            
            SELECT ce.*, 
              'individual' as shared_by_type,
              ce.user_id as shared_by_id,
              (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = ce.user_id) as shared_by_name,
              true as is_shared,
              'client' as event_source
            FROM calendar_events ce
            WHERE ce.user_id IN (
              SELECT client_id FROM law_firm_clients WHERE law_firm_id = $1
            )
            AND (ce.law_firm_id IS NULL OR ce.law_firm_id != $1)
            
            UNION ALL
            
            SELECT ce.*, 
              'medical_provider' as shared_by_type,
              ce.medical_provider_id as shared_by_id,
              (SELECT provider_name FROM medical_providers WHERE id = ce.medical_provider_id) as shared_by_name,
              true as is_shared,
              'medical_provider' as event_source
            FROM calendar_events ce
            JOIN shared_calendar_events sce ON sce.event_id = ce.id
            WHERE ce.medical_provider_id IS NOT NULL
            AND (ce.law_firm_id IS NULL OR ce.law_firm_id != $1)
            AND sce.shared_with_user_id IN (
              SELECT client_id FROM law_firm_clients WHERE law_firm_id = $1
            )
          ) AS all_events ORDER BY id, is_shared ASC
        `;
        params.push(userId);
      } else if (userType === 'medical_provider') {
        query = `
          SELECT DISTINCT ON (id) * FROM (
            SELECT ce.*, 
              NULL as shared_by_type, 
              NULL::integer as shared_by_id,
              NULL::text as shared_by_name,
              false as is_shared,
              'self' as event_source
            FROM calendar_events ce
            WHERE ce.medical_provider_id = $1
            
            UNION ALL
            
            SELECT ce.*, 
              'individual' as shared_by_type,
              ce.user_id as shared_by_id,
              (SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE id = ce.user_id) as shared_by_name,
              true as is_shared,
              'patient' as event_source
            FROM calendar_events ce
            WHERE ce.user_id IN (
              SELECT patient_id FROM medical_provider_patients WHERE medical_provider_id = $1
            )
            AND (ce.medical_provider_id IS NULL OR ce.medical_provider_id != $1)
            
            UNION ALL
            
            SELECT ce.*, 
              'law_firm' as shared_by_type,
              ce.law_firm_id as shared_by_id,
              (SELECT firm_name FROM law_firms WHERE id = ce.law_firm_id) as shared_by_name,
              true as is_shared,
              'law_firm' as event_source
            FROM calendar_events ce
            JOIN shared_calendar_events sce ON sce.event_id = ce.id
            WHERE ce.law_firm_id IS NOT NULL
            AND (ce.medical_provider_id IS NULL OR ce.medical_provider_id != $1)
            AND sce.shared_with_user_id IN (
              SELECT patient_id FROM medical_provider_patients WHERE medical_provider_id = $1
            )
          ) AS all_events ORDER BY id, is_shared ASC
        `;
        params.push(userId);
      } else {
        query = `SELECT *, false as is_shared, 'self' as event_source FROM calendar_events WHERE 1 = 0`;
      }

      // Wrap query to apply filters
      let wrappedQuery = `SELECT * FROM (${query}) AS events WHERE 1=1`;

      if (startDate) {
        params.push(startDate);
        wrappedQuery += ` AND start_time >= $${params.length}`;
      }

      if (endDate) {
        params.push(endDate);
        wrappedQuery += ` AND start_time <= $${params.length}`;
      }

      if (eventType) {
        params.push(eventType);
        wrappedQuery += ` AND event_type = $${params.length}`;
      }

      wrappedQuery += ' ORDER BY start_time ASC';

      const result = await pool.query(wrappedQuery, params);

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

  async checkConflicts(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.userType || req.user.type;
      const { date, startTime, endTime } = req.query;

      if (!date || !startTime) {
        return res.status(400).json({ error: 'Date and start time are required' });
      }

      const startDateTime = new Date(`${date}T${startTime}`);
      const resolvedEndTime = endTime || startTime;
      const endDateTime = endTime ? new Date(`${date}T${endTime}`) : new Date(startDateTime.getTime() + 60 * 60 * 1000);

      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        return res.status(400).json({ error: 'Invalid date or time format' });
      }

      let ownerColumn;
      if (userType === 'law_firm') {
        ownerColumn = 'law_firm_id';
      } else if (userType === 'medical_provider') {
        ownerColumn = 'medical_provider_id';
      } else {
        ownerColumn = 'user_id';
      }

      const conflictQuery = `
        SELECT id, title, event_type, start_time, end_time
        FROM calendar_events
        WHERE ${ownerColumn} = $1
        AND start_time::date = $2::date
        AND start_time < $4::timestamp
        AND end_time > $3::timestamp
        ORDER BY start_time ASC
      `;

      const result = await pool.query(conflictQuery, [
        userId, date,
        startDateTime.toISOString(),
        endDateTime.toISOString()
      ]);

      let appointmentConflicts = [];
      if (userType === 'law_firm') {
        const apptResult = await pool.query(
          `SELECT id, title, appointment_type as event_type, 
            (appointment_date + start_time) as start_time,
            (appointment_date + end_time) as end_time
           FROM law_firm_appointments
           WHERE law_firm_id = $1 AND appointment_date = $2::date
           AND start_time < $4::time AND end_time > $3::time
           AND status NOT IN ('cancelled')
           ORDER BY start_time ASC`,
          [userId, date, startTime, resolvedEndTime]
        );
        appointmentConflicts = apptResult.rows;
      } else if (userType === 'medical_provider') {
        const apptResult = await pool.query(
          `SELECT id, appointment_type as event_type,
            (appointment_date + start_time) as start_time,
            (appointment_date + end_time) as end_time
           FROM medical_appointments
           WHERE provider_id = $1 AND appointment_date = $2::date
           AND start_time < $4::time AND end_time > $3::time
           AND status NOT IN ('cancelled')
           ORDER BY start_time ASC`,
          [userId, date, startTime, resolvedEndTime]
        );
        appointmentConflicts = apptResult.rows;
      }

      const allConflicts = [...result.rows, ...appointmentConflicts];

      res.json({
        hasConflicts: allConflicts.length > 0,
        conflicts: allConflicts.map(c => ({
          id: c.id,
          title: c.title || c.event_type,
          eventType: c.event_type,
          startTime: c.start_time,
          endTime: c.end_time
        }))
      });
    } catch (error) {
      console.error('Error checking calendar conflicts:', error);
      res.status(500).json({ error: 'Failed to check for conflicts' });
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
        litigation_stage_id,
        shareWithClientId,
        share_with_client_id
      } = req.body;

      const clientToShareWith = shareWithClientId || share_with_client_id;
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
      const createdEvent = result.rows[0];

      // If a client/patient is specified, create a shared calendar entry
      if (clientToShareWith && (userType === 'law_firm' || userType === 'medical_provider')) {
        try {
          await pool.query(`
            INSERT INTO shared_calendar_events (
              event_id, 
              shared_with_user_id, 
              can_edit, 
              can_delete, 
              shared_by_type, 
              shared_by_id
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            createdEvent.id,
            clientToShareWith,
            false,
            false,
            userType,
            userId
          ]);

          // Send notification to the patient about the new calendar event
          try {
            // Get sender name based on user type
            let senderName = 'Your Provider';
            if (userType === 'medical_provider') {
              const providerResult = await pool.query(
                'SELECT provider_name FROM medical_providers WHERE id = $1',
                [userId]
              );
              if (providerResult.rows.length > 0) {
                senderName = providerResult.rows[0].provider_name;
              }
            } else if (userType === 'law_firm') {
              const firmResult = await pool.query(
                'SELECT firm_name FROM law_firms WHERE id = $1',
                [userId]
              );
              if (firmResult.rows.length > 0) {
                senderName = firmResult.rows[0].firm_name;
              }
            }

            // Format event date for notification
            const eventDate = new Date(startTime);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            });
            const formattedTime = eventDate.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            });

            // Create notification in database
            const notificationResult = await pool.query(`
              INSERT INTO notifications (
                sender_type, sender_id, sender_name, recipient_type, recipient_id,
                type, priority, title, body, action_url, action_data, status
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
              RETURNING *
            `, [
              userType,
              userId,
              senderName,
              'user',
              clientToShareWith,
              'calendar_event',
              'normal',
              `📅 New Calendar Event from ${senderName}`,
              `${title} scheduled for ${formattedDate} at ${formattedTime}`,
              '/calendar',
              JSON.stringify({ eventId: createdEvent.id, eventTitle: title })
            ]);

            const notification = notificationResult.rows[0];

            // Sync to Firebase for real-time delivery
            await syncNotificationToFirebase(notification);
            await updateUnreadCount('user', clientToShareWith);

            // Get client details for email and SMS (join with notification_preferences for SMS settings)
            const clientResult = await pool.query(
              `SELECT u.email, u.phone_encrypted, u.first_name, u.last_name, 
                      COALESCE(np.sms_notifications_enabled, false) as sms_notifications_enabled, 
                      COALESCE(np.email_notifications_enabled, true) as email_notifications_enabled 
               FROM users u 
               LEFT JOIN notification_preferences np ON np.user_id = u.id 
               WHERE u.id = $1`,
              [clientToShareWith]
            );

            if (clientResult.rows.length > 0) {
              const client = clientResult.rows[0];
              const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Valued Client';

              // Send email notification if enabled
              if (client.email && client.email_notifications_enabled !== false) {
                try {
                  await sendCalendarEventEmail(client.email, clientName, {
                    title: title,
                    date: startTime,
                    time: formattedTime,
                    location: location || '',
                    description: description || '',
                    senderName: senderName
                  });
                } catch (emailError) {
                  console.error('Error sending calendar event email:', emailError);
                }
              }

              // Send SMS notification if enabled and phone number exists (decrypt phone_encrypted)
              if (client.phone_encrypted && client.sms_notifications_enabled === true) {
                try {
                  const phoneNumber = encryptionService.decrypt(client.phone_encrypted);
                  if (phoneNumber) {
                    await sendNotificationSMS(
                      phoneNumber,
                      'calendar_event',
                      `📅 New Event from ${senderName}`,
                      `${title} scheduled for ${formattedDate} at ${formattedTime}${location ? ` at ${location}` : ''}`,
                      'normal'
                    );
                  }
                } catch (smsError) {
                  console.error('Error sending calendar event SMS:', smsError);
                }
              }
            }
          } catch (notifyError) {
            console.error('Error sending event notification:', notifyError);
            // Don't fail if notification fails
          }
        } catch (shareError) {
          console.error('Error sharing event:', shareError);
          // Don't fail the whole request if sharing fails
        }
      }

      res.status(201).json({
        success: true,
        message: 'Event created successfully',
        event: createdEvent,
        sharedWithClient: clientToShareWith ? true : false
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
        (userType === 'individual' && String(event.user_id) === String(userId)) ||
        (userType === 'law_firm' && String(event.law_firm_id) === String(userId)) ||
        (userType === 'lawfirm' && String(event.law_firm_id) === String(userId)) ||
        (userType === 'medical_provider' && String(event.medical_provider_id) === String(userId));

      if (!isOwner) {
        return res.status(403).json({ error: 'Unauthorized to delete this event' });
      }

      // Delete shared calendar entries first (foreign key constraint)
      await pool.query('DELETE FROM shared_calendar_events WHERE event_id = $1', [eventId]);
      
      // Delete the main calendar event
      await pool.query('DELETE FROM calendar_events WHERE id = $1', [eventId]);

      res.json({
        success: true,
        message: 'Event deleted successfully and removed from all shared calendars'
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
