#!/bin/bash
set -e

echo "Starting MentalSpace EHR Backend"
echo "=================================="

# Run database migrations
echo ""
echo "Running database migrations..."
cd /app/packages/database

# Run migrations - allow it to fail if already applied
npx prisma migrate deploy || {
  EXIT_CODE=$?
  echo "Migration command exited with code $EXIT_CODE"
  # If migrations are already applied, Prisma returns 0
  # If there's a connection issue or other error, we still want to try starting the app
  # The app will fail on its own if DB is truly unavailable
  echo "Continuing with application startup..."
}

echo "Migrations check complete"

# Start the application
echo ""
echo "Starting application server..."
cd /app/packages/backend
exec node dist/index.js
