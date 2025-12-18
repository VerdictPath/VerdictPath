const express = require('express');
const router = express.Router();
const { google } = require('googleapis');
const { Pool } = require('pg');
const crypto = require('crypto');
const { authenticateToken, isLawFirm, isMedicalProvider } = require('../middleware/auth');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const JWT_SECRET = process.env.JWT_SECRET;
const STATE_SECRET = JWT_SECRET || ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.warn('WARNING: ENCRYPTION_KEY not set - calendar sync encryption will be disabled');
}

if (!STATE_SECRET) {
  console.error('CRITICAL: Neither JWT_SECRET nor ENCRYPTION_KEY is set - OAuth state signing is disabled (SECURITY RISK)');
}

const IV_LENGTH = 16;

function createSignedState(data) {
  if (!STATE_SECRET) {
    throw new Error('State signing secret not configured');
  }
  const encoded = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto.createHmac('sha256', STATE_SECRET)
    .update(encoded)
    .digest('hex');
  return `${encoded}.${signature}`;
}

function verifySignedState(stateParam, maxAgeMs = 10 * 60 * 1000) {
  if (!STATE_SECRET || !stateParam) {
    return null;
  }
  
  try {
    const parts = stateParam.split('.');
    if (parts.length !== 2) {
      return null;
    }
    
    const [encoded, receivedSignature] = parts;
    
    const expectedSignature = crypto.createHmac('sha256', STATE_SECRET)
      .update(encoded)
      .digest('hex');
    
    const sigBuffer1 = Buffer.from(expectedSignature, 'hex');
    const sigBuffer2 = Buffer.from(receivedSignature, 'hex');
    
    if (sigBuffer1.length !== sigBuffer2.length) {
      return null;
    }
    
    if (!crypto.timingSafeEqual(sigBuffer1, sigBuffer2)) {
      console.warn('OAuth state signature verification failed - possible tampering attempt');
      return null;
    }
    
    const data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    
    const age = Date.now() - data.timestamp;
    if (age > maxAgeMs) {
      console.warn('OAuth state expired after', Math.round(age / 1000), 'seconds');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('State verification error:', error.message);
    return null;
  }
}

function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || `${process.env.API_BASE_URL || 'https://verdictpath.app'}/api/calendar-sync/google/callback`;

function createOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

async function verifyEntityOwnership(req, entityType, entityId) {
  const user = req.user;
  
  if (entityType === 'law_firm') {
    if (user.userType === 'lawfirm') {
      return user.id === parseInt(entityId) || user.lawFirmId === parseInt(entityId);
    }
    if (user.lawFirmUserId && user.lawFirmId) {
      return user.lawFirmId === parseInt(entityId);
    }
    return false;
  }
  
  if (entityType === 'medical_provider') {
    if (user.userType === 'medical_provider') {
      return user.id === parseInt(entityId) || user.medicalProviderId === parseInt(entityId);
    }
    if (user.medicalProviderUserId && user.medicalProviderId) {
      return user.medicalProviderId === parseInt(entityId);
    }
    return false;
  }
  
  return false;
}

router.get('/google/auth-url', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to manage this calendar.' });
    }
    
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.status(503).json({ 
        error: 'Google Calendar integration not configured',
        message: 'Please contact support to enable Google Calendar sync'
      });
    }
    
    const oauth2Client = createOAuth2Client();
    
    const stateData = { 
      entityType, 
      entityId: parseInt(entityId),
      userId: req.user.id,
      userType: req.user.userType,
      nonce: crypto.randomBytes(16).toString('hex'),
      timestamp: Date.now()
    };
    const state = createSignedState(stateData);
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar',
        'https://www.googleapis.com/auth/calendar.events'
      ],
      prompt: 'consent',
      state
    });
    
    res.json({ authUrl });
  } catch (error) {
    console.error('Error generating Google auth URL:', error);
    res.status(500).json({ error: 'Failed to generate authorization URL' });
  }
});

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.redirect('/calendar?error=missing_params');
    }
    
    const stateData = verifySignedState(state);
    
    if (!stateData) {
      console.warn('Calendar sync OAuth callback: Invalid or tampered state parameter rejected');
      return res.redirect('/calendar?error=invalid_state');
    }
    
    const { entityType, entityId, userId, userType } = stateData;
    
    if (!entityType || !entityId || !userId) {
      return res.redirect('/calendar?error=invalid_state');
    }
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.redirect('/calendar?error=invalid_entity_type');
    }
    
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    oauth2Client.setCredentials(tokens);
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarList = await calendar.calendarList.get({ calendarId: 'primary' });
    const primaryCalendarId = calendarList.data.id;
    
    await pool.query(`
      INSERT INTO calendar_sync_connections 
        (entity_type, entity_id, provider, calendar_id, access_token, refresh_token, token_expiry, is_active)
      VALUES ($1, $2, 'google', $3, $4, $5, $6, true)
      ON CONFLICT (entity_type, entity_id, provider) 
      DO UPDATE SET 
        calendar_id = $3,
        access_token = $4,
        refresh_token = COALESCE($5, calendar_sync_connections.refresh_token),
        token_expiry = $6,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    `, [
      entityType,
      entityId,
      primaryCalendarId,
      encrypt(tokens.access_token),
      encrypt(tokens.refresh_token),
      tokens.expiry_date ? new Date(tokens.expiry_date) : null
    ]);
    
    await pool.query(`
      INSERT INTO calendar_sync_log (connection_id, sync_type, direction, status)
      SELECT id, 'connection', 'initial', 'success'
      FROM calendar_sync_connections
      WHERE entity_type = $1 AND entity_id = $2 AND provider = 'google'
    `, [entityType, entityId]);
    
    const redirectPath = entityType === 'law_firm' ? '/law-firm/calendar' : '/medical-provider/calendar';
    res.redirect(`${redirectPath}?sync=google&status=success`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect('/calendar?error=oauth_failed');
  }
});

