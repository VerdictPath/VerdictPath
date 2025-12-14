const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

async function verifyLawFirmOwnership(req, lawFirmId) {
  if (req.user.userType !== 'lawfirm') return false;
  const userId = req.user.lawFirmId || req.user.id;
  return String(userId) === String(lawFirmId);
}

async function verifyClientOwnership(req, clientId) {
  if (req.user.userType !== 'individual') return false;
  return String(req.user.id) === String(clientId);
}

async function verifyClientConnectedToLawFirm(req, lawFirmId) {
  if (req.user.userType !== 'individual') return false;
  const result = await db.query(
    `SELECT 1 FROM law_firm_clients WHERE law_firm_id = $1 AND client_id = $2`,
    [lawFirmId, req.user.id]
  );
  return result.rows.length > 0;
}

async function verifyLawFirmOrConnectedClient(req, lawFirmId) {
  if (req.user.userType === 'lawfirm') {
    return await verifyLawFirmOwnership(req, lawFirmId);
  }
  if (req.user.userType === 'individual') {
    return await verifyClientConnectedToLawFirm(req, lawFirmId);
  }
  return false;
}

async function verifyAppointmentAccess(req, appointmentId) {
  const result = await db.query(
    `SELECT client_id, law_firm_id FROM law_firm_appointments WHERE id = $1`,
    [appointmentId]
  );
  if (result.rows.length === 0) return false;
  const apt = result.rows[0];
  
  if (req.user.userType === 'individual' && String(apt.client_id) === String(req.user.id)) return true;
  if (req.user.userType === 'lawfirm') {
    const firmId = req.user.lawFirmId || req.user.id;
    if (String(apt.law_firm_id) === String(firmId)) return true;
  }
  return false;
}

function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Get law firm availability
router.get('/law-firms/:lawFirmId/availability', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    
    if (!await verifyLawFirmOrConnectedClient(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Access denied' });
    }
    
    const result = await db.query(
      `SELECT * FROM law_firm_availability 
       WHERE law_firm_id = $1 AND is_active = true
       ORDER BY day_of_week, start_time`,
      [lawFirmId]
    );
    
    res.json({ success: true, availability: result.rows });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch availability' });
  }
});

// Set law firm availability
router.post('/law-firms/:lawFirmId/availability', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { dayOfWeek, startTime, endTime, isRecurring, specificDate, slotDuration, bufferMinutes, meetingType } = req.body;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own availability' });
    }
    
    const result = await db.query(
      `INSERT INTO law_firm_availability 
       (law_firm_id, day_of_week, start_time, end_time, is_recurring, specific_date, slot_duration_minutes, buffer_minutes, meeting_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [lawFirmId, dayOfWeek, startTime, endTime, isRecurring !== false, specificDate || null, slotDuration || 30, bufferMinutes || 15, meetingType || 'consultation']
    );
    
    res.json({ success: true, availability: result.rows[0] });
  } catch (error) {
    console.error('Error setting availability:', error);
    res.status(500).json({ success: false, error: 'Failed to set availability' });
  }
});

// Delete law firm availability
router.delete('/law-firms/:lawFirmId/availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId, availabilityId } = req.params;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own availability' });
    }
    
    await db.query(
      `UPDATE law_firm_availability SET is_active = false WHERE id = $1 AND law_firm_id = $2`,
      [availabilityId, lawFirmId]
    );
    
    res.json({ success: true, message: 'Availability removed' });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ success: false, error: 'Failed to delete availability' });
  }
});

// Block time for law firm
router.post('/law-firms/:lawFirmId/block-time', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { startDatetime, endDatetime, reason, blockType, isAllDay } = req.body;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own calendar' });
    }
    
    const result = await db.query(
      `INSERT INTO law_firm_blocked_times 
       (law_firm_id, start_datetime, end_datetime, reason, block_type, is_all_day)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [lawFirmId, startDatetime, endDatetime, reason || null, blockType || 'personal', isAllDay || false]
    );
    
    res.json({ success: true, blockedTime: result.rows[0] });
  } catch (error) {
    console.error('Error blocking time:', error);
    res.status(500).json({ success: false, error: 'Failed to block time' });
  }
});

