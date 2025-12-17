const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const securityHeaders = require('./middleware/securityHeaders');

const authRoutes = require('./routes/auth');
const lawfirmRoutes = require('./routes/lawfirm');
const lawfirmUsersRoutes = require('./routes/lawfirmUsers');
const activityLogRoutes = require('./routes/activityLogs');
const medicalproviderRoutes = require('./routes/medicalprovider');
const medicalProviderUserRoutes = require('./routes/medicalProviderUserRoutes');
const medicalActivityRoutes = require('./routes/medicalActivityRoutes');
const consentRoutes = require('./routes/consent');
const coinsRoutes = require('./routes/coins');
const uploadRoutes = require('./routes/uploads');
const formsRoutes = require('./routes/forms');
const litigationRoutes = require('./routes/litigation');
const invitesRoutes = require('./routes/invites');
const connectionsRoutes = require('./routes/connections');
const subscriptionRoutes = require('./routes/subscription');
const diagnosticRoutes = require('./routes/diagnostic');
const notificationsRoutes = require('./routes/notifications');
const tasksRoutes = require('./routes/tasks');
const paymentRoutes = require('./routes/payment');
const disbursementsRoutes = require('./routes/disbursements');
const settlementsRoutes = require('./routes/settlements');
const stripeConnectRoutes = require('./routes/stripe-connect');
const adminTempRoutes = require('./routes/admin-temp');
const negotiationsRoutes = require('./routes/negotiations');
const clientRelationshipsRoutes = require('./routes/client-relationships');
const avatarRoutes = require('./routes/avatarRoutes');
const notificationQueueRoutes = require('./routes/notification-queue');
const chatRoutes = require('./routes/chat');
const adminPortalRoutes = require('./routes/adminPortal');
const smsTestRoutes = require('./routes/smsTestRoutes');
const bankInfoRoutes = require('./routes/bankInfo');
const { startReminderScheduler } = require('./services/taskReminderService');
const { startCleanupScheduler } = require('./services/notificationCleanupService');
// Coin purchase routes merged into coins.js

const app = express();
const PORT = process.env.PORT || 3000; // Railway sets PORT automatically, Expo uses 5000 for webview

// Enable trust proxy for Railway/Replit deployments (fixes X-Forwarded-For header)
app.set('trust proxy', true);

// Get the base URL for the server (for self-referencing API calls)
const getBaseUrl = () => {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) {
    return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  }
  if (process.env.RAILWAY_STATIC_URL) {
    return process.env.RAILWAY_STATIC_URL;
  }
  return `http://localhost:${PORT}`;
};

const BASE_URL = getBaseUrl();

// CORS configuration - allow Railway domains and Replit
// SECURITY FIX: Reject unauthorized origins
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:19006', // Expo web dev
      'http://localhost:3000',  // Backend dev
      /\.railway\.app$/,
      /\.replit\.dev$/,
      /\.repl\.co$/
    ];
    
    const isAllowed = allowedOrigins.some(pattern => {
      if (pattern instanceof RegExp) {
        return pattern.test(origin);
      }
      return pattern === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // SECURITY: Reject unauthorized origins
      console.warn(`⚠️  CORS blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true
};

// SECURITY: Wrap cors() to return 403 for rejected origins instead of 500
const corsMiddleware = (req, res, next) => {
  cors(corsOptions)(req, res, err => {
    if (err) {
      console.warn(`⚠️  CORS rejected: ${req.headers.origin}`);
      return res.status(403).json({
        message: 'CORS policy: Origin not allowed',
        origin: req.headers.origin
      });
    }
    next();
  });
};

app.use(corsMiddleware);
app.use(securityHeaders);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Use cookieParser with secret for signed cookies (uses JWT_SECRET if COOKIE_SECRET not set)
const COOKIE_SECRET = process.env.COOKIE_SECRET || process.env.JWT_SECRET || 'verdict-path-cookie-secret';
app.use(cookieParser(COOKIE_SECRET));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory with cache control
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Serve Expo web app static files with strict no-cache for JS and HTML
app.use(express.static(path.join(__dirname, 'public/app'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// NOTE: Uploaded files are NOT served as static files for HIPAA compliance
// They must be accessed through authenticated API endpoints only

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      api: 'running',
      database: 'connected',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured'
    }
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/lawfirm', lawfirmRoutes);
app.use('/api/lawfirm/users', lawfirmUsersRoutes);
app.use('/api/lawfirm/activity', activityLogRoutes);
app.use('/api/medicalprovider', medicalproviderRoutes);
app.use('/api/medicalprovider/users', medicalProviderUserRoutes);
app.use('/api/medicalprovider/activity', medicalActivityRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/coins', coinsRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/litigation', litigationRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/diagnostic', diagnosticRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/notification-queue', notificationQueueRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/disbursements', disbursementsRoutes);
app.use('/api/bank-info', bankInfoRoutes);
app.use('/api/settlements', settlementsRoutes);
app.use('/api/stripe-connect', stripeConnectRoutes);
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/event-requests', require('./routes/eventRequests'));
app.use('/api/negotiations', negotiationsRoutes);
app.use('/api/client-relationships', clientRelationshipsRoutes);
app.use('/api/avatar', avatarRoutes);
app.use('/api/admin', adminTempRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/medical-calendar', require('./routes/medicalCalendar'));
app.use('/api/law-firm-calendar', require('./routes/lawFirmCalendar'));

// Admin Portal routes
app.use('/portal/admin', adminPortalRoutes);

// SMS Test routes (for testing all SMS services)
app.use('/api/sms-test', smsTestRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured',
    database: process.env.DATABASE_URL ? 'configured' : 'not configured',
    twilio: process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN ? 'configured' : 'not configured'
  });
});

// Serve mobile app at root
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public/app/index.html');
  // Check if static build exists
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    // Return API info if static build doesn't exist
    res.json({
      message: 'VerdictPath API Server',
      version: '1.0.0',
      endpoints: {
        api: '/api',
        portal: '/portal',
        health: '/health'
      }
    });
  }
});

app.get('/portal', (req, res) => {
  res.render('lawfirm-login', { 
    title: 'Law Firm Portal - VerdictPath',
    error: null 
  });
});

app.post('/portal/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType: 'lawfirm' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      res.cookie('token', data.token, { httpOnly: true, signed: true, sameSite: 'lax' });
      res.redirect('/portal/dashboard');
    } else {
      res.render('lawfirm-login', { 
        title: 'Law Firm Portal - VerdictPath',
        error: data.message 
      });
    }
  } catch (error) {
    res.render('lawfirm-login', { 
      title: 'Law Firm Portal - VerdictPath',
      error: 'Login failed. Please try again.' 
    });
  }
});

app.get('/portal/dashboard', async (req, res) => {
  try {
    const token = req.signedCookies.token || req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    const response = await fetch(`${BASE_URL}/api/lawfirm/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return res.redirect('/portal');
    }
    
    const data = await response.json();
    res.render('lawfirm-dashboard', data);
  } catch (error) {
    res.redirect('/portal');
  }
});

