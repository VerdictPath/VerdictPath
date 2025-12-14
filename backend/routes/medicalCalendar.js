const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// Authorization helper: Verify provider owns the resource
async function verifyProviderOwnership(req, providerId) {
  if (req.user.userType !== 'medical_provider') return false;
  const userId = req.user.medicalProviderId || req.user.id;
  return String(userId) === String(providerId);
}

// Authorization helper: Verify law firm owns the resource
async function verifyLawFirmOwnership(req, lawFirmId) {
  if (req.user.userType !== 'lawfirm') return false;
  const userId = req.user.lawFirmId || req.user.id;
  return String(userId) === String(lawFirmId);
}

// Authorization helper: Verify patient owns the resource
async function verifyPatientOwnership(req, patientId) {
  if (req.user.userType !== 'individual') return false;
  return String(req.user.id) === String(patientId);
}

// Authorization helper: Verify user can access appointment
async function verifyAppointmentAccess(req, appointmentId) {
  const result = await db.query(
    `SELECT patient_id, provider_id, law_firm_id FROM medical_appointments WHERE id = $1`,
    [appointmentId]
  );
  if (result.rows.length === 0) return false;
  const apt = result.rows[0];
  
  if (req.user.userType === 'individual' && String(apt.patient_id) === String(req.user.id)) return true;
  if (req.user.userType === 'medical_provider') {
    const provId = req.user.medicalProviderId || req.user.id;
    if (String(apt.provider_id) === String(provId)) return true;
  }
  if (req.user.userType === 'lawfirm' && apt.law_firm_id) {
    const firmId = req.user.lawFirmId || req.user.id;
    if (String(apt.law_firm_id) === String(firmId)) return true;
  }
  return false;
}

// Get provider availability
router.get('/providers/:providerId/availability', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const result = await db.query(
      `SELECT * FROM provider_availability 
       WHERE provider_id = $1 AND is_active = true
       ORDER BY day_of_week, start_time`,
      [providerId]
    );
    
    res.json({ success: true, availability: result.rows });
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch availability' });
  }
});

// Set provider availability
router.post('/providers/:providerId/availability', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { dayOfWeek, startTime, endTime, isRecurring, specificDate, slotDuration, bufferMinutes } = req.body;
    
    if (!await verifyProviderOwnership(req, providerId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own availability' });
    }
    
    const result = await db.query(
      `INSERT INTO provider_availability 
       (provider_id, day_of_week, start_time, end_time, is_recurring, specific_date, slot_duration_minutes, buffer_minutes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [providerId, dayOfWeek, startTime, endTime, isRecurring !== false, specificDate || null, slotDuration || 30, bufferMinutes || 15]
    );
    
    res.json({ success: true, availability: result.rows[0] });
  } catch (error) {
    console.error('Error setting availability:', error);
    res.status(500).json({ success: false, error: 'Failed to set availability' });
  }
});

// Delete provider availability
router.delete('/providers/:providerId/availability/:availabilityId', authenticateToken, async (req, res) => {
  try {
    const { providerId, availabilityId } = req.params;
    
    if (!await verifyProviderOwnership(req, providerId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own availability' });
    }
    
    await db.query(
      `UPDATE provider_availability SET is_active = false WHERE id = $1 AND provider_id = $2`,
      [availabilityId, providerId]
    );
    
    res.json({ success: true, message: 'Availability removed' });
  } catch (error) {
    console.error('Error deleting availability:', error);
    res.status(500).json({ success: false, error: 'Failed to delete availability' });
  }
});

// Block time for provider
router.post('/providers/:providerId/block-time', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { startDatetime, endDatetime, reason, blockType, isAllDay } = req.body;
    
    if (!await verifyProviderOwnership(req, providerId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own calendar' });
    }
    
    const result = await db.query(
      `INSERT INTO provider_blocked_times 
       (provider_id, start_datetime, end_datetime, reason, block_type, is_all_day)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [providerId, startDatetime, endDatetime, reason || null, blockType || 'personal', isAllDay || false]
    );
    
    res.json({ success: true, blockedTime: result.rows[0] });
  } catch (error) {
    console.error('Error blocking time:', error);
    res.status(500).json({ success: false, error: 'Failed to block time' });
  }
});

// Get blocked times for provider
router.get('/providers/:providerId/blocked-times', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    const result = await db.query(
      `SELECT * FROM provider_blocked_times 
       WHERE provider_id = $1 AND end_datetime >= NOW()
       ORDER BY start_datetime`,
      [providerId]
    );
    
    res.json({ success: true, blockedTimes: result.rows });
  } catch (error) {
    console.error('Error fetching blocked times:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch blocked times' });
  }
});