// Get blocked times for law firm
router.get('/law-firms/:lawFirmId/blocked-times', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Access denied' });
    }
    
    const result = await db.query(
      `SELECT * FROM law_firm_blocked_times 
       WHERE law_firm_id = $1 AND end_datetime >= NOW()
       ORDER BY start_datetime`,
      [lawFirmId]
    );
    
    res.json({ success: true, blockedTimes: result.rows });
  } catch (error) {
    console.error('Error fetching blocked times:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blocked times' });
  }
});

// Delete blocked time
router.delete('/law-firms/:lawFirmId/blocked-times/:blockId', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId, blockId } = req.params;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own calendar' });
    }
    
    await db.query(
      `DELETE FROM law_firm_blocked_times WHERE id = $1 AND law_firm_id = $2`,
      [blockId, lawFirmId]
    );
    
    res.json({ success: true, message: 'Blocked time removed' });
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    res.status(500).json({ success: false, error: 'Failed to delete blocked time' });
  }
});

// Get available slots for a specific date
router.get('/law-firms/:lawFirmId/available-slots', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { date } = req.query;
    
    if (!await verifyLawFirmOrConnectedClient(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Access denied' });
    }
    
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }
    
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Get calendar settings for multi-booking
    const settingsResult = await db.query(
      `SELECT allow_multi_booking, max_concurrent_bookings FROM law_firm_calendar_settings WHERE law_firm_id = $1`,
      [lawFirmId]
    );
    const settings = settingsResult.rows[0] || { allow_multi_booking: false, max_concurrent_bookings: 1 };
    const maxBookings = settings.allow_multi_booking ? (settings.max_concurrent_bookings || 4) : 1;
    
    const availabilityResult = await db.query(
      `SELECT * FROM law_firm_availability 
       WHERE law_firm_id = $1 AND is_active = true
       AND (day_of_week = $2 OR specific_date = $3)`,
      [lawFirmId, dayOfWeek, date]
    );
    
    const blockedResult = await db.query(
      `SELECT * FROM law_firm_blocked_times 
       WHERE law_firm_id = $1 
       AND DATE(start_datetime) <= $2 AND DATE(end_datetime) >= $2`,
      [lawFirmId, date]
    );
    
    const appointmentsResult = await db.query(
      `SELECT start_time, end_time FROM law_firm_appointments 
       WHERE law_firm_id = $1 AND appointment_date = $2 
       AND status NOT IN ('cancelled')`,
      [lawFirmId, date]
    );
    
    const slots = [];
    const blockedTimes = blockedResult.rows;
    const existingAppointments = appointmentsResult.rows;
    
    for (const avail of availabilityResult.rows) {
      const slotDuration = avail.slot_duration_minutes || 30;
      const buffer = avail.buffer_minutes || 15;
      
      let currentTime = parseTime(avail.start_time);
      const endTime = parseTime(avail.end_time);
      
      while (currentTime + slotDuration <= endTime) {
        const slotStart = formatTime(currentTime);
        const slotEnd = formatTime(currentTime + slotDuration);
        
        const isBlocked = blockedTimes.some(block => {
          const blockStart = new Date(block.start_datetime);
          const blockEnd = new Date(block.end_datetime);
          const slotDateTime = new Date(`${date}T${slotStart}`);
          return slotDateTime >= blockStart && slotDateTime < blockEnd;
        });
        
        // Count appointments in this slot for multi-booking support
        const appointmentCount = existingAppointments.filter(appt => {
          return slotStart >= appt.start_time.substring(0, 5) && slotStart < appt.end_time.substring(0, 5);
        }).length;
        
        const hasCapacity = appointmentCount < maxBookings;
        
        if (!isBlocked && hasCapacity) {
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            meetingType: avail.meeting_type,
            available: true,
            currentBookings: appointmentCount,
            maxBookings: maxBookings,
            spotsRemaining: maxBookings - appointmentCount
          });
        }
        
        currentTime += slotDuration + buffer;
      }
    }
    
    res.json({ success: true, date, slots, multiBookingEnabled: settings.allow_multi_booking });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch available slots' });
  }
});

