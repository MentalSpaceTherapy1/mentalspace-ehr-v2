-- Module 3 Phase 2.2: Waitlist Automation Fields
-- Add new fields for priority scoring, matching tracking, and notifications

-- Add automation fields to waitlist_entries table
ALTER TABLE "waitlist_entries" ADD COLUMN "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.5;
ALTER TABLE "waitlist_entries" ADD COLUMN "preferredProviderId" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "insuranceId" TEXT;
ALTER TABLE "waitlist_entries" ADD COLUMN "maxWaitDays" INTEGER;

-- Matching tracking fields
ALTER TABLE "waitlist_entries" ADD COLUMN "lastOfferDate" TIMESTAMP(3);
ALTER TABLE "waitlist_entries" ADD COLUMN "offerCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "waitlist_entries" ADD COLUMN "declinedOffers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "waitlist_entries" ADD COLUMN "autoMatchEnabled" BOOLEAN NOT NULL DEFAULT true;

-- Notification tracking fields
ALTER TABLE "waitlist_entries" ADD COLUMN "notificationsSent" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "waitlist_entries" ADD COLUMN "lastNotification" TIMESTAMP(3);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "waitlist_entries_priorityScore_idx" ON "waitlist_entries"("priorityScore");
CREATE INDEX IF NOT EXISTS "waitlist_entries_autoMatchEnabled_idx" ON "waitlist_entries"("autoMatchEnabled");
CREATE INDEX IF NOT EXISTS "waitlist_entries_status_priorityScore_idx" ON "waitlist_entries"("status", "priorityScore");
