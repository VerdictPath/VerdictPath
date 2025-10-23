const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRoutes = require('./routes/auth');
const lawfirmRoutes = require('./routes/lawfirm');
const consentRoutes = require('./routes/consent');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/lawfirm', lawfirmRoutes);
app.use('/api/consent', consentRoutes);

app.get('/', (req, res) => {
  res.json({ 
    message: 'VerdictPath Law Firm Portal API',
    version: '2.0.0',
    hipaa: {
      phase1: 'Encryption, Audit Logging, Account Security',
      phase2: 'RBAC, Patient Consent Management'
    },
    endpoints: {
      auth: '/api/auth',
      lawfirm: '/api/lawfirm',
      consent: '/api/consent'
    }
  });
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
    
    const response = await fetch('http://localhost:3000/api/auth/login', {
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
    
    const response = await fetch('http://localhost:3000/api/lawfirm/dashboard', {
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
    
    const response = await fetch(`http://localhost:3000/api/lawfirm/client/${req.params.clientId}`, {
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
