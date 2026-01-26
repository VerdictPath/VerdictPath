const fetch = require('node-fetch');

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushNotification({ expoPushToken, title, body, data = {}, priority = 'default', sound = 'default', badge = null }) {
  if (!expoPushToken || !expoPushToken.startsWith('ExponentPushToken[')) {
    throw new Error('Invalid Expo Push Token');
  }

  const message = {
    to: expoPushToken,
    sound,
    title,
    body,
    data,
    priority,
    ...(badge !== null && { badge })
  };

  try {
    const response = await fetch(EXPO_PUSH_API_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`Expo Push API Error: ${JSON.stringify(result)}`);
    }

    return result;
  } catch (error) {
    throw error;
  }
}

async function sendBulkPushNotifications(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages must be a non-empty array');
  }

  const chunks = chunkArray(messages, 100);
  const results = [];

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_API_URL, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      const result = await response.json();
      results.push(...result.data);
    } catch (error) {
      throw error;
    }
  }

  return results;
}

function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

async function getPushNotificationReceipts(receiptIds) {
  if (!Array.isArray(receiptIds) || receiptIds.length === 0) {
    throw new Error('Receipt IDs must be a non-empty array');
  }

  try {
    const response = await fetch('https://exp.host/--/api/v2/push/getReceipts', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ids: receiptIds }),
    });

    const result = await response.json();
    return result.data;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  sendPushNotification,
  sendBulkPushNotifications,
  getPushNotificationReceipts
};
