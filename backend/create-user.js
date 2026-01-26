require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    const email = 'abdullah@mailinator';
    const password = '12345678';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Check if user exists
    const checkResult = await db.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    
    if (checkResult.rows.length > 0) {
      // Update password
      await db.query(
        'UPDATE users SET password = $1 WHERE email = $2',
        [hashedPassword, email.toLowerCase()]
      );
      console.log('✅ User exists - Password updated');
      console.log('   User ID:', checkResult.rows[0].id);
    } else {
      // Get column names first
      const columnsResult = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        ORDER BY ordinal_position
      `);
      const columns = columnsResult.rows.map(r => r.column_name);
      console.log('Available columns:', columns.join(', '));
      
      // Create new user with minimal required fields
      const result = await db.query(
        `INSERT INTO users (first_name, last_name, email, password, user_type, subscription_tier)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, user_type`,
        ['Abdullah', 'User', email.toLowerCase(), hashedPassword, 'client', 'free']
      );
      console.log('✅ User created:', result.rows[0]);
    }
    
    console.log('\n📧 Login credentials for Postman:');
    console.log('   Email:', email);
    console.log('   Password:', password);
    console.log('   URL: http://localhost:5000/api/auth/login');
    console.log('\n✅ Ready to test!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createUser();
