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
      console.log('❌ User NOT found in database');
      console.log('Email:', email);
    } else {
      console.log('✅ User found:');
      console.log(JSON.stringify(result.rows[0], null, 2));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUser();
