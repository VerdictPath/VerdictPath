const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middleware/auth');

exports.registerClient = async (req, res) => {
  try {
    const { firstName, lastName, email, password, lawFirmCode, avatarType, subscriptionTier, subscriptionPrice } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    
    let connectedLawFirmId = null;
    
    if (lawFirmCode) {
      const lawFirmResult = await db.query(
        'SELECT id FROM law_firms WHERE firm_code = $1',
        [lawFirmCode.toUpperCase()]
      );
      
      if (lawFirmResult.rows.length > 0) {
        connectedLawFirmId = lawFirmResult.rows[0].id;
      }
    }
    
    const userResult = await db.query(
      `INSERT INTO users (first_name, last_name, email, password, user_type, law_firm_code, 
       connected_law_firm_id, avatar_type, subscription_tier, subscription_price) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, email, first_name, last_name, user_type`,
      [firstName, lastName, email.toLowerCase(), hashedPassword, 'client', 
       lawFirmCode ? lawFirmCode.toUpperCase() : null, connectedLawFirmId, 
       avatarType || 'captain', subscriptionTier || 'free', subscriptionPrice || 0]
    );
    
    const user = userResult.rows[0];
    
    if (connectedLawFirmId) {
      await db.query(
        'INSERT INTO law_firm_clients (law_firm_id, client_id) VALUES ($1, $2)',
        [connectedLawFirmId, user.id]
      );
    }
    
    const token = jwt.sign(
      { id: user.id, email: user.email, userType: user.user_type },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        userType: user.user_type
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Error registering user', error: error.message });
  }
};

exports.registerLawFirm = async (req, res) => {
  try {
    const { firmName, firmCode, email, password, barNumber, phoneNumber, address } = req.body;
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      `INSERT INTO law_firms (firm_name, firm_code, email, password, bar_number, phone_number, 
       street, city, state, zip_code) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
       RETURNING id, firm_name, firm_code, email`,
      [firmName, firmCode.toUpperCase(), email.toLowerCase(), hashedPassword, barNumber || null, 
       phoneNumber || null, address?.street || null, address?.city || null, 
       address?.state || null, address?.zipCode || null]
    );
    
    const lawFirm = result.rows[0];
    
    const token = jwt.sign(
      { id: lawFirm.id, email: lawFirm.email, userType: 'lawfirm', firmCode: lawFirm.firm_code },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    res.status(201).json({
      message: 'Law firm registered successfully',
      token,
      lawFirm: {
        id: lawFirm.id,
        firmName: lawFirm.firm_name,
        firmCode: lawFirm.firm_code,
        email: lawFirm.email
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Firm code or email already exists' });
    }
    res.status(500).json({ message: 'Error registering law firm', error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password, userType } = req.body;
    
    let query, result;
    
    if (userType === 'lawfirm') {
      result = await db.query(
        'SELECT id, firm_name as name, email, password, firm_code FROM law_firms WHERE email = $1',
        [email.toLowerCase()]
      );
    } else {
      result = await db.query(
        'SELECT id, first_name, last_name, email, password, user_type FROM users WHERE email = $1',
        [email.toLowerCase()]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const account = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, account.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const tokenPayload = userType === 'lawfirm' 
      ? { id: account.id, email: account.email, userType: 'lawfirm', firmCode: account.firm_code }
      : { id: account.id, email: account.email, userType: account.user_type };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '30d' });
    
    if (userType !== 'lawfirm') {
      await db.query(
        'UPDATE users SET last_login_date = CURRENT_DATE WHERE id = $1',
        [account.id]
      );
    }
    
    const responseData = userType === 'lawfirm'
      ? {
          id: account.id,
          firmName: account.name,
          email: account.email,
          userType: 'lawfirm',
          firmCode: account.firm_code
        }
      : {
          id: account.id,
          firstName: account.first_name,
          lastName: account.last_name,
          email: account.email,
          userType: account.user_type
        };
    
    res.json({
      message: 'Login successful',
      token,
      user: responseData
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
};
