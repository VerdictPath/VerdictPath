const twilio = require('twilio');

let twilioClient = null;

/**
 * Redact phone number for HIPAA-compliant logging
 * Shows only last 4 digits to prevent PHI exposure in logs
 * @param {string} phoneNumber - Full phone number
 * @returns {string} - Redacted phone number like "****1234"
 */
function redactPhoneNumber(phoneNumber) {
  if (!phoneNumber || phoneNumber.length < 4) {
    return '****';
  }
  const lastFour = phoneNumber.slice(-4);
  return `****${lastFour}`;
}

/**
 * Sanitize Twilio error messages to remove PHI (phone numbers)
 * Twilio errors often include full phone numbers in error messages
 * @param {Error} error - Twilio error object
 * @returns {string} - Sanitized error message with phone numbers redacted
 */
function sanitizeTwilioError(error) {
  if (!error || !error.message) {
    return 'Unknown SMS error';
  }
  
  let sanitizedMessage = error.message;
  
  // Redact phone numbers in various formats
  // Matches: +1234567890, +1 234 567 8900, (234) 567-8900, 234-567-8900, etc.
  const phonePatterns = [
    /\+?1?\s*\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/g,  // US numbers
    /\+\d{1,3}\s*\d{3,14}/g,  // International numbers
    /\d{10,15}/g  // Generic number sequences
  ];
  
  phonePatterns.forEach(pattern => {
    sanitizedMessage = sanitizedMessage.replace(pattern, (match) => {
      // Keep last 4 digits if number is long enough
      if (match.length >= 4) {
        const digits = match.replace(/\D/g, '');
        return `****${digits.slice(-4)}`;
      }
      return '****';
    });
  });
  
  return sanitizedMessage;
}

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
    // Add timeout wrapper to prevent indefinite hanging
    const sendSMSPromise = twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('SMS send timeout after 10 seconds')), 10000)
    );
    
    const result = await Promise.race([sendSMSPromise, timeoutPromise]);
    
    console.log(`✅ Credential SMS sent to ${redactPhoneNumber(toPhoneNumber)}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send credential SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
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
    
    console.log(`✅ Password change SMS sent to ${redactPhoneNumber(toPhoneNumber)}`);
    return { success: true };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send password change SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
  }
}

async function sendNotificationSMS(toPhoneNumber, notificationType, title, body, priority = 'medium') {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient || !toPhoneNumber) {
    return { success: false, error: 'SMS service not configured or no phone number' };
  }
  
  const priorityEmoji = priority === 'urgent' ? '🚨' : priority === 'high' ? '⚡' : '📬';
  
  const message = `${priorityEmoji} Verdict Path

${title}

${body}

Reply STOP to unsubscribe from SMS notifications.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Notification SMS sent to ${redactPhoneNumber(toPhoneNumber)} (Type: ${notificationType}):`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send notification SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
  }
}

async function sendTaskReminderSMS(toPhoneNumber, taskTitle, dueDate, lawFirmName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient || !toPhoneNumber) {
    return { success: false };
  }
  
  const dueDateFormatted = new Date(dueDate).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  
  const message = `⏰ Verdict Path Task Reminder

Task: ${taskTitle}
Due: ${dueDateFormatted}
From: ${lawFirmName}

Don't forget to complete this task!

Reply STOP to unsubscribe.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Task reminder SMS sent to ${redactPhoneNumber(toPhoneNumber)}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send task reminder SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
  }
}

async function sendConnectionRequestSMS(toPhoneNumber, senderName, senderType) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient || !toPhoneNumber) {
    return { success: false };
  }
  
  const entityType = senderType === 'law_firm' ? 'Law Firm' : 'Medical Provider';
  
  const message = `🤝 Verdict Path Connection Request

${senderName} (${entityType}) wants to connect with you.

Open the Verdict Path app to review and respond to this request.

Reply STOP to unsubscribe.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Connection request SMS sent to ${redactPhoneNumber(toPhoneNumber)}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send connection request SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
  }
}

async function sendAccountCreationSMS(toPhoneNumber, firstName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient || !toPhoneNumber) {
    return { success: false, error: 'SMS service not configured or no phone number' };
  }
  
  const message = `🎉 Welcome to Verdict Path!

Hi ${firstName},

Your account has been successfully created. You're now ready to navigate your legal journey with confidence!

Log in to the Verdict Path app to get started.

Reply STOP to unsubscribe.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    console.log(`✅ Account creation SMS sent to ${redactPhoneNumber(toPhoneNumber)}:`, result.sid);
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    console.error(`❌ Failed to send account creation SMS to ${redactPhoneNumber(toPhoneNumber)}:`, sanitizedError);
    return { success: false, error: sanitizedError };
  }
}

module.exports = {
  sendCredentialSMS,
  sendPasswordChangeSMS,
  sendNotificationSMS,
  sendTaskReminderSMS,
  sendConnectionRequestSMS,
  sendAccountCreationSMS
};