// Create appointment (client booking)
router.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId, appointmentDate, startTime, endTime, appointmentType, title, description, location, meetingModality, clientNotes } = req.body;
    const clientId = req.user.id;
    
    if (req.user.userType !== 'individual') {
      return res.status(403).json({ success: false, error: 'Only clients can book appointments' });
    }
    
    // Get multi-booking settings
    const settingsResult = await db.query(
      `SELECT allow_multi_booking, max_concurrent_bookings FROM law_firm_calendar_settings WHERE law_firm_id = $1`,
      [lawFirmId]
    );
    const settings = settingsResult.rows[0] || { allow_multi_booking: false, max_concurrent_bookings: 1 };
    const maxBookings = settings.allow_multi_booking ? (settings.max_concurrent_bookings || 4) : 1;
    
    // Count existing appointments in this slot
    const existingResult = await db.query(
      `SELECT id FROM law_firm_appointments 
       WHERE law_firm_id = $1 AND appointment_date = $2 
       AND start_time = $3 AND status NOT IN ('cancelled')`,
      [lawFirmId, appointmentDate, startTime]
    );
    
    if (existingResult.rows.length >= maxBookings) {
      return res.status(400).json({ success: false, error: 'This time slot is no longer available' });
    }
    
    const result = await db.query(
      `INSERT INTO law_firm_appointments 
       (law_firm_id, client_id, appointment_date, start_time, end_time, appointment_type, title, description, location, meeting_modality, client_notes, client_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
       RETURNING *`,
      [lawFirmId, clientId, appointmentDate, startTime, endTime, appointmentType || 'consultation', title || null, description || null, location || null, meetingModality || 'in_person', clientNotes || null]
    );
    
    await syncToIndividualCalendar(clientId, result.rows[0], 'law_firm');
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment booked successfully!' });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

// Law firm creates appointment for client
router.post('/law-firms/:lawFirmId/appointments', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { clientId, appointmentDate, startTime, endTime, appointmentType, title, description, location, meetingModality, firmNotes } = req.body;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const result = await db.query(
      `INSERT INTO law_firm_appointments 
       (law_firm_id, client_id, appointment_date, start_time, end_time, appointment_type, title, description, location, meeting_modality, firm_notes, firm_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
       RETURNING *`,
      [lawFirmId, clientId, appointmentDate, startTime, endTime, appointmentType || 'consultation', title || null, description || null, location || null, meetingModality || 'in_person', firmNotes || null]
    );
    
    await syncToIndividualCalendar(clientId, result.rows[0], 'law_firm');
    
    res.json({ success: true, appointment: result.rows[0] });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

// Get client's law firm appointments
router.get('/clients/:clientId/appointments', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;
    
    if (!await verifyClientOwnership(req, clientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own appointments' });
    }
    
    let query = `
      SELECT lfa.*, lf.firm_name
      FROM law_firm_appointments lfa
      JOIN law_firms lf ON lfa.law_firm_id = lf.id
      WHERE lfa.client_id = $1
    `;
    const params = [clientId];
    
    if (status) {
      query += ` AND lfa.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY lfa.appointment_date DESC, lfa.start_time DESC`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching client appointments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

// Get law firm's appointments
router.get('/law-firms/:lawFirmId/appointments', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { date, status, clientId } = req.query;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own appointments' });
    }
    
    let query = `
      SELECT lfa.*, u.first_name as client_first_name, u.last_name as client_last_name, u.email as client_email
      FROM law_firm_appointments lfa
      JOIN users u ON lfa.client_id = u.id
      WHERE lfa.law_firm_id = $1
    `;
    const params = [lawFirmId];
    let paramIndex = 2;
    
    if (date) {
      query += ` AND lfa.appointment_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND lfa.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    if (clientId) {
      query += ` AND lfa.client_id = $${paramIndex}`;
      params.push(clientId);
    }
    
    query += ` ORDER BY lfa.appointment_date, lfa.start_time`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching law firm appointments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

// Confirm appointment
router.patch('/appointments/:appointmentId/confirm', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userType = req.user.userType;
    
    if (!await verifyAppointmentAccess(req, appointmentId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    let updateField = userType === 'lawfirm' ? 'firm_confirmed' : 'client_confirmed';
    
    await db.query(
      `UPDATE law_firm_appointments SET ${updateField} = true, updated_at = NOW() WHERE id = $1`,
      [appointmentId]
    );
    
    const result = await db.query(
      `UPDATE law_firm_appointments 
       SET status = CASE WHEN client_confirmed AND firm_confirmed THEN 'confirmed' ELSE status END,
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId]
    );
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment confirmed!' });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to confirm appointment' });
  }
});