router.get('/status/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to view this calendar status.' });
    }
    
    const result = await pool.query(`
      SELECT id, provider, calendar_id, is_active, last_sync_at, sync_direction, created_at
      FROM calendar_sync_connections
      WHERE entity_type = $1 AND entity_id = $2
    `, [entityType, entityId]);
    
    const connections = result.rows.map(row => ({
      id: row.id,
      provider: row.provider,
      calendarId: row.calendar_id,
      isActive: row.is_active,
      lastSyncAt: row.last_sync_at,
      syncDirection: row.sync_direction,
      connectedAt: row.created_at
    }));
    
    res.json({ connections });
  } catch (error) {
    console.error('Error fetching sync status:', error);
    res.status(500).json({ error: 'Failed to fetch sync status' });
  }
});

router.post('/disconnect/:entityType/:entityId/:provider', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, provider } = req.params;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to disconnect this calendar.' });
    }
    
    const result = await pool.query(`
      UPDATE calendar_sync_connections
      SET is_active = false, access_token = NULL, refresh_token = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE entity_type = $1 AND entity_id = $2 AND provider = $3
      RETURNING id
    `, [entityType, entityId, provider]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    await pool.query(`
      INSERT INTO calendar_sync_log (connection_id, sync_type, direction, status)
      VALUES ($1, 'disconnection', 'manual', 'success')
    `, [result.rows[0].id]);
    
    res.json({ success: true, message: 'Calendar disconnected successfully' });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect calendar' });
  }
});

router.post('/reconnect/:entityType/:entityId/:provider', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, provider } = req.params;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to reconnect this calendar.' });
    }
    
    const result = await pool.query(`
      UPDATE calendar_sync_connections
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE entity_type = $1 AND entity_id = $2 AND provider = $3
      RETURNING id
    `, [entityType, entityId, provider]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Connection not found' });
    }
    
    res.json({ success: true, message: 'Calendar reconnected successfully' });
  } catch (error) {
    console.error('Error reconnecting calendar:', error);
    res.status(500).json({ error: 'Failed to reconnect calendar' });
  }
});

async function getValidOAuth2Client(connection) {
  const oauth2Client = createOAuth2Client();
  
  const accessToken = decrypt(connection.access_token);
  const refreshToken = decrypt(connection.refresh_token);
  
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: connection.token_expiry ? new Date(connection.token_expiry).getTime() : null
  });
  
  if (connection.token_expiry && new Date(connection.token_expiry) < new Date()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    await pool.query(`
      UPDATE calendar_sync_connections
      SET access_token = $1, token_expiry = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
    `, [
      encrypt(credentials.access_token),
      credentials.expiry_date ? new Date(credentials.expiry_date) : null,
      connection.id
    ]);
    
    oauth2Client.setCredentials(credentials);
  }
  
  return oauth2Client;
}

