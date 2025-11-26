const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'VerdictPath2025!';

function adminAuth(req, res, next) {
  const token = req.signedCookies.adminToken || req.cookies.adminToken;
  if (!token) {
    return res.redirect('/portal/admin');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded.isAdmin) {
      return res.redirect('/portal/admin');
    }
    req.admin = decoded;
    next();
  } catch (error) {
    res.clearCookie('adminToken');
    return res.redirect('/portal/admin');
  }
}

router.get('/', (req, res) => {
  res.render('admin/login', { error: null });
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      const token = jwt.sign(
        { isAdmin: true, username: ADMIN_USERNAME },
        JWT_SECRET,
        { expiresIn: '8h' }
      );
      
      res.cookie('adminToken', token, { 
        httpOnly: true, 
        signed: true, 
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000
      });
      
      return res.redirect('/portal/admin/dashboard');
    }
    
    res.render('admin/login', { error: 'Invalid credentials' });
  } catch (error) {
    console.error('Admin login error:', error);
    res.render('admin/login', { error: 'Login failed' });
  }
});

router.get('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.redirect('/portal/admin');
});

router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users WHERE user_type = 'individual') as individuals,
        (SELECT COUNT(*) FROM law_firms) as law_firms,
        (SELECT COUNT(*) FROM medical_providers) as medical_providers,
        (SELECT COUNT(*) FROM law_firm_users WHERE is_active = true) as law_firm_users,
        (SELECT COUNT(*) FROM medical_provider_users WHERE is_active = true) as medical_provider_users,
        (SELECT COUNT(*) FROM users WHERE subscription_tier != 'free' AND subscription_tier IS NOT NULL) as active_subscriptions,
        (SELECT COALESCE(SUM(coins), 0) FROM users) as total_coins
    `);
    
    const stats = statsResult.rows[0];
    const totalUsers = parseInt(stats.individuals) + parseInt(stats.law_firms) + parseInt(stats.medical_providers);
    
    const recentUsersResult = await pool.query(`
      SELECT id, first_name as "firstName", last_name as "lastName", email, user_type as "userType", created_at as "createdAt"
      FROM users
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    const recentActivityResult = await pool.query(`
      (SELECT created_at, user_id, action_type, action_category as resource_type, ip_address, 
        (SELECT email FROM users WHERE id = law_firm_activity_logs.user_id LIMIT 1) as user_email,
        'lawfirm' as source
       FROM law_firm_activity_logs ORDER BY created_at DESC LIMIT 5)
      UNION ALL
      (SELECT created_at, user_id, action_type, action_category as resource_type, ip_address,
        (SELECT email FROM users WHERE id = medical_provider_activity_logs.user_id LIMIT 1) as user_email,
        'medicalprovider' as source
       FROM medical_provider_activity_logs ORDER BY created_at DESC LIMIT 5)
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    res.render('admin/dashboard', {
      stats: {
        totalUsers,
        individuals: stats.individuals,
        lawFirms: stats.law_firms,
        medicalProviders: stats.medical_providers,
        lawFirmUsers: stats.law_firm_users,
        medicalProviderUsers: stats.medical_provider_users,
        activeSubscriptions: stats.active_subscriptions,
        totalCoins: parseInt(stats.total_coins) || 0
      },
      recentUsers: recentUsersResult.rows,
      recentActivity: recentActivityResult.rows
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.redirect('/portal/admin');
  }
});

router.get('/users', adminAuth, async (req, res) => {
  try {
    const userType = req.query.type || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    
    let query, countQuery, params = [];
    let paramIndex = 1;
    
    if (userType === 'individual') {
      query = `
        SELECT id, first_name as "firstName", last_name as "lastName", email, 
               user_type as "userType", subscription_tier as "subscriptionTier",
               is_active as "isActive", created_at as "createdAt"
        FROM users 
        WHERE user_type = 'individual'
      `;
      countQuery = `SELECT COUNT(*) FROM users WHERE user_type = 'individual'`;
      
      if (searchQuery) {
        query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        countQuery += ` AND (first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1)`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
    } else if (userType === 'lawfirm') {
      query = `
        SELECT id, firm_name as "firmName", email, firm_code as "firmCode",
               'lawfirm' as "userType", subscription_tier as "subscriptionTier",
               is_active as "isActive", created_at as "createdAt"
        FROM law_firms
      `;
      countQuery = `SELECT COUNT(*) FROM law_firms`;
      
      if (searchQuery) {
        query += ` WHERE (firm_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        countQuery += ` WHERE (firm_name ILIKE $1 OR email ILIKE $1)`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
    } else if (userType === 'medicalprovider') {
      query = `
        SELECT id, provider_name as "providerName", email, provider_code as "providerCode",
               'medicalprovider' as "userType", subscription_tier as "subscriptionTier",
               is_active as "isActive", created_at as "createdAt"
        FROM medical_providers
      `;
      countQuery = `SELECT COUNT(*) FROM medical_providers`;
      
      if (searchQuery) {
        query += ` WHERE (provider_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
        countQuery += ` WHERE (provider_name ILIKE $1 OR email ILIKE $1)`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
      }
      
      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);
      
    } else {
      query = `
        (SELECT id, first_name as "firstName", last_name as "lastName", email, 
                user_type as "userType", subscription_tier as "subscriptionTier",
                is_active as "isActive", created_at as "createdAt", NULL as "firmCode", 
                NULL as "firmName", NULL as "providerCode", NULL as "providerName"
         FROM users WHERE user_type = 'individual')
        UNION ALL
        (SELECT id, NULL as "firstName", NULL as "lastName", email,
                'lawfirm' as "userType", subscription_tier as "subscriptionTier",
                is_active as "isActive", created_at as "createdAt", firm_code as "firmCode",
                firm_name as "firmName", NULL as "providerCode", NULL as "providerName"
         FROM law_firms)
        UNION ALL
        (SELECT id, NULL as "firstName", NULL as "lastName", email,
                'medicalprovider' as "userType", subscription_tier as "subscriptionTier",
                is_active as "isActive", created_at as "createdAt", NULL as "firmCode",
                NULL as "firmName", provider_code as "providerCode", provider_name as "providerName"
         FROM medical_providers)
        ORDER BY "createdAt" DESC
        LIMIT $1 OFFSET $2
      `;
      countQuery = `
        SELECT 
          (SELECT COUNT(*) FROM users WHERE user_type = 'individual') +
          (SELECT COUNT(*) FROM law_firms) +
          (SELECT COUNT(*) FROM medical_providers) as count
      `;
      params = [limit, offset];
    }
    
    const countParams = searchQuery ? [`%${searchQuery}%`] : [];
    const [usersResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    const total = userType === 'all' ? parseInt(countResult.rows[0].count) : parseInt(countResult.rows[0].count);
    
    res.render('admin/users', {
      users: usersResult.rows,
      userType,
      searchQuery,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin users error:', error);
    res.redirect('/portal/admin/dashboard');
  }
});

router.get('/user/:type/:id', adminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    let user, stats, subUsers, clients, activities;
    
    if (type === 'individual') {
      const userResult = await pool.query(`
        SELECT id, first_name as "firstName", last_name as "lastName", email, phone,
               user_type as "userType", subscription_tier as "subscriptionTier",
               coins, streak, is_active as "isActive", created_at as "createdAt",
               last_login as "lastLogin"
        FROM users WHERE id = $1
      `, [id]);
      
      if (userResult.rows.length === 0) {
        return res.redirect('/portal/admin/users');
      }
      
      user = userResult.rows[0];
      
      const activitiesResult = await pool.query(`
        SELECT action, resource_type, resource_id, created_at, ip_address
        FROM audit_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 20
      `, [id]);
      
      activities = activitiesResult.rows.map(a => ({
        action_type: a.action,
        resource_type: a.resource_type,
        created_at: a.created_at,
        ip_address: a.ip_address
      }));
      
    } else if (type === 'lawfirm') {
      const firmResult = await pool.query(`
        SELECT id, firm_name as "firmName", email, phone, firm_code as "firmCode",
               subscription_tier as "subscriptionTier", is_active as "isActive",
               created_at as "createdAt"
        FROM law_firms WHERE id = $1
      `, [id]);
      
      if (firmResult.rows.length === 0) {
        return res.redirect('/portal/admin/users?type=lawfirm');
      }
      
      user = firmResult.rows[0];
      
      const [statsResult, usersResult, clientsResult, activitiesResult] = await Promise.all([
        pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM law_firm_users WHERE law_firm_id = $1) as "userCount",
            (SELECT COUNT(*) FROM law_firm_clients WHERE law_firm_id = $1) as "clientCount"
        `, [id]),
        pool.query(`
          SELECT id, first_name as "firstName", last_name as "lastName", email, role,
                 is_active as "isActive", created_at as "createdAt"
          FROM law_firm_users WHERE law_firm_id = $1
          ORDER BY created_at DESC
        `, [id]),
        pool.query(`
          SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email,
                 u.is_active as "isActive", lfc.created_at as "connectedAt"
          FROM law_firm_clients lfc
          JOIN users u ON lfc.user_id = u.id
          WHERE lfc.law_firm_id = $1
          ORDER BY lfc.created_at DESC
          LIMIT 50
        `, [id]),
        pool.query(`
          SELECT action_type, action_category, ip_address, created_at
          FROM law_firm_activity_logs
          WHERE law_firm_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `, [id])
      ]);
      
      stats = statsResult.rows[0];
      subUsers = usersResult.rows;
      clients = clientsResult.rows;
      activities = activitiesResult.rows;
      
    } else if (type === 'medicalprovider') {
      const providerResult = await pool.query(`
        SELECT id, provider_name as "providerName", email, phone, provider_code as "providerCode",
               subscription_tier as "subscriptionTier", is_active as "isActive",
               created_at as "createdAt"
        FROM medical_providers WHERE id = $1
      `, [id]);
      
      if (providerResult.rows.length === 0) {
        return res.redirect('/portal/admin/users?type=medicalprovider');
      }
      
      user = providerResult.rows[0];
      
      const [statsResult, usersResult, patientsResult, activitiesResult] = await Promise.all([
        pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM medical_provider_users WHERE medical_provider_id = $1) as "userCount",
            (SELECT COUNT(*) FROM medical_provider_patients WHERE medical_provider_id = $1) as "patientCount"
        `, [id]),
        pool.query(`
          SELECT id, first_name as "firstName", last_name as "lastName", email, role,
                 is_active as "isActive", created_at as "createdAt"
          FROM medical_provider_users WHERE medical_provider_id = $1
          ORDER BY created_at DESC
        `, [id]),
        pool.query(`
          SELECT u.id, u.first_name as "firstName", u.last_name as "lastName", u.email,
                 u.is_active as "isActive", mpp.created_at as "connectedAt"
          FROM medical_provider_patients mpp
          JOIN users u ON mpp.user_id = u.id
          WHERE mpp.medical_provider_id = $1
          ORDER BY mpp.created_at DESC
          LIMIT 50
        `, [id]),
        pool.query(`
          SELECT action_type, action_category, ip_address, created_at
          FROM medical_provider_activity_logs
          WHERE medical_provider_id = $1
          ORDER BY created_at DESC
          LIMIT 20
        `, [id])
      ]);
      
      stats = statsResult.rows[0];
      subUsers = usersResult.rows;
      clients = patientsResult.rows;
      activities = activitiesResult.rows;
    }
    
    res.render('admin/user-detail', {
      user,
      userType: type,
      stats,
      subUsers: subUsers || [],
      clients: clients || [],
      activities: activities || []
    });
  } catch (error) {
    console.error('Admin user detail error:', error);
    res.redirect('/portal/admin/users');
  }
});

router.post('/user/:type/:id/toggle', adminAuth, async (req, res) => {
  try {
    const { type, id } = req.params;
    let table;
    
    if (type === 'individual') {
      table = 'users';
    } else if (type === 'lawfirm') {
      table = 'law_firms';
    } else if (type === 'medicalprovider') {
      table = 'medical_providers';
    } else {
      return res.redirect('/portal/admin/users');
    }
    
    await pool.query(`
      UPDATE ${table}
      SET is_active = NOT is_active,
          updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    res.redirect(`/portal/admin/user/${type}/${id}`);
  } catch (error) {
    console.error('Admin toggle user error:', error);
    res.redirect('/portal/admin/users');
  }
});

