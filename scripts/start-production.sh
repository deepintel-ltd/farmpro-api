#!/bin/sh
set -e

echo "🚀 Starting FarmPro API..."

# Wait for database to be ready (optional, useful for container orchestration)
if [ -n "$DATABASE_URL" ]; then
    echo "🔍 Checking database connectivity..."
    npx prisma db push --accept-data-loss --skip-generate || {
        echo "⚠️  Database push failed, continuing with migration..."
    }
fi

# Run database migrations
echo "📊 Running database migrations..."
npx prisma migrate deploy

# Generate Prisma client (ensure it's up to date)
echo "🔧 Generating Prisma client..."
# Fix permissions for Prisma client generation
chmod -R 755 /app/node_modules/.prisma/ 2>/dev/null || true
npx prisma generate

# Start the application
echo "🎯 Starting application..."
exec node dist/src/main.js