// Delete blocked time
router.delete('/providers/:providerId/blocked-times/:blockId', authenticateToken, async (req, res) => {
  try {
    const { providerId, blockId } = req.params;
    
    if (!await verifyProviderOwnership(req, providerId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only manage your own calendar' });
    }
    
    await db.query(
      `DELETE FROM provider_blocked_times WHERE id = $1 AND provider_id = $2`,
      [blockId, providerId]
    );
    
    res.json({ success: true, message: 'Blocked time removed' });
  } catch (error) {
    console.error('Error deleting blocked time:', error);
    res.status(500).json({ success: false, error: 'Failed to delete blocked time' });
  }
});

// Get available slots for a specific date
router.get('/providers/:providerId/available-slots', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({ success: false, error: 'Date is required' });
    }
    
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();
    
    // Get calendar settings for multi-booking
    const settingsResult = await db.query(
      `SELECT allow_multi_booking, max_concurrent_bookings FROM calendar_sync_settings WHERE provider_id = $1`,
      [providerId]
    );
    const settings = settingsResult.rows[0] || { allow_multi_booking: false, max_concurrent_bookings: 1 };
    const maxBookings = settings.allow_multi_booking ? (settings.max_concurrent_bookings || 4) : 1;
    
    // Get recurring availability for this day
    const availabilityResult = await db.query(
      `SELECT * FROM provider_availability 
       WHERE provider_id = $1 AND is_active = true
       AND (day_of_week = $2 OR specific_date = $3)`,
      [providerId, dayOfWeek, date]
    );
    
    // Get blocked times for this date
    const blockedResult = await db.query(
      `SELECT * FROM provider_blocked_times 
       WHERE provider_id = $1 
       AND DATE(start_datetime) <= $2 AND DATE(end_datetime) >= $2`,
      [providerId, date]
    );
    
    // Get existing appointments for this date
    const appointmentsResult = await db.query(
      `SELECT start_time, end_time FROM medical_appointments 
       WHERE provider_id = $1 AND appointment_date = $2 
       AND status NOT IN ('cancelled')`,
      [providerId, date]
    );
    
    // Generate available slots
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
        
        // Check if slot is blocked
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

// Create appointment
router.post('/appointments', authenticateToken, async (req, res) => {
  try {
    const { providerId, appointmentDate, startTime, endTime, appointmentType, patientNotes, lawFirmId } = req.body;
    const patientId = req.user.id;
    
    if (req.user.userType !== 'individual') {
      return res.status(403).json({ success: false, error: 'Only patients can book appointments' });
    }
    
    // Get multi-booking settings
    const settingsResult = await db.query(
      `SELECT allow_multi_booking, max_concurrent_bookings FROM calendar_sync_settings WHERE provider_id = $1`,
      [providerId]
    );
    const settings = settingsResult.rows[0] || { allow_multi_booking: false, max_concurrent_bookings: 1 };
    const maxBookings = settings.allow_multi_booking ? (settings.max_concurrent_bookings || 4) : 1;
    
    // Count existing appointments in this slot
    const existingResult = await db.query(
      `SELECT id FROM medical_appointments 
       WHERE provider_id = $1 AND appointment_date = $2 
       AND start_time = $3 AND status NOT IN ('cancelled')`,
      [providerId, appointmentDate, startTime]
    );
    
    if (existingResult.rows.length >= maxBookings) {
      return res.status(400).json({ success: false, error: 'This time slot is no longer available' });
    }
    
    // Get patient's law firm if any
    let finalLawFirmId = lawFirmId;
    if (!finalLawFirmId) {
      const lawFirmResult = await db.query(
        `SELECT law_firm_id FROM law_firm_clients WHERE client_id = $1`,
        [patientId]
      );
      if (lawFirmResult.rows.length > 0) {
        finalLawFirmId = lawFirmResult.rows[0].law_firm_id;
      }
    }
    
    const result = await db.query(
      `INSERT INTO medical_appointments 
       (patient_id, provider_id, law_firm_id, appointment_date, start_time, end_time, appointment_type, patient_notes, patient_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
       RETURNING *`,
      [patientId, providerId, finalLawFirmId, appointmentDate, startTime, endTime, appointmentType || 'consultation', patientNotes || null]
    );
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment booked successfully!' });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to create appointment' });
  }
});