router.get('/activity', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const source = req.query.source || 'all';
    const actionFilter = req.query.action || 'all';
    
    let query, countQuery;
    let params = [];
    let whereConditions = [];
    let paramIndex = 1;
    
    if (source === 'lawfirm') {
      query = `
        SELECT l.created_at, l.action_type, l.action_category as resource_type, l.ip_address,
               u.email as user_email, 'lawfirm' as source
        FROM law_firm_activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
      `;
      countQuery = `SELECT COUNT(*) FROM law_firm_activity_logs`;
      
      if (actionFilter !== 'all') {
        whereConditions.push(`l.action_type = $${paramIndex}`);
        params.push(actionFilter);
        paramIndex++;
      }
      
    } else if (source === 'medicalprovider') {
      query = `
        SELECT l.created_at, l.action_type, l.action_category as resource_type, l.ip_address,
               u.email as user_email, 'medicalprovider' as source
        FROM medical_provider_activity_logs l
        LEFT JOIN users u ON l.user_id = u.id
      `;
      countQuery = `SELECT COUNT(*) FROM medical_provider_activity_logs`;
      
      if (actionFilter !== 'all') {
        whereConditions.push(`l.action_type = $${paramIndex}`);
        params.push(actionFilter);
        paramIndex++;
      }
      
    } else if (source === 'audit') {
      query = `
        SELECT a.created_at, a.action as action_type, a.resource_type, a.ip_address,
               u.email as user_email, 'audit' as source
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.id
      `;
      countQuery = `SELECT COUNT(*) FROM audit_logs`;
      
      if (actionFilter !== 'all') {
        whereConditions.push(`a.action = $${paramIndex}`);
        params.push(actionFilter);
        paramIndex++;
      }
      
    } else {
      query = `
        (SELECT l.created_at, l.action_type, l.action_category as resource_type, l.ip_address,
                u.email as user_email, 'lawfirm' as source
         FROM law_firm_activity_logs l
         LEFT JOIN users u ON l.user_id = u.id)
        UNION ALL
        (SELECT l.created_at, l.action_type, l.action_category as resource_type, l.ip_address,
                u.email as user_email, 'medicalprovider' as source
         FROM medical_provider_activity_logs l
         LEFT JOIN users u ON l.user_id = u.id)
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      countQuery = `
        SELECT (SELECT COUNT(*) FROM law_firm_activity_logs) + 
               (SELECT COUNT(*) FROM medical_provider_activity_logs) as count
      `;
      params = [limit, offset];
      
      const [activitiesResult, countResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery)
      ]);
      
      const total = parseInt(countResult.rows[0].count);
      
      return res.render('admin/activity', {
        activities: activitiesResult.rows,
        source,
        actionFilter,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
    
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
      countQuery += ` WHERE ${whereConditions.map((_, i) => whereConditions[i].replace(`$${i+1}`, `$${i+1}`)).join(' AND ')}`;
    }
    
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);
    
    const countParams = actionFilter !== 'all' ? [actionFilter] : [];
    const [activitiesResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    
    res.render('admin/activity', {
      activities: activitiesResult.rows,
      source,
      actionFilter,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin activity error:', error);
    res.redirect('/portal/admin/dashboard');
  }
});

router.get('/audit', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 50;
    const offset = (page - 1) * limit;
    const searchQuery = req.query.search || '';
    const actionFilter = req.query.action || 'all';
    
    let query = `
      SELECT a.id, a.created_at, a.action, a.resource_type, a.resource_id, 
             a.ip_address, a.details, u.email as user_email, u.user_type
      FROM audit_logs a
      LEFT JOIN users u ON a.user_id = u.id
    `;
    let countQuery = `SELECT COUNT(*) FROM audit_logs a LEFT JOIN users u ON a.user_id = u.id`;
    let params = [];
    let whereConditions = [];
    let paramIndex = 1;
    
    if (searchQuery) {
      whereConditions.push(`(u.email ILIKE $${paramIndex} OR a.action ILIKE $${paramIndex} OR a.resource_type ILIKE $${paramIndex})`);
      params.push(`%${searchQuery}%`);
      paramIndex++;
    }
    
    if (actionFilter !== 'all') {
      whereConditions.push(`a.action = $${paramIndex}`);
      params.push(actionFilter);
      paramIndex++;
    }
    
    if (whereConditions.length > 0) {
      const whereClause = ` WHERE ${whereConditions.join(' AND ')}`;
      query += whereClause;
      countQuery += whereClause;
    }
    
    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const countParams = [...params];
    params.push(limit, offset);
    
    const [auditResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ]);
    
    const total = parseInt(countResult.rows[0].count);
    
    res.render('admin/audit', {
      auditLogs: auditResult.rows,
      searchQuery,
      actionFilter,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Admin audit error:', error);
    res.redirect('/portal/admin/dashboard');
  }
});

module.exports = router;