app.get('/portal/client/:clientId', async (req, res) => {
  try {
    const token = req.signedCookies.token || req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    const response = await fetch(`${BASE_URL}/api/lawfirm/client/${req.params.clientId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return res.redirect('/portal/dashboard');
    }
    
    const data = await response.json();
    res.render('client-details', data);
  } catch (error) {
    res.redirect('/portal/dashboard');
  }
});

app.get('/portal/settings', async (req, res) => {
  try {
    const token = req.signedCookies.token || req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    const response = await fetch(`${BASE_URL}/api/lawfirm/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return res.redirect('/portal');
    }
    
    const data = await response.json();
    res.render('settings', { 
      firmName: data.firmName, 
      firmCode: data.firmCode 
    });
  } catch (error) {
    res.redirect('/portal/dashboard');
  }
});

app.get('/portal/forms', async (req, res) => {
  try {
    const token = req.signedCookies.token || req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    res.render('forms', { title: 'HIPAA Forms - Law Firm Portal' });
  } catch (error) {
    res.redirect('/portal/dashboard');
  }
});

// Stripe Connect/Customer return pages
app.get('/stripe/complete', (req, res) => {
  const type = req.query.type || 'onboarding';
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Setup Complete - VerdictPath</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #D2B48C 0%, #8B4513 100%);
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #2d3748; margin: 0 0 16px; font-size: 24px; }
        p { color: #718096; margin: 0 0 24px; line-height: 1.6; }
        .btn {
          display: inline-block;
          background: #8B4513;
          color: white;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover { background: #654321; }
        .note { font-size: 14px; color: #a0aec0; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">✅</div>
        <h1>${type === 'billing' ? 'Payment Method Updated!' : 'Setup Complete!'}</h1>
        <p>
          ${type === 'billing' 
            ? 'Your payment information has been updated successfully.'
            : 'Your payment account has been set up successfully. You can now close this window and return to the app.'}
        </p>
        <a href="/" class="btn">Return to VerdictPath</a>
        <p class="note">
          You can close this window and return to the app.<br>
          Click "Refresh Status" to see your updated account.
        </p>
      </div>
    </body>
    </html>
  `);
});

app.get('/stripe/reauth', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Session Expired - VerdictPath</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          margin: 0;
          background: linear-gradient(135deg, #D2B48C 0%, #8B4513 100%);
        }
        .card {
          background: white;
          border-radius: 16px;
          padding: 40px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        .icon { font-size: 64px; margin-bottom: 20px; }
        h1 { color: #2d3748; margin: 0 0 16px; font-size: 24px; }
        p { color: #718096; margin: 0 0 24px; line-height: 1.6; }
        .btn {
          display: inline-block;
          background: #8B4513;
          color: white;
          padding: 14px 28px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 600;
          transition: background 0.2s;
        }
        .btn:hover { background: #654321; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="icon">⚠️</div>
        <h1>Session Expired</h1>
        <p>
          Your setup session has expired. Please return to the app and try again.
        </p>
        <a href="/" class="btn">Return to VerdictPath</a>
      </div>
    </body>
    </html>
  `);
});

// Catch-all route for client-side routing - serve index.html for any unmatched routes
// This must be AFTER all API and portal routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public/app/index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ 
      message: 'Web app not built yet. Run: npm run build:web',
      error: 'Static files not found'
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ ERROR:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VerdictPath Backend Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Web portal available at http://localhost:${PORT}/portal`);
  
  // Start task reminder scheduler
  startReminderScheduler();
  
  // Start notification cleanup scheduler (runs daily at midnight)
  startCleanupScheduler();
});

module.exports = app;
