#!/bin/bash

# Verification script for Phase 1.4 database migration
# This script should be run from inside the ECS container

echo "=========================================="
echo "Phase 1.4 Migration Verification"
echo "=========================================="
echo ""

# Check migration status
echo "1. Checking Prisma migration status..."
npx prisma migrate status

echo ""
echo "2. Checking for signature tables..."

# Check signature_attestations table
ATTESTATION_COUNT=$(echo "SELECT COUNT(*) FROM signature_attestations;" | \
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "✓ signature_attestations table exists"
  echo "  Row count: $ATTESTATION_COUNT"

  if [ "$ATTESTATION_COUNT" -eq "4" ]; then
    echo "  ✓ Expected 4 attestations found!"
  else
    echo "  ⚠ Expected 4, found $ATTESTATION_COUNT"
  fi
else
  echo "✗ signature_attestations table not found"
fi

# Check signature_events table
EVENT_CHECK=$(echo "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'signature_events');" | \
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t 2>/dev/null)

if [ "$EVENT_CHECK" = " t" ]; then
  echo "✓ signature_events table exists"
else
  echo "✗ signature_events table not found"
fi

echo ""
echo "3. Checking user table columns..."

# Check for new columns
COLUMNS=$(echo "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name IN ('signaturePin', 'signaturePassword', 'signatureBiometric');" | \
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t 2>/dev/null)

if [ ! -z "$COLUMNS" ]; then
  echo "✓ User signature columns found:"
  echo "$COLUMNS"
else
  echo "✗ User signature columns not found"
fi

echo ""
echo "=========================================="
echo "Verification Complete"
echo "=========================================="
