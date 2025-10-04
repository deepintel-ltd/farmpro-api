#!/bin/bash

# Deploy script with migration fix for DigitalOcean
# This script handles the failed migration issue

set -e

echo "🚀 Starting deployment with migration fix..."

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
    echo "🔧 Production deployment detected - applying migration fix..."
    
    # Connect to production database and fix the migration
    echo "📊 Fixing failed migration in production database..."
    psql "$DATABASE_URL" -f scripts/fix-production-migration.sql
    
    echo "✅ Migration fix applied successfully"
else
    echo "🔧 Development environment - running normal migrations..."
    npx prisma migrate deploy
fi

# Start the application
echo "🚀 Starting FarmPro API..."
npm run start:prod
