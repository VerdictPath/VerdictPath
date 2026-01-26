const express = require('express');
const router = express.Router();
const smsService = require('../services/smsService');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

router.get('/status', (req, res) => {
  const status = smsService.getSmsServiceStatus();
  res.json(status);
});

router.post('/test-all', async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  
  const results = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    tests: []
  };
  
  const runTest = async (name, testFn) => {
    results.totalTests++;
    
    try {
      const result = await testFn();
      if (result.success) {
        results.passed++;
        results.tests.push({ name, status: 'PASSED', messageSid: result.messageSid });
      } else {
        results.failed++;
        results.tests.push({ name, status: 'FAILED', error: result.error });
      }
      return result;
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'ERROR', error: error.message });
      return { success: false, error: error.message };
    }
  };
  
  await runTest('1. Account Creation (Individual Registration)', async () => {
    return await smsService.sendAccountCreationSMS(phoneNumber, 'TestUser');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('2. Law Firm User Credential SMS', async () => {
    return await smsService.sendCredentialSMS(
      phoneNumber,
      { firstName: 'John', lastName: 'Attorney', email: 'john@testfirm.com' },
      'TempPass123!',
      'lawfirm'
    );
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('3. Medical Provider User Credential SMS', async () => {
    return await smsService.sendCredentialSMS(
      phoneNumber,
      { firstName: 'Dr. Jane', lastName: 'Smith', email: 'jane@testclinic.com' },
      'SecureTemp456!',
      'medical_provider'
    );
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('4. Password Change Alert SMS', async () => {
    return await smsService.sendPasswordChangeSMS(phoneNumber, 'Test User');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('5. Task Reminder SMS', async () => {
    return await smsService.sendTaskReminderSMS(
      phoneNumber,
      'Complete Medical Records Review',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      'Anderson Law Group'
    );
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('6. Connection Request SMS (Law Firm)', async () => {
    return await smsService.sendConnectionRequestSMS(phoneNumber, 'Smith & Associates Law Firm', 'law_firm');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('7. Connection Request SMS (Medical Provider)', async () => {
    return await smsService.sendConnectionRequestSMS(phoneNumber, 'Downtown Medical Center', 'medical_provider');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('8. Urgent Notification SMS', async () => {
    return await smsService.sendNotificationSMS(
      phoneNumber,
      'urgent_alert',
      'Urgent: Case Update Required',
      'Your attorney has requested immediate action on your case. Please check the app for details.',
      'urgent'
    );
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('9. High Priority Notification SMS', async () => {
    return await smsService.sendNotificationSMS(
      phoneNumber,
      'task_assigned',
      'New Task Assigned',
      'You have a new task from Anderson Law Group. Due in 3 days.',
      'high'
    );
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await runTest('10. Chat Message Notification SMS', async () => {
    return await smsService.sendNotificationSMS(
      phoneNumber,
      'chat_message',
      'New Message from Your Attorney',
      'You have received an urgent message regarding your case.',
      'urgent'
    );
  });
  
  
  res.json(results);
});

router.post('/test-single/:type', async (req, res) => {
  const { phoneNumber } = req.body;
  const { type } = req.params;
  
  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  
  let result;
  
  switch (type) {
    case 'account-creation':
      result = await smsService.sendAccountCreationSMS(phoneNumber, 'TestUser');
      break;
    case 'lawfirm-credentials':
      result = await smsService.sendCredentialSMS(
        phoneNumber,
        { firstName: 'John', lastName: 'Attorney', email: 'john@testfirm.com' },
        'TempPass123!',
        'lawfirm'
      );
      break;
    case 'medical-credentials':
      result = await smsService.sendCredentialSMS(
        phoneNumber,
        { firstName: 'Dr. Jane', lastName: 'Smith', email: 'jane@testclinic.com' },
        'SecureTemp456!',
        'medical_provider'
      );
      break;
    case 'password-change':
      result = await smsService.sendPasswordChangeSMS(phoneNumber, 'Test User');
      break;
    case 'task-reminder':
      result = await smsService.sendTaskReminderSMS(
        phoneNumber,
        'Complete Medical Records Review',
        new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        'Anderson Law Group'
      );
      break;
    case 'connection-request-lawfirm':
      result = await smsService.sendConnectionRequestSMS(phoneNumber, 'Smith & Associates Law Firm', 'law_firm');
      break;
    case 'connection-request-medical':
      result = await smsService.sendConnectionRequestSMS(phoneNumber, 'Downtown Medical Center', 'medical_provider');
      break;
    case 'notification-urgent':
      result = await smsService.sendNotificationSMS(
        phoneNumber,
        'urgent_alert',
        'Urgent: Case Update Required',
        'Your attorney has requested immediate action on your case.',
        'urgent'
      );
      break;
    case 'notification-high':
      result = await smsService.sendNotificationSMS(
        phoneNumber,
        'task_assigned',
        'New Task Assigned',
        'You have a new task from Anderson Law Group.',
        'high'
      );
      break;
    case 'chat-message':
      result = await smsService.sendNotificationSMS(
        phoneNumber,
        'chat_message',
        'New Message from Your Attorney',
        'You have received an urgent message regarding your case.',
        'urgent'
      );
      break;
    default:
      result = await smsService.sendTestSMS(phoneNumber);
  }
  
  res.json(result);
});

module.exports = router;
