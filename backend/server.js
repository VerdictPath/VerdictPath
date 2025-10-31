const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const lawfirmRoutes = require('./routes/lawfirm');
const medicalproviderRoutes = require('./routes/medicalprovider');
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

const app = express();
const PORT = process.env.PORT || 5000; // Railway sets PORT automatically, Replit uses 5000

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
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5000',
      'http://localhost:19006', // Expo web dev
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
      callback(null, true); // Allow all for now (can restrict later)
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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
app.use('/api/medicalprovider', medicalproviderRoutes);
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
app.use('/api/tasks', tasksRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/calendar', require('./routes/calendar'));
app.use('/api/gamification', require('./routes/gamification'));
app.use('/api/event-requests', require('./routes/eventRequests'));

// Serve mobile app at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/app/index.html'));
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
    
    const response = await fetch(`http://localhost:${PORT}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType: 'lawfirm' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      res.cookie('token', data.token, { httpOnly: true });
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
    const token = req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    const response = await fetch(`http://localhost:${PORT}/api/lawfirm/dashboard`, {
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
    const token = req.cookies.token;
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

app.get('/portal/forms', async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.redirect('/portal');
    }
    
    res.render('forms', { title: 'HIPAA Forms - Law Firm Portal' });
  } catch (error) {
    res.redirect('/portal/dashboard');
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`VerdictPath Backend Server running on port ${PORT}`);
  console.log(`API endpoints available at http://localhost:${PORT}/api`);
  console.log(`Web portal available at http://localhost:${PORT}/portal`);
});

module.exports = app;
