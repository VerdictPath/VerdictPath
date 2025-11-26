#!/bin/bash

# Create a test notification for user 25
# Usage: ./create-test-notification.sh

TIMESTAMP=$(date +"%H:%M:%S")

echo "📤 Creating test notification at $TIMESTAMP..."

psql $DATABASE_URL -c "
INSERT INTO notifications (
  sender_type, sender_id, sender_name,
  recipient_type, recipient_id,
  type, priority, title, body,
  status, sent_at, created_at
)
VALUES (
  'admin', 1, 'System Test',
  'user', 25,
  'general', 'high',
  '🚀 Terminal Test $TIMESTAMP',
  'This notification was created at $TIMESTAMP. If Firebase works, it should appear in your browser instantly without refresh!',
  'sent', NOW(), NOW()
);
"

echo "✅ Notification created!"
echo ""
echo "👀 Check your browser:"
echo "   • Should appear WITHOUT page refresh"
echo "   • Badge count should update instantly"
echo "   • Console should show: '🔔 FIREBASE CALLBACK: Notifications update received!'"
echo ""
echo "📬 View all notifications: ./view-notifications.sh"
