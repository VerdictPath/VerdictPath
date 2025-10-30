const { pool } = require('../config/db');

const eventRequestController = {
  // Law firm creates an event request for a client
  async createEventRequest(req, res) {
    try {
      const lawFirmId = req.user.id;
      const userType = req.user.type;

      if (userType !== 'law_firm') {
        return res.status(403).json({ error: 'Only law firms can create event requests' });
      }

      const {
        clientId,
        client_id,
        eventType,
        event_type,
        title,
        description,
        location,
        durationMinutes,
        duration_minutes,
        notes
      } = req.body;

      const finalClientId = clientId || client_id;
      const finalEventType = eventType || event_type;
      const finalDurationMinutes = durationMinutes || duration_minutes || 60;

      if (!finalClientId || !finalEventType || !title) {
        return res.status(400).json({
          error: 'Client ID, event type, and title are required'
        });
      }

      // Verify client is connected to this law firm
      const connectionCheck = await pool.query(
        `SELECT id FROM connections 
         WHERE individual_user_id = $1 AND law_firm_id = $2 AND status = 'accepted'`,
        [finalClientId, lawFirmId]
      );

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({
          error: 'Client is not connected to your law firm'
        });
      }

      // Create event request
      const result = await pool.query(
        `INSERT INTO event_requests (
          law_firm_id, client_id, event_type, title, description, 
          location, duration_minutes, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
        RETURNING *`,
        [lawFirmId, finalClientId, finalEventType, title, description, location, finalDurationMinutes, notes]
      );

      const eventRequest = result.rows[0];

      // Send notification to client
      try {
        await pool.query(
          `INSERT INTO notifications (
            user_id, sender_id, notification_type, title, body, 
            action_type, action_data, is_read
          ) VALUES ($1, $2, 'event_request', $3, $4, 'navigate', $5, false)`,
          [
            finalClientId,
            lawFirmId,
            'Event Request from Your Law Firm',
            `Your law firm is requesting to schedule a ${finalEventType}. Please select 3 available dates.`,
            JSON.stringify({ screen: 'event-requests' })
          ]
        );
      } catch (notifError) {
        console.error('Error sending notification:', notifError);
      }

      res.status(201).json({
        success: true,
        eventRequest: {
          id: eventRequest.id,
          lawFirmId: eventRequest.law_firm_id,
          clientId: eventRequest.client_id,
          eventType: eventRequest.event_type,
          title: eventRequest.title,
          description: eventRequest.description,
          location: eventRequest.location,
          durationMinutes: eventRequest.duration_minutes,
          status: eventRequest.status,
          createdAt: eventRequest.created_at,
          notes: eventRequest.notes
        }
      });
    } catch (error) {
      console.error('Error creating event request:', error);
      res.status(500).json({ error: 'Failed to create event request' });
    }
  },

  // Get all event requests for a user (law firm or client)
  async getEventRequests(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type;
      const { status } = req.query;

      let query;
      let params;

      if (userType === 'law_firm') {
        query = `
          SELECT er.*, 
            u.name as client_name,
            u.email as client_email,
            ce.id as confirmed_event_id
          FROM event_requests er
          LEFT JOIN users u ON er.client_id = u.id
          LEFT JOIN calendar_events ce ON er.confirmed_event_id = ce.id
          WHERE er.law_firm_id = $1
        `;
        params = [userId];
      } else if (userType === 'individual') {
        query = `
          SELECT er.*, 
            u.name as law_firm_name,
            u.email as law_firm_email,
            ce.id as confirmed_event_id
          FROM event_requests er
          LEFT JOIN users u ON er.law_firm_id = u.id
          LEFT JOIN calendar_events ce ON er.confirmed_event_id = ce.id
          WHERE er.client_id = $1
        `;
        params = [userId];
      } else {
        return res.status(403).json({ error: 'Invalid user type for event requests' });
      }

      if (status) {
        query += ` AND er.status = $2`;
        params.push(status);
      }

      query += ` ORDER BY er.created_at DESC`;

      const result = await pool.query(query, params);

      const eventRequests = result.rows.map(row => ({
        id: row.id,
        lawFirmId: row.law_firm_id,
        lawFirmName: row.law_firm_name,
        clientId: row.client_id,
        clientName: row.client_name,
        eventType: row.event_type,
        title: row.title,
        description: row.description,
        location: row.location,
        durationMinutes: row.duration_minutes,
        status: row.status,
        createdAt: row.created_at,
        respondedAt: row.responded_at,
        confirmedEventId: row.confirmed_event_id,
        notes: row.notes
      }));

      res.json({ eventRequests });
    } catch (error) {
      console.error('Error fetching event requests:', error);
      res.status(500).json({ error: 'Failed to fetch event requests' });
    }
  },

  // Get a single event request with proposed dates
  async getEventRequestById(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = req.user.type;

      const eventRequestResult = await pool.query(
        `SELECT er.*, 
          lf.name as law_firm_name,
          c.name as client_name
         FROM event_requests er
         LEFT JOIN users lf ON er.law_firm_id = lf.id
         LEFT JOIN users c ON er.client_id = c.id
         WHERE er.id = $1`,
        [requestId]
      );

      if (eventRequestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event request not found' });
      }

      const eventRequest = eventRequestResult.rows[0];

      // Verify user has access to this request
      if (userType === 'law_firm' && eventRequest.law_firm_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userType === 'individual' && eventRequest.client_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Get proposed dates
      const proposedDatesResult = await pool.query(
        `SELECT * FROM event_request_proposed_dates 
         WHERE event_request_id = $1 
         ORDER BY proposed_start_time ASC`,
        [requestId]
      );

      res.json({
        eventRequest: {
          id: eventRequest.id,
          lawFirmId: eventRequest.law_firm_id,
          lawFirmName: eventRequest.law_firm_name,
          clientId: eventRequest.client_id,
          clientName: eventRequest.client_name,
          eventType: eventRequest.event_type,
          title: eventRequest.title,
          description: eventRequest.description,
          location: eventRequest.location,
          durationMinutes: eventRequest.duration_minutes,
          status: eventRequest.status,
          createdAt: eventRequest.created_at,
          respondedAt: eventRequest.responded_at,
          confirmedEventId: eventRequest.confirmed_event_id,
          notes: eventRequest.notes
        },
        proposedDates: proposedDatesResult.rows.map(row => ({
          id: row.id,
          eventRequestId: row.event_request_id,
          proposedStartTime: row.proposed_start_time,
          proposedEndTime: row.proposed_end_time,
          isSelected: row.is_selected,
          createdAt: row.created_at
        }))
      });
    } catch (error) {
      console.error('Error fetching event request:', error);
      res.status(500).json({ error: 'Failed to fetch event request' });
    }
  },

  // Client submits 3 available dates
  async submitProposedDates(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = req.user.type;
      const { proposedDates, proposed_dates } = req.body;

      const finalProposedDates = proposedDates || proposed_dates;

      if (userType !== 'individual') {
        return res.status(403).json({ error: 'Only clients can submit proposed dates' });
      }

      if (!Array.isArray(finalProposedDates) || finalProposedDates.length !== 3) {
        return res.status(400).json({ error: 'Exactly 3 proposed dates are required' });
      }

      // Verify this is the client's request
      const eventRequestResult = await pool.query(
        `SELECT * FROM event_requests WHERE id = $1 AND client_id = $2`,
        [requestId, userId]
      );

      if (eventRequestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event request not found or access denied' });
      }

      const eventRequest = eventRequestResult.rows[0];

      if (eventRequest.status !== 'pending') {
        return res.status(400).json({ error: 'This event request is no longer pending' });
      }

      await pool.query('BEGIN');

      try {
        // Delete any existing proposed dates
        await pool.query(
          `DELETE FROM event_request_proposed_dates WHERE event_request_id = $1`,
          [requestId]
        );

        // Insert new proposed dates
        for (const date of finalProposedDates) {
          const startTime = date.startTime || date.start_time;
          const endTime = date.endTime || date.end_time;

          if (!startTime || !endTime) {
            throw new Error('Each proposed date must have startTime and endTime');
          }

          await pool.query(
            `INSERT INTO event_request_proposed_dates (
              event_request_id, proposed_start_time, proposed_end_time
            ) VALUES ($1, $2, $3)`,
            [requestId, startTime, endTime]
          );
        }

        // Update event request status
        await pool.query(
          `UPDATE event_requests 
           SET status = 'dates_submitted', responded_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [requestId]
        );

        // Send notification to law firm
        await pool.query(
          `INSERT INTO notifications (
            user_id, sender_id, notification_type, title, body, 
            action_type, action_data, is_read
          ) VALUES ($1, $2, 'event_response', $3, $4, 'navigate', $5, false)`,
          [
            eventRequest.law_firm_id,
            userId,
            'Client Responded to Event Request',
            `Your client has submitted 3 available dates for ${eventRequest.title}.`,
            JSON.stringify({ screen: 'event-request-detail', requestId: requestId })
          ]
        );

        await pool.query('COMMIT');

        res.json({
          success: true,
          message: 'Proposed dates submitted successfully'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error submitting proposed dates:', error);
      res.status(500).json({ error: error.message || 'Failed to submit proposed dates' });
    }
  },

  // Law firm confirms one of the proposed dates
  async confirmProposedDate(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = req.user.type;
      const { proposedDateId, proposed_date_id } = req.body;

      const finalProposedDateId = proposedDateId || proposed_date_id;

      if (userType !== 'law_firm') {
        return res.status(403).json({ error: 'Only law firms can confirm dates' });
      }

      if (!finalProposedDateId) {
        return res.status(400).json({ error: 'Proposed date ID is required' });
      }

      // Verify this is the law firm's request
      const eventRequestResult = await pool.query(
        `SELECT * FROM event_requests WHERE id = $1 AND law_firm_id = $2`,
        [requestId, userId]
      );

      if (eventRequestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event request not found or access denied' });
      }

      const eventRequest = eventRequestResult.rows[0];

      // Get the proposed date
      const proposedDateResult = await pool.query(
        `SELECT * FROM event_request_proposed_dates WHERE id = $1 AND event_request_id = $2`,
        [finalProposedDateId, requestId]
      );

      if (proposedDateResult.rows.length === 0) {
        return res.status(404).json({ error: 'Proposed date not found' });
      }

      const proposedDate = proposedDateResult.rows[0];

      await pool.query('BEGIN');

      try {
        // Create calendar event for the law firm
        const calendarEventResult = await pool.query(
          `INSERT INTO calendar_events (
            law_firm_id, event_type, title, description, location,
            start_time, end_time, all_day, reminder_enabled, 
            reminder_minutes_before, case_related
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, 60, true)
          RETURNING id`,
          [
            userId,
            eventRequest.event_type,
            eventRequest.title,
            eventRequest.description,
            eventRequest.location,
            proposedDate.proposed_start_time,
            proposedDate.proposed_end_time
          ]
        );

        const calendarEventId = calendarEventResult.rows[0].id;

        // Share event with client
        await pool.query(
          `INSERT INTO shared_calendar_events (
            calendar_event_id, shared_with_user_id, can_edit
          ) VALUES ($1, $2, false)`,
          [calendarEventId, eventRequest.client_id]
        );

        // Mark the proposed date as selected
        await pool.query(
          `UPDATE event_request_proposed_dates SET is_selected = true WHERE id = $1`,
          [finalProposedDateId]
        );

        // Update event request with confirmed event
        await pool.query(
          `UPDATE event_requests 
           SET status = 'confirmed', confirmed_event_id = $1
           WHERE id = $2`,
          [calendarEventId, requestId]
        );

        // Send notification to client
        await pool.query(
          `INSERT INTO notifications (
            user_id, sender_id, notification_type, title, body, 
            action_type, action_data, is_read
          ) VALUES ($1, $2, 'event_confirmed', $3, $4, 'navigate', $5, false)`,
          [
            eventRequest.client_id,
            userId,
            'Event Confirmed',
            `Your law firm has confirmed ${eventRequest.title} for ${new Date(proposedDate.proposed_start_time).toLocaleString()}.`,
            JSON.stringify({ screen: 'calendar' })
          ]
        );

        await pool.query('COMMIT');

        res.json({
          success: true,
          message: 'Event confirmed and added to calendar',
          calendarEventId
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error confirming proposed date:', error);
      res.status(500).json({ error: 'Failed to confirm proposed date' });
    }
  },

  // Cancel an event request
  async cancelEventRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = req.user.type;

      const eventRequestResult = await pool.query(
        `SELECT * FROM event_requests WHERE id = $1`,
        [requestId]
      );

      if (eventRequestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event request not found' });
      }

      const eventRequest = eventRequestResult.rows[0];

      // Verify user has access to cancel
      if (userType === 'law_firm' && eventRequest.law_firm_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }
      if (userType === 'individual' && eventRequest.client_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await pool.query(
        `UPDATE event_requests SET status = 'cancelled' WHERE id = $1`,
        [requestId]
      );

      // Send notification to the other party
      const recipientId = userType === 'law_firm' ? eventRequest.client_id : eventRequest.law_firm_id;
      
      await pool.query(
        `INSERT INTO notifications (
          user_id, sender_id, notification_type, title, body, is_read
        ) VALUES ($1, $2, 'event_cancelled', $3, $4, false)`,
        [
          recipientId,
          userId,
          'Event Request Cancelled',
          `The event request for ${eventRequest.title} has been cancelled.`
        ]
      );

      res.json({
        success: true,
        message: 'Event request cancelled'
      });
    } catch (error) {
      console.error('Error cancelling event request:', error);
      res.status(500).json({ error: 'Failed to cancel event request' });
    }
  }
};

module.exports = eventRequestController;
