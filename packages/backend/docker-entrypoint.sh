#!/bin/bash
set -e

echo "Starting MentalSpace EHR Backend"
echo "=================================="

# Run database migrations
echo ""
echo "Running database migrations..."
cd /app/packages/database

# Check for failed migrations and resolve them
echo "Checking for failed migrations..."
FAILED_MIGRATIONS=$(npx prisma migrate status 2>&1 | grep -E "failed|Failed" || true)
if [ -n "$FAILED_MIGRATIONS" ]; then
  echo "Found failed migrations, attempting to resolve..."
  # Extract migration name and mark as rolled back
  MIGRATION_NAME=$(echo "$FAILED_MIGRATIONS" | grep -oP '\d{14}_\w+' | head -1 || true)
  if [ -n "$MIGRATION_NAME" ]; then
    echo "Rolling back failed migration: $MIGRATION_NAME"
    npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" || {
      echo "Could not resolve migration automatically, continuing..."
    }
  fi
fi

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