router.post('/sync/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { provider = 'google' } = req.body;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to sync this calendar.' });
    }
    
    const connResult = await pool.query(`
      SELECT * FROM calendar_sync_connections
      WHERE entity_type = $1 AND entity_id = $2 AND provider = $3 AND is_active = true
    `, [entityType, entityId, provider]);
    
    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active calendar connection found' });
    }
    
    const connection = connResult.rows[0];
    
    if (provider === 'google') {
      const oauth2Client = await getValidOAuth2Client(connection);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      const appointmentsTable = entityType === 'law_firm' ? 'law_firm_appointments' : 'medical_appointments';
      const idColumn = entityType === 'law_firm' ? 'law_firm_id' : 'medical_provider_id';
      
      const apptsResult = await pool.query(`
        SELECT id, title, description, appointment_date, start_time, end_time, location, status, external_calendar_id
        FROM ${appointmentsTable}
        WHERE ${idColumn} = $1 AND appointment_date >= CURRENT_DATE
        ORDER BY appointment_date, start_time
      `, [entityId]);
      
      let syncedCount = 0;
      
      for (const appt of apptsResult.rows) {
        const startDateTime = `${appt.appointment_date}T${appt.start_time}:00`;
        const endDateTime = `${appt.appointment_date}T${appt.end_time}:00`;
        
        const event = {
          summary: appt.title || 'Appointment',
          description: appt.description || '',
          location: appt.location || '',
          start: { dateTime: startDateTime, timeZone: 'America/New_York' },
          end: { dateTime: endDateTime, timeZone: 'America/New_York' },
        };
        
        try {
          if (appt.external_calendar_id) {
            await calendar.events.update({
              calendarId: 'primary',
              eventId: appt.external_calendar_id,
              requestBody: event
            });
          } else {
            const created = await calendar.events.insert({
              calendarId: 'primary',
              requestBody: event
            });
            
            await pool.query(`
              UPDATE ${appointmentsTable}
              SET external_calendar_id = $1
              WHERE id = $2
            `, [created.data.id, appt.id]);
          }
          syncedCount++;
        } catch (syncError) {
          console.error(`Error syncing appointment ${appt.id}:`, syncError.message);
        }
      }
      
      await pool.query(`
        UPDATE calendar_sync_connections
        SET last_sync_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [connection.id]);
      
      await pool.query(`
        INSERT INTO calendar_sync_log (connection_id, sync_type, direction, events_synced, status)
        VALUES ($1, 'manual', 'outbound', $2, 'success')
      `, [connection.id, syncedCount]);
      
      res.json({ 
        success: true, 
        message: `Synced ${syncedCount} appointments to Google Calendar`,
        syncedCount
      });
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error) {
    console.error('Error syncing calendar:', error);
    res.status(500).json({ error: 'Failed to sync calendar' });
  }
});

router.post('/import/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { provider = 'google', startDate, endDate } = req.body;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    if (!['google', 'apple'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to import to this calendar.' });
    }
    
    const connResult = await pool.query(`
      SELECT * FROM calendar_sync_connections
      WHERE entity_type = $1 AND entity_id = $2 AND provider = $3 AND is_active = true
    `, [entityType, entityId, provider]);
    
    if (connResult.rows.length === 0) {
      return res.status(404).json({ error: 'No active calendar connection found' });
    }
    
    const connection = connResult.rows[0];
    
    if (provider === 'google') {
      const oauth2Client = await getValidOAuth2Client(connection);
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      
      const timeMin = startDate ? new Date(startDate).toISOString() : new Date().toISOString();
      const timeMax = endDate ? new Date(endDate).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      
      const events = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });
      
      const importedEvents = events.data.items?.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        allDay: !!event.start?.date
      })) || [];
      
      res.json({ 
        success: true, 
        events: importedEvents,
        count: importedEvents.length
      });
    } else {
      res.status(400).json({ error: 'Unsupported provider' });
    }
  } catch (error) {
    console.error('Error importing from calendar:', error);
    res.status(500).json({ error: 'Failed to import from calendar' });
  }
});

router.post('/apple/connect', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId, appleId, appSpecificPassword, calendarUrl } = req.body;
    
    if (!entityType || !entityId) {
      return res.status(400).json({ error: 'entityType and entityId are required' });
    }
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to connect this calendar.' });
    }
    
    const caldavUrl = calendarUrl || 'https://caldav.icloud.com';
    
    await pool.query(`
      INSERT INTO calendar_sync_connections 
        (entity_type, entity_id, provider, calendar_id, access_token, refresh_token, is_active)
      VALUES ($1, $2, 'apple', $3, $4, $5, true)
      ON CONFLICT (entity_type, entity_id, provider) 
      DO UPDATE SET 
        calendar_id = $3,
        access_token = $4,
        refresh_token = $5,
        is_active = true,
        updated_at = CURRENT_TIMESTAMP
    `, [
      entityType,
      entityId,
      caldavUrl,
      encrypt(appleId),
      encrypt(appSpecificPassword)
    ]);
    
    res.json({ 
      success: true, 
      message: 'Apple Calendar connected. Note: Full CalDAV sync requires additional server configuration.'
    });
  } catch (error) {
    console.error('Error connecting Apple Calendar:', error);
    res.status(500).json({ error: 'Failed to connect Apple Calendar' });
  }
});

router.get('/logs/:entityType/:entityId', authenticateToken, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 20 } = req.query;
    
    if (!['law_firm', 'medical_provider'].includes(entityType)) {
      return res.status(400).json({ error: 'Invalid entityType' });
    }
    
    const isOwner = await verifyEntityOwnership(req, entityType, entityId);
    if (!isOwner) {
      return res.status(403).json({ error: 'Access denied. You do not have permission to view these logs.' });
    }
    
    const result = await pool.query(`
      SELECT l.*, c.provider
      FROM calendar_sync_log l
      JOIN calendar_sync_connections c ON l.connection_id = c.id
      WHERE c.entity_type = $1 AND c.entity_id = $2
      ORDER BY l.created_at DESC
      LIMIT $3
    `, [entityType, entityId, parseInt(limit)]);
    
    res.json({ logs: result.rows });
  } catch (error) {
    console.error('Error fetching sync logs:', error);
    res.status(500).json({ error: 'Failed to fetch sync logs' });
  }
});

module.exports = router;
