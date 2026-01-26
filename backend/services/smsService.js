const twilio = require('twilio');

let twilioClient = null;
let twilioInitialized = false;

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

/**
 * Log SMS operation with detailed console output
 */
function logSmsOperation(operation, status, details) {
  const timestamp = new Date().toISOString();
  const statusEmoji = status === 'success' ? '✅' : status === 'failed' ? '❌' : '⚠️';
  const statusText = status === 'success' ? 'SUCCESS' : status === 'failed' ? 'FAILED' : 'WARNING';
  
  
  if (details.recipient) {
  }
  if (details.messageSid) {
  }
  if (details.error) {
  }
  if (details.twilioErrorCode) {
  }
  if (details.additionalInfo) {
  }
  
}

function initializeTwilio() {
  if (twilioInitialized) {
    return twilioClient;
  }
  
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    logSmsOperation('initialization', 'warning', {
      error: 'Twilio credentials not configured. SMS notifications will be disabled.',
      additionalInfo: 'Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables'
    });
    twilioInitialized = true;
    return null;
  }
  
  if (!process.env.TWILIO_PHONE_NUMBER) {
    logSmsOperation('initialization', 'warning', {
      error: 'Twilio phone number not configured.',
      additionalInfo: 'Set TWILIO_PHONE_NUMBER environment variable'
    });
    twilioInitialized = true;
    return null;
  }
  
  try {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    twilioInitialized = true;
    logSmsOperation('initialization', 'success', {
      additionalInfo: `From number: ${redactPhoneNumber(process.env.TWILIO_PHONE_NUMBER)}`
    });
    return twilioClient;
  } catch (error) {
    logSmsOperation('initialization', 'failed', {
      error: error.message
    });
    twilioInitialized = true;
    return null;
  }
}

async function sendCredentialSMS(toPhoneNumber, userData, temporaryPassword, userType) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('send_credentials', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured. Please configure Twilio credentials.'
    });
    return { 
      success: false, 
      error: 'SMS service not configured. Please configure Twilio credentials.' 
    };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('send_credentials', 'failed', {
      error: 'No phone number provided'
    });
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
    
    logSmsOperation('send_credentials', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `User: ${userData.firstName} ${userData.lastName}, Type: ${userType}`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('send_credentials', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code
    });
    return { success: false, error: sanitizedError };
  }
}

async function sendPasswordChangeSMS(toPhoneNumber, userName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('password_change', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured'
    });
    return { success: false, error: 'SMS service not configured' };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('password_change', 'failed', {
      error: 'No phone number provided'
    });
    return { success: false, error: 'No phone number provided' };
  }
  
  const message = `Verdict Path Security Alert

Hello ${userName},

Your password has been successfully changed.

If you did not make this change, contact your administrator immediately.`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    logSmsOperation('password_change', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `User: ${userName}`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('password_change', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code
    });
    return { success: false, error: sanitizedError };
  }
}

async function sendNotificationSMS(toPhoneNumber, notificationType, title, body, priority = 'medium') {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('notification', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured',
      additionalInfo: `Type: ${notificationType}, Priority: ${priority}`
    });
    return { success: false, error: 'SMS service not configured or no phone number' };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('notification', 'failed', {
      error: 'No phone number provided',
      additionalInfo: `Type: ${notificationType}, Priority: ${priority}`
    });
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
    
    logSmsOperation('notification', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `Type: ${notificationType}, Priority: ${priority}, Title: ${title.substring(0, 50)}...`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('notification', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code,
      additionalInfo: `Type: ${notificationType}, Priority: ${priority}`
    });
    return { success: false, error: sanitizedError };
  }
}

async function sendTaskReminderSMS(toPhoneNumber, taskTitle, dueDate, lawFirmName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('task_reminder', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured'
    });
    return { success: false, error: 'SMS service not configured' };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('task_reminder', 'failed', {
      error: 'No phone number provided',
      additionalInfo: `Task: ${taskTitle}`
    });
    return { success: false, error: 'No phone number provided' };
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
    
    logSmsOperation('task_reminder', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `Task: ${taskTitle}, Due: ${dueDateFormatted}, Firm: ${lawFirmName}`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('task_reminder', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code,
      additionalInfo: `Task: ${taskTitle}`
    });
    return { success: false, error: sanitizedError };
  }
}