// Cancel appointment
router.patch('/appointments/:appointmentId/cancel', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.body;
    const userType = req.user.userType;
    
    if (!await verifyAppointmentAccess(req, appointmentId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    let cancelledBy = userType === 'lawfirm' ? 'law_firm' : 'client';
    
    const result = await db.query(
      `UPDATE law_firm_appointments 
       SET status = 'cancelled', cancellation_reason = $2, cancelled_by = $3, cancelled_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId, reason || null, cancelledBy]
    );
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment cancelled' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to cancel appointment' });
  }
});

// Complete appointment
router.patch('/appointments/:appointmentId/complete', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { firmNotes } = req.body;
    
    if (!await verifyAppointmentAccess(req, appointmentId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const result = await db.query(
      `UPDATE law_firm_appointments 
       SET status = 'completed', firm_notes = COALESCE($2, firm_notes), completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId, firmNotes]
    );
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment marked as completed' });
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to complete appointment' });
  }
});

// Get calendar settings
router.get('/law-firms/:lawFirmId/calendar-settings', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    
    let result = await db.query(
      `SELECT * FROM law_firm_calendar_settings WHERE law_firm_id = $1`,
      [lawFirmId]
    );
    
    if (result.rows.length === 0) {
      result = await db.query(
        `INSERT INTO law_firm_calendar_settings (law_firm_id) VALUES ($1) RETURNING *`,
        [lawFirmId]
      );
    }
    
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching calendar settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar settings' });
  }
});

// Update calendar settings
router.patch('/law-firms/:lawFirmId/calendar-settings', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { timezone, defaultSlotDuration, defaultBufferMinutes, advanceBookingDays, minimumNoticeHours, emailNotifications, smsNotifications, autoConfirmAppointments, allowMultiBooking, maxConcurrentBookings } = req.body;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const result = await db.query(
      `UPDATE law_firm_calendar_settings 
       SET timezone = COALESCE($2, timezone),
           default_slot_duration = COALESCE($3, default_slot_duration),
           default_buffer_minutes = COALESCE($4, default_buffer_minutes),
           advance_booking_days = COALESCE($5, advance_booking_days),
           minimum_notice_hours = COALESCE($6, minimum_notice_hours),
           email_notifications = COALESCE($7, email_notifications),
           sms_notifications = COALESCE($8, sms_notifications),
           auto_confirm_appointments = COALESCE($9, auto_confirm_appointments),
           allow_multi_booking = COALESCE($10, allow_multi_booking),
           max_concurrent_bookings = COALESCE($11, max_concurrent_bookings),
           updated_at = NOW()
       WHERE law_firm_id = $1
       RETURNING *`,
      [lawFirmId, timezone, defaultSlotDuration, defaultBufferMinutes, advanceBookingDays, minimumNoticeHours, emailNotifications, smsNotifications, autoConfirmAppointments, allowMultiBooking, maxConcurrentBookings || 4]
    );
    
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Error updating calendar settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update calendar settings' });
  }
});

