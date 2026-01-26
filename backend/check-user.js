require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./config/db');

async function checkUser() {
  try {
    const email = 'abdullah@mailinator';
    const result = await db.query(
      'SELECT id, email, user_type, first_name, last_name FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (result.rows.length === 0) {
    } else {
    }
    
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

checkUser();