async function sendConnectionRequestSMS(toPhoneNumber, senderName, senderType) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('connection_request', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured'
    });
    return { success: false, error: 'SMS service not configured' };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('connection_request', 'failed', {
      error: 'No phone number provided',
      additionalInfo: `Sender: ${senderName}, Type: ${senderType}`
    });
    return { success: false, error: 'No phone number provided' };
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
    
    logSmsOperation('connection_request', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `Sender: ${senderName}, Type: ${entityType}`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('connection_request', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code,
      additionalInfo: `Sender: ${senderName}, Type: ${senderType}`
    });
    return { success: false, error: sanitizedError };
  }
}

async function sendAccountCreationSMS(toPhoneNumber, firstName) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('account_creation', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured'
    });
    return { success: false, error: 'SMS service not configured or no phone number' };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('account_creation', 'failed', {
      error: 'No phone number provided',
      additionalInfo: `User: ${firstName}`
    });
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
    
    logSmsOperation('account_creation', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: `User: ${firstName}`
    });
    return { success: true, messageSid: result.sid };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('account_creation', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code,
      additionalInfo: `User: ${firstName}`
    });
    return { success: false, error: sanitizedError };
  }
}

/**
 * Test SMS service - send a test message to verify configuration
 * @param {string} toPhoneNumber - Phone number to send test to
 * @returns {Object} - Result with success status and details
 */
async function sendTestSMS(toPhoneNumber) {
  if (!twilioClient) {
    twilioClient = initializeTwilio();
  }
  
  if (!twilioClient) {
    logSmsOperation('test_sms', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: 'SMS service not configured. Check Twilio credentials.'
    });
    return { 
      success: false, 
      error: 'SMS service not configured. Check TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables.' 
    };
  }
  
  if (!toPhoneNumber) {
    logSmsOperation('test_sms', 'failed', {
      error: 'No phone number provided for test'
    });
    return { success: false, error: 'No phone number provided for test' };
  }
  
  const message = `🧪 Verdict Path SMS Test

This is a test message from Verdict Path to verify SMS functionality.

Timestamp: ${new Date().toISOString()}

If you received this message, SMS is working correctly!`;

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toPhoneNumber
    });
    
    logSmsOperation('test_sms', 'success', {
      recipient: redactPhoneNumber(toPhoneNumber),
      messageSid: result.sid,
      additionalInfo: 'Test SMS sent successfully - Twilio is configured correctly!'
    });
    return { 
      success: true, 
      messageSid: result.sid,
      message: 'Test SMS sent successfully!'
    };
  } catch (error) {
    const sanitizedError = sanitizeTwilioError(error);
    logSmsOperation('test_sms', 'failed', {
      recipient: redactPhoneNumber(toPhoneNumber),
      error: sanitizedError,
      twilioErrorCode: error.code
    });
    return { success: false, error: sanitizedError, errorCode: error.code };
  }
}

/**
 * Get SMS service status
 * @returns {Object} - Status of SMS service configuration
 */
function getSmsServiceStatus() {
  const hasAccountSid = !!process.env.TWILIO_ACCOUNT_SID;
  const hasAuthToken = !!process.env.TWILIO_AUTH_TOKEN;
  const hasPhoneNumber = !!process.env.TWILIO_PHONE_NUMBER;
  const isConfigured = hasAccountSid && hasAuthToken && hasPhoneNumber;
  const isInitialized = twilioInitialized && !!twilioClient;
  
  return {
    configured: isConfigured,
    initialized: isInitialized,
    credentials: {
      accountSid: hasAccountSid ? '✅ Set' : '❌ Missing',
      authToken: hasAuthToken ? '✅ Set' : '❌ Missing',
      phoneNumber: hasPhoneNumber ? `✅ ${redactPhoneNumber(process.env.TWILIO_PHONE_NUMBER)}` : '❌ Missing'
    },
    ready: isConfigured && isInitialized
  };
}

module.exports = {
  sendCredentialSMS,
  sendPasswordChangeSMS,
  sendNotificationSMS,
  sendTaskReminderSMS,
  sendConnectionRequestSMS,
  sendAccountCreationSMS,
  sendTestSMS,
  getSmsServiceStatus,
  initializeTwilio
};