// Get connected law firms for client booking
router.get('/clients/:clientId/connected-law-firms', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    
    if (!await verifyClientOwnership(req, clientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const result = await db.query(
      `SELECT lf.id, lf.firm_name, lf.phone_number, lf.email
       FROM law_firms lf
       INNER JOIN law_firm_clients lfc ON lf.id = lfc.law_firm_id
       WHERE lfc.client_id = $1
       ORDER BY lf.firm_name`,
      [clientId]
    );
    
    res.json({ success: true, lawFirms: result.rows });
  } catch (error) {
    console.error('Error fetching connected law firms:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch law firms' });
  }
});

// Send availability request
router.post('/law-firms/:lawFirmId/availability-requests', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { clientId, title, description, appointmentType, preferredDates, minDurationMinutes, priority, deadline } = req.body;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const result = await db.query(
      `INSERT INTO law_firm_availability_requests 
       (law_firm_id, client_id, title, description, appointment_type, preferred_dates, min_duration_minutes, priority, deadline)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [lawFirmId, clientId, title, description || null, appointmentType || 'consultation', JSON.stringify(preferredDates || []), minDurationMinutes || 30, priority || 'normal', deadline || null]
    );
    
    res.json({ success: true, request: result.rows[0] });
  } catch (error) {
    console.error('Error creating availability request:', error);
    res.status(500).json({ success: false, error: 'Failed to create availability request' });
  }
});

// Get availability requests for client
router.get('/clients/:clientId/availability-requests', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { status } = req.query;
    
    if (!await verifyClientOwnership(req, clientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    let query = `
      SELECT lar.*, lf.firm_name
      FROM law_firm_availability_requests lar
      JOIN law_firms lf ON lar.law_firm_id = lf.id
      WHERE lar.client_id = $1
    `;
    const params = [clientId];
    
    if (status) {
      query += ` AND lar.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY lar.created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Error fetching availability requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// Get availability requests for law firm
router.get('/law-firms/:lawFirmId/availability-requests', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { status } = req.query;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    let query = `
      SELECT lar.*, u.first_name as client_first_name, u.last_name as client_last_name
      FROM law_firm_availability_requests lar
      JOIN users u ON lar.client_id = u.id
      WHERE lar.law_firm_id = $1
    `;
    const params = [lawFirmId];
    
    if (status) {
      query += ` AND lar.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY lar.created_at DESC`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, requests: result.rows });
  } catch (error) {
    console.error('Error fetching availability requests:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch requests' });
  }
});

