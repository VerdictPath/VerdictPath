#!/bin/bash
echo "========================================="
echo "Testing Firebase Real-time Database Sync"
echo "========================================="
echo ""

# Get user 25's notifications from PostgreSQL
echo "📊 PostgreSQL Notifications for User 25:"
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -c "
SELECT id, type, title, is_read, created_at 
FROM notifications 
WHERE recipient_id = 25 
ORDER BY created_at DESC 
LIMIT 5;"

echo ""
echo "📊 Unread Count from PostgreSQL:"
PGPASSWORD=$PGPASSWORD psql -h $PGHOST -U $PGUSER -d $PGDATABASE -t -c "
SELECT COUNT(*) 
FROM notifications 
WHERE recipient_id = 25 AND is_read = false;"

echo ""
echo "========================================="
echo "Creating a new test notification..."
echo "========================================="

curl -X POST "http://localhost:5000/api/notifications/send-to-client" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NSwiZW1haWwiOiJsYXdmaXJtQHRlc3QuY29tIiwidXNlclR5cGUiOiJsYXdmaXJtIiwibGF3RmlybUlkIjo1LCJsYXdGaXJtQ29kZSI6IlNNSVRIMjAyNSIsImlhdCI6MTc2MzkwNDk5NCwiZXhwIjoxNzY2NDk2OTk0fQ.1XJ-F87w-m4rbeBxCQv-ckNIIQGTR08R0lCMazDEP64" \
  -d '{
    "recipientId": 25,
    "type": "info",
    "title": "Firebase Sync Test",
    "message": "Testing real-time sync to Firebase",
    "actionType": "none"
  }'

echo ""
echo ""
echo "✅ Test notification created!"
echo "Check Firebase Console: https://console.firebase.google.com/project/verdict-path/database"
echo "Path: users/25/notifications"
