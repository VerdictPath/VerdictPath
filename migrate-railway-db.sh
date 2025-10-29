#!/bin/bash

echo "🚂 Railway Database Migration Script"
echo "====================================="
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
    echo "❌ ERROR: DATABASE_URL is required"
    echo ""
    echo "Usage:"
    echo "  ./migrate-railway-db.sh 'postgresql://user:pass@host:port/db'"
    echo ""
    echo "To get your DATABASE_URL:"
    echo "  1. Go to Railway dashboard (https://railway.app)"
    echo "  2. Click your project"
    echo "  3. Click PostgreSQL service"
    echo "  4. Click 'Variables' or 'Connect' tab"
    echo "  5. Copy DATABASE_PUBLIC_URL or DATABASE_URL"
    echo ""
    exit 1
fi

DATABASE_URL="$1"

echo "📊 Running database migration..."
echo ""

# Run the migration
if psql "$DATABASE_URL" -f backend/config/database.sql; then
    echo ""
    echo "✅ Migration completed successfully!"
    echo ""
    echo "📋 Verifying tables..."
    psql "$DATABASE_URL" -c "\dt"
    echo ""
    echo "🎉 All done! Your Railway database is ready."
else
    echo ""
    echo "❌ Migration failed. Check the error messages above."
    exit 1
fi