// Respond to availability request
router.patch('/availability-requests/:requestId/respond', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { accept, selectedDate, selectedStartTime, selectedEndTime, clientResponseNotes } = req.body;
    
    const requestResult = await db.query(
      `SELECT * FROM law_firm_availability_requests WHERE id = $1`,
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }
    
    const request = requestResult.rows[0];
    
    if (!await verifyClientOwnership(req, request.client_id)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    if (accept) {
      const appointmentResult = await db.query(
        `INSERT INTO law_firm_appointments 
         (law_firm_id, client_id, appointment_date, start_time, end_time, appointment_type, title, client_confirmed)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING *`,
        [request.law_firm_id, request.client_id, selectedDate, selectedStartTime, selectedEndTime, request.appointment_type, request.title]
      );
      
      await db.query(
        `UPDATE law_firm_availability_requests 
         SET status = 'accepted', selected_date = $2, selected_start_time = $3, selected_end_time = $4, 
             client_response_notes = $5, responded_at = NOW(), appointment_id = $6, updated_at = NOW()
         WHERE id = $1`,
        [requestId, selectedDate, selectedStartTime, selectedEndTime, clientResponseNotes || null, appointmentResult.rows[0].id]
      );
      
      await syncToIndividualCalendar(request.client_id, appointmentResult.rows[0], 'law_firm');
      
      res.json({ success: true, message: 'Appointment scheduled!', appointment: appointmentResult.rows[0] });
    } else {
      await db.query(
        `UPDATE law_firm_availability_requests 
         SET status = 'declined', client_response_notes = $2, responded_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [requestId, clientResponseNotes || null]
      );
      
      res.json({ success: true, message: 'Request declined' });
    }
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ success: false, error: 'Failed to respond to request' });
  }
});

// Helper to sync appointments to individual's unified calendar
async function syncToIndividualCalendar(userId, appointment, sourceType) {
  try {
    const eventTitle = appointment.title || `${sourceType === 'law_firm' ? 'Law Firm' : 'Medical'} Appointment`;
    const startTime = new Date(`${appointment.appointment_date}T${appointment.start_time}`);
    const endTime = appointment.end_time ? new Date(`${appointment.appointment_date}T${appointment.end_time}`) : null;
    
    await db.query(
      `INSERT INTO calendar_events 
       (user_id, event_type, title, description, location, start_time, end_time, created_by_type, created_by_id)
       VALUES ($1, 'appointment', $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [userId, eventTitle, appointment.description || null, appointment.location || null, startTime, endTime, sourceType, appointment.id]
    );
  } catch (error) {
    console.error('Error syncing to calendar:', error);
  }
}

// Get unified calendar events for individual (all appointments + personal events)
router.get('/clients/:clientId/unified-calendar', authenticateToken, async (req, res) => {
  try {
    const { clientId } = req.params;
    const { startDate, endDate } = req.query;
    
    if (!await verifyClientOwnership(req, clientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    
    const lawFirmAppointments = await db.query(
      `SELECT lfa.*, lf.firm_name, 'law_firm' as source_type
       FROM law_firm_appointments lfa
       JOIN law_firms lf ON lfa.law_firm_id = lf.id
       WHERE lfa.client_id = $1 AND lfa.status != 'cancelled'
       ${startDate ? 'AND lfa.appointment_date >= $2' : ''}
       ${endDate ? `AND lfa.appointment_date <= $${startDate ? 3 : 2}` : ''}
       ORDER BY lfa.appointment_date, lfa.start_time`,
      startDate && endDate ? [clientId, startDate, endDate] : 
      startDate ? [clientId, startDate] : 
      endDate ? [clientId, endDate] : [clientId]
    );
    
    const medicalAppointments = await db.query(
      `SELECT ma.*, mp.provider_name, 'medical' as source_type
       FROM medical_appointments ma
       JOIN medical_providers mp ON ma.provider_id = mp.id
       WHERE ma.patient_id = $1 AND ma.status != 'cancelled'
       ${startDate ? 'AND ma.appointment_date >= $2' : ''}
       ${endDate ? `AND ma.appointment_date <= $${startDate ? 3 : 2}` : ''}
       ORDER BY ma.appointment_date, ma.start_time`,
      startDate && endDate ? [clientId, startDate, endDate] : 
      startDate ? [clientId, startDate] : 
      endDate ? [clientId, endDate] : [clientId]
    );
    
    const personalEvents = await db.query(
      `SELECT *, 'personal' as source_type
       FROM calendar_events
       WHERE user_id = $1
       ${startDate ? 'AND DATE(start_time) >= $2' : ''}
       ${endDate ? `AND DATE(start_time) <= $${startDate ? 3 : 2}` : ''}
       ORDER BY start_time`,
      startDate && endDate ? [clientId, startDate, endDate] : 
      startDate ? [clientId, startDate] : 
      endDate ? [clientId, endDate] : [clientId]
    );
    
    res.json({ 
      success: true, 
      lawFirmAppointments: lawFirmAppointments.rows,
      medicalAppointments: medicalAppointments.rows,
      personalEvents: personalEvents.rows
    });
  } catch (error) {
    console.error('Error fetching unified calendar:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar events' });
  }
});

module.exports = router;
