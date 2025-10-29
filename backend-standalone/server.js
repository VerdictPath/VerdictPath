// This is a template server.js for Railway deployment
// Copy this to your backend-only repository and customize as needed

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

const app = express();

// Railway assigns PORT dynamically - MUST use process.env.PORT
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// CORS configuration - update for production
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// NOTE: Uploaded files are NOT served as static files for HIPAA compliance
// They must be accessed through authenticated API endpoints only

// API Routes
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

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Portal routes
app.get('/portal', (req, res) => {
  res.render('lawfirm-login', { 
    title: 'Law Firm Portal - VerdictPath',
    error: null 
  });
});

app.post('/portal/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Use BASE_URL instead of localhost for production compatibility
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, userType: 'lawfirm' })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      res.cookie('token', data.token, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });
      res.redirect('/portal/dashboard');
    } else {
      res.render('lawfirm-login', { 
        title: 'Law Firm Portal - VerdictPath',
        error: data.message 
      });
    }
  } catch (error) {
    console.error('Portal login error:', error);
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
    
    const response = await fetch(`${BASE_URL}/api/lawfirm/dashboard`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (!response.ok) {
      return res.redirect('/portal');
    }
    
    const data = await response.json();
    res.render('lawfirm-dashboard', data);
  } catch (error) {
    console.error('Portal dashboard error:', error);
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
    console.error('Client details error:', error);
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

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server - Railway requires 0.0.0.0 binding
app.listen(PORT, '0.0.0.0', () => {
  console.log(`VerdictPath Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API endpoints available at ${BASE_URL}/api`);
  console.log(`Web portal available at ${BASE_URL}/portal`);
});

module.exports = app;
