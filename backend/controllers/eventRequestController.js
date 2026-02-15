const { pool } = require('../config/db');

const eventRequestController = {
  // Law firm or medical provider creates an event request for a client/patient
  async createEventRequest(req, res) {
    try {
      const providerId = req.user.id;
      const rawUserType = req.user.type || req.user.userType;
      
      // Normalize user type (handle both 'lawfirm' and 'law_firm' formats)
      let userType;
      if (rawUserType === 'lawfirm' || rawUserType === 'law_firm') {
        userType = 'law_firm';
      } else if (rawUserType === 'medicalprovider' || rawUserType === 'medical_provider') {
        userType = 'medical_provider';
      } else {
        userType = rawUserType;
      }

      if (userType !== 'law_firm' && userType !== 'medical_provider') {
        return res.status(403).json({ error: 'Only law firms and medical providers can create event requests' });
      }

      const {
        clientId,
        client_id,
        patientId,
        patient_id,
        eventType,
        event_type,
        title,
        description,
        location,
        durationMinutes,
        duration_minutes,
        notes,
        proposedDates,
        proposed_dates
      } = req.body;
      
      const finalProposedDates = proposedDates || proposed_dates || [];

      const finalRecipientId = clientId || client_id || patientId || patient_id;
      const finalEventType = eventType || event_type;
      const finalDurationMinutes = durationMinutes || duration_minutes || 60;

      if (!finalRecipientId || !finalEventType || !title) {
        return res.status(400).json({
          error: 'Recipient ID, event type, and title are required'
        });
      }

      // Verify connection based on user type
      let connectionCheck;
      if (userType === 'law_firm') {
        connectionCheck = await pool.query(
          `SELECT id FROM law_firm_clients 
           WHERE client_id = $1 AND law_firm_id = $2`,
          [finalRecipientId, providerId]
        );
      } else {
        connectionCheck = await pool.query(
          `SELECT id FROM client_medical_providers 
           WHERE client_id = $1 AND medical_provider_id = $2`,
          [finalRecipientId, providerId]
        );
      }

      if (connectionCheck.rows.length === 0) {
        return res.status(403).json({
          error: userType === 'law_firm' ? 'Client is not connected to your law firm' : 'Patient is not connected to your practice'
        });
      }

      // Create event request with appropriate columns
      let insertQuery, insertParams;
      if (userType === 'law_firm') {
        insertQuery = `INSERT INTO event_requests (
          law_firm_id, client_id, event_type, title, description, 
          location, duration_minutes, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
        RETURNING *`;
        insertParams = [providerId, finalRecipientId, finalEventType, title, description, location, finalDurationMinutes, notes];
      } else {
        insertQuery = `INSERT INTO event_requests (
          medical_provider_id, patient_id, event_type, title, description, 
          location, duration_minutes, status, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
        RETURNING *`;
        insertParams = [providerId, finalRecipientId, finalEventType, title, description, location, finalDurationMinutes, notes];
      }

      const result = await pool.query(insertQuery, insertParams);
      const eventRequest = result.rows[0];

      // If law firm provided proposed dates, insert them
      let insertedProposedDates = [];
      if (finalProposedDates.length > 0) {
        for (const date of finalProposedDates) {
          const startTime = date.startTime || date.start_time;
          const endTime = date.endTime || date.end_time;
          
          if (startTime && endTime) {
            const dateResult = await pool.query(
              `INSERT INTO event_request_proposed_dates (
                event_request_id, proposed_start_time, proposed_end_time, proposed_by
              ) VALUES ($1, $2, $3, 'provider')
              RETURNING *`,
              [eventRequest.id, startTime, endTime]
            );
            insertedProposedDates.push(dateResult.rows[0]);
          }
        }
        
        // Update status to show dates are available for selection
        if (insertedProposedDates.length > 0) {
          await pool.query(
            `UPDATE event_requests SET status = 'dates_offered' WHERE id = $1`,
            [eventRequest.id]
          );
          eventRequest.status = 'dates_offered';
        }
      }

      // Send notification to recipient
      try {
        let senderName = '';
        if (userType === 'law_firm') {
          const firmResult = await pool.query('SELECT firm_name FROM law_firms WHERE id = $1', [providerId]);
          senderName = firmResult.rows[0]?.firm_name || 'Your Law Firm';
        } else {
          const provResult = await pool.query('SELECT provider_name FROM medical_providers WHERE id = $1', [providerId]);
          senderName = provResult.rows[0]?.provider_name || 'Your Medical Provider';
        }

        const notificationTitle = userType === 'law_firm' 
          ? 'Event Request from Your Law Firm'
          : 'Appointment Request from Your Medical Provider';
        const notificationBody = insertedProposedDates.length > 0
          ? `${senderName} is requesting to schedule a ${finalEventType}. Please select one of the ${insertedProposedDates.length} available time slots.`
          : `${senderName} is requesting to schedule a ${finalEventType}. Please select 3 available dates.`;

        await pool.query(
          `INSERT INTO notifications (
            recipient_id, recipient_type, sender_id, sender_type, sender_name,
            type, title, body, subject,
            action_type, action_data, status
          ) VALUES ($1, 'individual', $2, $3, $4, 'event_request', $5, $6, $5, 'navigate', $7, 'pending')`,
          [
            finalRecipientId,
            providerId,
            userType,
            senderName,
            notificationTitle,
            notificationBody,
            JSON.stringify({ screen: 'event-requests', requestId: eventRequest.id })
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
          medicalProviderId: eventRequest.medical_provider_id,
          clientId: eventRequest.client_id,
          patientId: eventRequest.patient_id,
          eventType: eventRequest.event_type,
          title: eventRequest.title,
          description: eventRequest.description,
          location: eventRequest.location,
          durationMinutes: eventRequest.duration_minutes,
          status: eventRequest.status,
          createdAt: eventRequest.created_at,
          notes: eventRequest.notes,
          proposedDates: insertedProposedDates.map(d => ({
            id: d.id,
            startTime: d.proposed_start_time,
            endTime: d.proposed_end_time
          }))
        }
      });
    } catch (error) {
      console.error('Error creating event request:', error.message);
      console.error('Error stack:', error.stack);
      res.status(500).json({ error: 'Failed to create event request' });
    }
  },

  // Helper function to normalize user type
  normalizeUserType(rawType) {
    if (rawType === 'lawfirm' || rawType === 'law_firm') return 'law_firm';
    if (rawType === 'medicalprovider' || rawType === 'medical_provider') return 'medical_provider';
    return rawType;
  },

  // Get all event requests for a user (law firm, medical provider, or individual)
  async getEventRequests(req, res) {
    try {
      const userId = req.user.id;
      const userType = eventRequestController.normalizeUserType(req.user.type || req.user.userType);
      const { status } = req.query;

      let query;
      let params;

      if (userType === 'law_firm') {
        query = `
          SELECT er.*, 
            CONCAT(u.first_name, ' ', u.last_name) as client_name,
            u.email as client_email,
            ce.id as confirmed_event_id
          FROM event_requests er
          LEFT JOIN users u ON er.client_id = u.id
          LEFT JOIN calendar_events ce ON er.confirmed_event_id = ce.id
          WHERE er.law_firm_id = $1
        `;
        params = [userId];
      } else if (userType === 'medical_provider') {
        query = `
          SELECT er.*, 
            CONCAT(u.first_name, ' ', u.last_name) as patient_name,
            u.email as patient_email,
            ce.id as confirmed_event_id
          FROM event_requests er
          LEFT JOIN users u ON er.patient_id = u.id
          LEFT JOIN calendar_events ce ON er.confirmed_event_id = ce.id
          WHERE er.medical_provider_id = $1
        `;
        params = [userId];
      } else if (userType === 'individual') {
        query = `
          SELECT er.*, 
            COALESCE(lawf.firm_name, CONCAT(lfu.first_name, ' ', lfu.last_name)) as law_firm_name,
            COALESCE(lawf.email, lfu.email) as law_firm_email,
            COALESCE(medp.provider_name, CONCAT(mpu.first_name, ' ', mpu.last_name)) as medical_provider_name,
            COALESCE(medp.email, mpu.email) as medical_provider_email,
            ce.id as confirmed_event_id
          FROM event_requests er
          LEFT JOIN law_firms lawf ON er.law_firm_id = lawf.id
          LEFT JOIN users lfu ON lawf.admin_user_id = lfu.id
          LEFT JOIN medical_providers medp ON er.medical_provider_id = medp.id
          LEFT JOIN users mpu ON medp.id = mpu.id
          LEFT JOIN calendar_events ce ON er.confirmed_event_id = ce.id
          WHERE er.client_id = $1 OR er.patient_id = $1
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
        medicalProviderId: row.medical_provider_id,
        medicalProviderName: row.medical_provider_name || row.patient_name,
        clientId: row.client_id,
        clientName: row.client_name,
        patientId: row.patient_id,
        patientName: row.patient_name,
        providerName: row.law_firm_name || row.medical_provider_name,
        recipientName: row.client_name || row.patient_name,
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
      const userType = eventRequestController.normalizeUserType(req.user.type || req.user.userType);

      const eventRequestResult = await pool.query(
        `SELECT er.*, 
          COALESCE(lawf.firm_name, CONCAT(lfu.first_name, ' ', lfu.last_name)) as law_firm_name,
          CONCAT(c.first_name, ' ', c.last_name) as client_name
         FROM event_requests er
         LEFT JOIN law_firms lawf ON er.law_firm_id = lawf.id
         LEFT JOIN users lfu ON lawf.admin_user_id = lfu.id
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
        const clientResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const clientName = clientResult.rows[0] ? `${clientResult.rows[0].first_name} ${clientResult.rows[0].last_name}` : 'Your Client';

        await pool.query(
          `INSERT INTO notifications (
            recipient_id, recipient_type, sender_id, sender_type, sender_name,
            type, title, body, subject,
            action_type, action_data, status
          ) VALUES ($1, 'law_firm', $2, 'user', $3, 'event_response', $4, $5, $4, 'navigate', $6, 'pending')`,
          [
            eventRequest.law_firm_id,
            userId,
            clientName,
            'Client Responded to Event Request',
            `${clientName} has submitted 3 available dates for ${eventRequest.title}. Please select a final date.`,
            JSON.stringify({ screen: 'lawfirm-event-requests', requestId: requestId })
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
      res.status(500).json({ error: 'Failed to submit proposed dates' });
    }
  },

  // Law firm confirms one of the proposed dates (when client submitted dates)
  async confirmProposedDate(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = eventRequestController.normalizeUserType(req.user.type || req.user.userType);
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
        // Get law firm name for notifications and calendar
        const firmResult = await pool.query('SELECT firm_name FROM law_firms WHERE id = $1', [userId]);
        const firmName = firmResult.rows[0]?.firm_name || 'Your Law Firm';

        // Create calendar event for the law firm
        const clientNameResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [eventRequest.client_id]);
        const clientName = clientNameResult.rows[0] ? `${clientNameResult.rows[0].first_name} ${clientNameResult.rows[0].last_name}` : 'Client';

        const calendarEventResult = await pool.query(
          `INSERT INTO calendar_events (
            law_firm_id, event_type, title, description, location,
            start_time, end_time, all_day, reminder_enabled, 
            reminder_minutes_before, case_related, created_by_type, created_by_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, 60, true, 'law_firm', $1)
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
            event_id, shared_with_user_id, can_edit, shared_by_type, shared_by_id
          ) VALUES ($1, $2, false, 'law_firm', $3)
          ON CONFLICT DO NOTHING`,
          [calendarEventId, eventRequest.client_id, userId]
        );

        // Create personal calendar event for the individual user
        await pool.query(
          `INSERT INTO calendar_events (
            user_id, event_type, title, description, location,
            start_time, end_time, all_day, reminder_enabled,
            created_by_type, created_by_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, 'law_firm', $8)`,
          [
            eventRequest.client_id,
            eventRequest.event_type,
            `${eventRequest.title} - ${firmName}`,
            eventRequest.description || '',
            eventRequest.location || '',
            proposedDate.proposed_start_time,
            proposedDate.proposed_end_time,
            userId
          ]
        );

        // Share with any connected medical providers who have calendar access
        try {
          const connectedProviders = await pool.query(
            `SELECT medical_provider_id FROM client_medical_providers WHERE client_id = $1`,
            [eventRequest.client_id]
          );
          for (const provider of connectedProviders.rows) {
            await pool.query(
              `INSERT INTO shared_calendar_events (
                event_id, shared_with_medical_provider_id, can_edit, shared_by_type, shared_by_id
              ) VALUES ($1, $2, false, 'law_firm', $3)
              ON CONFLICT DO NOTHING`,
              [calendarEventId, provider.medical_provider_id, userId]
            );
          }
        } catch (shareErr) {
          console.error('Error sharing with providers:', shareErr);
        }

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
            recipient_id, recipient_type, sender_id, sender_type, sender_name,
            type, title, body, subject,
            action_type, action_data, status
          ) VALUES ($1, 'individual', $2, 'law_firm', $3, 'event_confirmed', $4, $5, $4, 'navigate', $6, 'pending')`,
          [
            eventRequest.client_id,
            userId,
            firmName,
            'Event Confirmed & Added to Calendar',
            `${firmName} has confirmed ${eventRequest.title} for ${new Date(proposedDate.proposed_start_time).toLocaleString()}. The event has been added to your calendar.`,
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

  // Individual selects one of the provider's offered dates
  async selectOfferedDate(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = eventRequestController.normalizeUserType(req.user.type || req.user.userType);
      const { proposedDateId, proposed_date_id } = req.body;

      const finalProposedDateId = proposedDateId || proposed_date_id;

      if (userType !== 'individual') {
        return res.status(403).json({ error: 'Only clients can select dates' });
      }

      if (!finalProposedDateId) {
        return res.status(400).json({ error: 'Proposed date ID is required' });
      }

      // Verify this is the client's request
      const eventRequestResult = await pool.query(
        `SELECT * FROM event_requests WHERE id = $1 AND (client_id = $2 OR patient_id = $2)`,
        [requestId, userId]
      );

      if (eventRequestResult.rows.length === 0) {
        return res.status(404).json({ error: 'Event request not found or access denied' });
      }

      const eventRequest = eventRequestResult.rows[0];

      if (eventRequest.status !== 'dates_offered') {
        return res.status(400).json({ error: 'This event request does not have dates to select' });
      }

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
        const providerId = eventRequest.law_firm_id || eventRequest.medical_provider_id;
        const isLawFirm = !!eventRequest.law_firm_id;

        // Create calendar event for the provider (law firm or medical provider)
        let calendarEventResult;
        if (isLawFirm) {
          calendarEventResult = await pool.query(
            `INSERT INTO calendar_events (
              law_firm_id, event_type, title, description, location,
              start_time, end_time, all_day, reminder_enabled, 
              reminder_minutes_before, case_related
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, 60, true)
            RETURNING id`,
            [
              providerId,
              eventRequest.event_type,
              eventRequest.title,
              eventRequest.description,
              eventRequest.location,
              proposedDate.proposed_start_time,
              proposedDate.proposed_end_time
            ]
          );
        } else {
          calendarEventResult = await pool.query(
            `INSERT INTO calendar_events (
              medical_provider_id, event_type, title, description, location,
              start_time, end_time, all_day, reminder_enabled, 
              reminder_minutes_before, case_related
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, 60, true)
            RETURNING id`,
            [
              providerId,
              eventRequest.event_type,
              eventRequest.title,
              eventRequest.description,
              eventRequest.location,
              proposedDate.proposed_start_time,
              proposedDate.proposed_end_time
            ]
          );
        }

        const calendarEventId = calendarEventResult.rows[0].id;

        // Share event with the individual user
        await pool.query(
          `INSERT INTO shared_calendar_events (
            event_id, shared_with_user_id, can_edit, shared_by_type, shared_by_id
          ) VALUES ($1, $2, false, $3, $4)
          ON CONFLICT DO NOTHING`,
          [calendarEventId, userId, isLawFirm ? 'law_firm' : 'medical_provider', providerId]
        );

        // Get provider name for calendar event title
        let providerDisplayName = '';
        if (isLawFirm) {
          const fResult = await pool.query('SELECT firm_name FROM law_firms WHERE id = $1', [providerId]);
          providerDisplayName = fResult.rows[0]?.firm_name || 'Law Firm';
        } else {
          const pResult = await pool.query('SELECT provider_name FROM medical_providers WHERE id = $1', [providerId]);
          providerDisplayName = pResult.rows[0]?.provider_name || 'Medical Provider';
        }

        // Also create a personal calendar event for the individual
        await pool.query(
          `INSERT INTO calendar_events (
            user_id, event_type, title, description, location,
            start_time, end_time, all_day, reminder_enabled, created_by_type, created_by_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, true, $8, $9)`,
          [
            userId,
            eventRequest.event_type,
            `${eventRequest.title} - ${providerDisplayName}`,
            eventRequest.description || '',
            eventRequest.location || '',
            proposedDate.proposed_start_time,
            proposedDate.proposed_end_time,
            isLawFirm ? 'law_firm' : 'medical_provider',
            providerId
          ]
        );

        // Share with any other connected providers/firms who have calendar access
        try {
          if (isLawFirm) {
            const connectedProviders = await pool.query(
              `SELECT medical_provider_id FROM client_medical_providers WHERE client_id = $1`,
              [userId]
            );
            for (const provider of connectedProviders.rows) {
              await pool.query(
                `INSERT INTO shared_calendar_events (
                  event_id, shared_with_medical_provider_id, can_edit, shared_by_type, shared_by_id
                ) VALUES ($1, $2, false, 'law_firm', $3)
                ON CONFLICT DO NOTHING`,
                [calendarEventId, provider.medical_provider_id, providerId]
              );
            }
          } else {
            const connectedFirms = await pool.query(
              `SELECT law_firm_id FROM law_firm_clients WHERE client_id = $1`,
              [userId]
            );
            for (const firm of connectedFirms.rows) {
              await pool.query(
                `INSERT INTO shared_calendar_events (
                  event_id, shared_with_law_firm_id, can_edit, shared_by_type, shared_by_id
                ) VALUES ($1, $2, false, 'medical_provider', $3)
                ON CONFLICT DO NOTHING`,
                [calendarEventId, firm.law_firm_id, providerId]
              );
            }
          }
        } catch (shareErr) {
          console.error('Error sharing with connected providers/firms:', shareErr);
        }

        // Mark the proposed date as selected
        await pool.query(
          `UPDATE event_request_proposed_dates SET is_selected = true WHERE id = $1`,
          [finalProposedDateId]
        );

        // Update event request with confirmed event
        await pool.query(
          `UPDATE event_requests 
           SET status = 'confirmed', confirmed_event_id = $1, responded_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [calendarEventId, requestId]
        );

        // Send notification to provider
        const clientNameResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        const clientFullName = clientNameResult.rows[0] ? `${clientNameResult.rows[0].first_name} ${clientNameResult.rows[0].last_name}` : 'Your Client';
        const providerRecipientType = isLawFirm ? 'law_firm' : 'medical_provider';

        await pool.query(
          `INSERT INTO notifications (
            recipient_id, recipient_type, sender_id, sender_type, sender_name,
            type, title, body, subject,
            action_type, action_data, status
          ) VALUES ($1, $2, $3, 'user', $4, 'event_confirmed', $5, $6, $5, 'navigate', $7, 'pending')`,
          [
            providerId,
            providerRecipientType,
            userId,
            clientFullName,
            'Event Date Selected & Confirmed',
            `${clientFullName} has selected a date for ${eventRequest.title}: ${new Date(proposedDate.proposed_start_time).toLocaleString()}. The event has been added to both calendars.`,
            JSON.stringify({ screen: 'calendar' })
          ]
        );

        await pool.query('COMMIT');

        res.json({
          success: true,
          message: 'Date selected and event added to both calendars',
          calendarEventId
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error selecting offered date:', error);
      res.status(500).json({ error: 'Failed to select date' });
    }
  },

  // Cancel an event request
  async cancelEventRequest(req, res) {
    try {
      const { requestId } = req.params;
      const userId = req.user.id;
      const userType = eventRequestController.normalizeUserType(req.user.type || req.user.userType);

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
      if (userType === 'individual' && eventRequest.client_id !== userId && eventRequest.patient_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await pool.query(
        `UPDATE event_requests SET status = 'cancelled' WHERE id = $1`,
        [requestId]
      );

      // Send notification to the other party
      let recipientId, recipientType, cancellerName;
      if (userType === 'law_firm') {
        recipientId = eventRequest.client_id || eventRequest.patient_id;
        recipientType = 'individual';
        const firmResult = await pool.query('SELECT firm_name FROM law_firms WHERE id = $1', [userId]);
        cancellerName = firmResult.rows[0]?.firm_name || 'Your Law Firm';
      } else {
        recipientId = eventRequest.law_firm_id || eventRequest.medical_provider_id;
        recipientType = eventRequest.law_firm_id ? 'law_firm' : 'medical_provider';
        const userResult = await pool.query('SELECT first_name, last_name FROM users WHERE id = $1', [userId]);
        cancellerName = userResult.rows[0] ? `${userResult.rows[0].first_name} ${userResult.rows[0].last_name}` : 'User';
      }
      
      await pool.query(
        `INSERT INTO notifications (
          recipient_id, recipient_type, sender_id, sender_type, sender_name,
          type, title, body, subject, status
        ) VALUES ($1, $2, $3, $4, $5, 'event_cancelled', $6, $7, $6, 'pending')`,
        [
          recipientId,
          recipientType,
          userId,
          userType === 'law_firm' ? 'law_firm' : 'user',
          cancellerName,
          'Event Request Cancelled',
          `${cancellerName} has cancelled the event request for ${eventRequest.title}.`
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
