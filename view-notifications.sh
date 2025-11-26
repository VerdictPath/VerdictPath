#!/bin/bash

# Quick script to view notifications in terminal
# Usage: ./view-notifications.sh

echo "📬 NOTIFICATIONS FOR USER ID 25 (testclient@example.com)"
echo "================================================================"

psql $DATABASE_URL -c "
SELECT 
  id,
  title,
  body,
  CASE 
    WHEN read_at IS NOT NULL THEN '✅ READ'
    ELSE '📬 UNREAD'
  END as read_status,
  CASE priority
    WHEN 'high' THEN '🔴 HIGH'
    WHEN 'medium' THEN '🟡 MEDIUM'
    ELSE '🟢 LOW'
  END as priority,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS') as time
FROM notifications
WHERE recipient_type = 'user' AND recipient_id = 25
ORDER BY created_at DESC
LIMIT 10;
"

echo ""
echo "================================================================"

# Count unread
UNREAD=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM notifications WHERE recipient_id = 25 AND recipient_type = 'user' AND read_at IS NULL;" | tr -d ' ')
echo "📊 Total Unread: $UNREAD"

echo ""
echo "💡 To create a test notification, run:"
echo "   ./create-test-notification.sh"
