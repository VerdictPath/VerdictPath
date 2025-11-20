const twilio = require('twilio');

let twilioClient = null;

function initializeTwilio() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('⚠️ Twilio credentials not configured. SMS notifications will be disabled.');
    return null;
  }
  
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio SMS service initialized');
    return twilioClient;
  } catch (error) {
    console.error('❌ Failed to initialize Twilio:', error);
    return null;
  }
}

async function sendCredentialSMS(toPhoneNumber, userData, temporaryPassword, userType) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    return { 
      success: false, 
      error: 'SMS service not configured. Please configure Twilio credentials.' 
    };
  }
  
  if (!toPhoneNumber) {
    return { 
      success: false, 
      error: 'No phone number provided' 
    };
  }
  
  const portalName = userType === 'lawfirm' ? 'Law Firm Portal' : 'Medical Provider Portal';
  const loginUrl = `${process.env.BASE_URL || 'http://localhost:5000'}/portal`;
  
  const message = `Verdict Path ${portalName}

Hello ${userData.firstName} ${userData.lastName},

Your account has been created:
Email: ${userData.email}
Temporary Password: ${temporaryPassword}

⚠️ This password expires in 72 hours. You must change it on first login.

Login: ${loginUrl}

Never share this password.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Credential SMS sent to ${toPhoneNumber}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    console.error(`❌ Failed to send credential SMS to ${toPhoneNumber}:`, error);
    return { success: false, error: error.message };
  }
}

async function sendPasswordChangeSMS(toPhoneNumber, userName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient || !toPhoneNumber) {
    return { success: false };
  }
  
  const message = `Verdict Path Security Alert

Hello ${userName},

Your password has been successfully changed.

If you did not make this change, contact your administrator immediately.`;

  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Password change SMS sent to ${toPhoneNumber}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Failed to send password change SMS to ${toPhoneNumber}:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  sendCredentialSMS,
  sendPasswordChangeSMS
};