// Get patient appointments
router.get('/patients/:patientId/appointments', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status } = req.query;
    
    if (!await verifyPatientOwnership(req, patientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own appointments' });
    }
    
    let query = `
      SELECT ma.*, mp.provider_name, mp.specialty, mp.phone_number as provider_phone
      FROM medical_appointments ma
      JOIN medical_providers mp ON ma.provider_id = mp.id
      WHERE ma.patient_id = $1
    `;
    const params = [patientId];
    
    if (status) {
      query += ` AND ma.status = $2`;
      params.push(status);
    }
    
    query += ` ORDER BY ma.appointment_date DESC, ma.start_time DESC`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

// Get provider appointments
router.get('/providers/:providerId/appointments', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { date, status } = req.query;
    
    if (!await verifyProviderOwnership(req, providerId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own appointments' });
    }
    
    let query = `
      SELECT ma.*, u.first_name as patient_first_name, u.last_name as patient_last_name, u.email as patient_email,
             lf.firm_name as law_firm_name
      FROM medical_appointments ma
      JOIN users u ON ma.patient_id = u.id
      LEFT JOIN law_firms lf ON ma.law_firm_id = lf.id
      WHERE ma.provider_id = $1
    `;
    const params = [providerId];
    let paramIndex = 2;
    
    if (date) {
      query += ` AND ma.appointment_date = $${paramIndex}`;
      params.push(date);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND ma.status = $${paramIndex}`;
      params.push(status);
    }
    
    query += ` ORDER BY ma.appointment_date, ma.start_time`;
    
    const result = await db.query(query, params);
    
    res.json({ success: true, appointments: result.rows });
  } catch (error) {
    console.error('Error fetching provider appointments:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch appointments' });
  }
});

// Get law firm client appointments
router.get('/law-firms/:lawFirmId/client-appointments', authenticateToken, async (req, res) => {
  try {
    const { lawFirmId } = req.params;
    const { clientId, status } = req.query;
    
    if (!await verifyLawFirmOwnership(req, lawFirmId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own client appointments' });
    }
    
    let query = `
      SELECT ma.*, 
             u.first_name as patient_first_name, u.last_name as patient_last_name,
             mp.provider_name, mp.specialty
      FROM medical_appointments ma
      JOIN users u ON ma.patient_id = u.id
      JOIN medical_providers mp ON ma.provider_id = mp.id
      WHERE ma.law_firm_id = $1
    `;
    const params = [lawFirmId];
    let paramIndex = 2;
    
    if (clientId) {
      query += ` AND ma.patient_id = $${paramIndex}`;
      params.push(clientId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND ma.status = $${paramIndex}`;
      params.push(status);
    }
    
    query += ` ORDER BY ma.appointment_date DESC, ma.start_time DESC`;
    
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
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this appointment' });
    }
    
    let updateField = userType === 'medical_provider' ? 'provider_confirmed' : 'patient_confirmed';
    
    await db.query(
      `UPDATE medical_appointments SET ${updateField} = true, updated_at = NOW() WHERE id = $1`,
      [appointmentId]
    );
    
    // Check if both confirmed, then update status
    const result = await db.query(
      `UPDATE medical_appointments 
       SET status = CASE WHEN patient_confirmed AND provider_confirmed THEN 'confirmed' ELSE status END,
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
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this appointment' });
    }
    
    let cancelledBy = 'patient';
    if (userType === 'medical_provider') cancelledBy = 'provider';
    if (userType === 'lawfirm') cancelledBy = 'law_firm';
    
    const result = await db.query(
      `UPDATE medical_appointments 
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
    const { providerNotes } = req.body;
    
    if (!await verifyAppointmentAccess(req, appointmentId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You do not have access to this appointment' });
    }
    
    const result = await db.query(
      `UPDATE medical_appointments 
       SET status = 'completed', provider_notes = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [appointmentId, providerNotes || null]
    );
    
    res.json({ success: true, appointment: result.rows[0], message: 'Appointment marked as completed' });
  } catch (error) {
    console.error('Error completing appointment:', error);
    res.status(500).json({ success: false, error: 'Failed to complete appointment' });
  }
});

// Get calendar settings
router.get('/providers/:providerId/calendar-settings', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    
    let result = await db.query(
      `SELECT * FROM calendar_sync_settings WHERE provider_id = $1`,
      [providerId]
    );
    
    if (result.rows.length === 0) {
      // Create default settings
      result = await db.query(
        `INSERT INTO calendar_sync_settings (provider_id) VALUES ($1) RETURNING *`,
        [providerId]
      );
    }
    
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching calendar settings:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar settings' });
  }
});

// Update calendar settings
router.patch('/providers/:providerId/calendar-settings', authenticateToken, async (req, res) => {
  try {
    const { providerId } = req.params;
    const { timezone, defaultSlotDuration, defaultBufferMinutes, advanceBookingDays, minimumNoticeHours, emailNotifications, smsNotifications, autoConfirmAppointments, allowMultiBooking, maxConcurrentBookings } = req.body;
    
    const result = await db.query(
      `UPDATE calendar_sync_settings 
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
       WHERE provider_id = $1
       RETURNING *`,
      [providerId, timezone, defaultSlotDuration, defaultBufferMinutes, advanceBookingDays, minimumNoticeHours, emailNotifications, smsNotifications, autoConfirmAppointments, allowMultiBooking, maxConcurrentBookings || 4]
    );
    
    res.json({ success: true, settings: result.rows[0] });
  } catch (error) {
    console.error('Error updating calendar settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update calendar settings' });
  }
});

// Get connected providers for patient booking
router.get('/patients/:patientId/connected-providers', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    
    if (!await verifyPatientOwnership(req, patientId)) {
      return res.status(403).json({ success: false, error: 'Unauthorized: You can only view your own providers' });
    }
    
    const result = await db.query(
      `SELECT mp.id, mp.provider_name, mp.specialty, mp.phone_number, mp.email
       FROM medical_providers mp
       INNER JOIN medical_provider_patients mpp ON mp.id = mpp.medical_provider_id
       WHERE mpp.patient_id = $1
       ORDER BY mp.provider_name`,
      [patientId]
    );
    
    res.json({ success: true, providers: result.rows });
  } catch (error) {
    console.error('Error fetching connected providers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch providers' });
  }
});

// Helper functions
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

function formatTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

module.exports = router;
