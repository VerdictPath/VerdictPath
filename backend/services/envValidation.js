const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'ENCRYPTION_KEY'
];

const OPTIONAL_ENV_VARS = [
  { key: 'STRIPE_SECRET_KEY', feature: 'Stripe payments' },
  { key: 'FIREBASE_SERVICE_ACCOUNT_JSON', feature: 'Firebase push notifications' },
  { key: 'FIREBASE_DATABASE_URL', feature: 'Firebase real-time sync' },
  { key: 'TWILIO_ACCOUNT_SID', feature: 'SMS notifications' },
  { key: 'TWILIO_AUTH_TOKEN', feature: 'SMS notifications' },
  { key: 'TWILIO_PHONE_NUMBER', feature: 'SMS notifications' },
  { key: 'SMTP_USER', feature: 'Email notifications' },
  { key: 'SMTP_PASSWORD', feature: 'Email notifications' },
  { key: 'AWS_ACCESS_KEY_ID', feature: 'S3 document storage' },
  { key: 'AWS_SECRET_ACCESS_KEY', feature: 'S3 document storage' },
  { key: 'AWS_S3_BUCKET_NAME', feature: 'S3 document storage' },
  { key: 'AWS_REGION', feature: 'S3 document storage' }
];

function validateEnvironment() {
  const missing = [];
  const warnings = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ CRITICAL: Missing required environment variables:', missing.join(', '));
    console.error('   The server cannot start without these variables.');
    process.exit(1);
  }
  
  const disabledFeatures = [];
  for (const { key, feature } of OPTIONAL_ENV_VARS) {
    if (!process.env[key]) {
      if (!disabledFeatures.includes(feature)) {
        disabledFeatures.push(feature);
      }
    }
  }
  
  if (disabledFeatures.length > 0) {
    console.log('⚠️  Optional features disabled due to missing configuration:');
    disabledFeatures.forEach(feature => {
      console.log(`   - ${feature}`);
    });
  }
  
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    console.warn('⚠️  ENCRYPTION_KEY should be at least 32 characters for AES-256');
  }
  
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for security');
  }
  
  console.log('✅ Environment validation complete');
  return true;
}

module.exports = { validateEnvironment, REQUIRED_ENV_VARS, OPTIONAL_ENV_VARS };
