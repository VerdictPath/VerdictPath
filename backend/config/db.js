const { Pool } = require('pg');

// Database configuration optimized for Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  min: 0, // Minimum number of clients (0 allows pool to scale down)
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection cannot be established
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Don't exit process on pool errors in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(-1);
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};
