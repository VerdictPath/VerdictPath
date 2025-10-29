#!/bin/bash
# Test script to verify daily claim security
# This shows what the endpoint should return on repeated claims

echo "=== Daily Claim Security Test ==="
echo ""
echo "Instructions:"
echo "1. First, run the SQL in RAILWAY_DATABASE_FIX.sql on your Railway database"
echo "2. Then test with a valid user token"
echo ""
echo "Example test (replace YOUR_TOKEN with a real token):"
echo ""
echo "# First claim (should succeed):"
echo "curl -X POST https://verdictpath.up.railway.app/api/coins/claim-daily \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "# Second claim same day (should FAIL with 'already claimed' message):"
echo "curl -X POST https://verdictpath.up.railway.app/api/coins/claim-daily \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -H 'Authorization: Bearer YOUR_TOKEN'"
echo ""
echo "Expected second response:"
echo '{"message":"Daily reward already claimed today","alreadyClaimed":true,"currentStreak":1}'
