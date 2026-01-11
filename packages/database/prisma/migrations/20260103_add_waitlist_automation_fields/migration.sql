-- Module 3 Phase 2.2: Waitlist Automation Fields
-- Add new fields for priority scoring, matching tracking, and notifications

-- Add automation fields to waitlist_entries table (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'priorityScore') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'preferredProviderId') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "preferredProviderId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'insuranceId') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "insuranceId" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'maxWaitDays') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "maxWaitDays" INTEGER;
  END IF;
END $$;

-- Matching tracking fields (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'lastOfferDate') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "lastOfferDate" TIMESTAMP(3);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'offerCount') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "offerCount" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'declinedOffers') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "declinedOffers" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'autoMatchEnabled') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "autoMatchEnabled" BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

-- Notification tracking fields (idempotent)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'notificationsSent') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "notificationsSent" INTEGER NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waitlist_entries' AND column_name = 'lastNotification') THEN
    ALTER TABLE "waitlist_entries" ADD COLUMN "lastNotification" TIMESTAMP(3);
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "waitlist_entries_priorityScore_idx" ON "waitlist_entries"("priorityScore");
CREATE INDEX IF NOT EXISTS "waitlist_entries_autoMatchEnabled_idx" ON "waitlist_entries"("autoMatchEnabled");
CREATE INDEX IF NOT EXISTS "waitlist_entries_status_priorityScore_idx" ON "waitlist_entries"("status", "priorityScore");
