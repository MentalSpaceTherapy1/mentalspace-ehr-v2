-- AI Personal Assistant Models Migration
-- Created: January 6, 2026

-- Create enum for conversation topics (IF NOT EXISTS not supported for types, so we use DO block)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIConversationTopic') THEN
        CREATE TYPE "AIConversationTopic" AS ENUM ('CLINICAL', 'OPERATIONAL', 'REPORTING', 'GENERAL');
    END IF;
END$$;

-- Create enum for message roles
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIMessageRole') THEN
        CREATE TYPE "AIMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');
    END IF;
END$$;

-- Create AIConversation table
CREATE TABLE IF NOT EXISTS "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "topic" "AIConversationTopic" NOT NULL DEFAULT 'GENERAL',
    "clientId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "totalTokensUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- Create AIConversationMessage table
CREATE TABLE IF NOT EXISTS "ai_conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AIMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "modelUsed" TEXT,
    "confidence" DOUBLE PRECISION,
    "dataSourcesAccessed" JSONB,
    "isError" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_conversation_messages_pkey" PRIMARY KEY ("id")
);

-- Create AIDataAccessLog table (HIPAA compliance)
CREATE TABLE IF NOT EXISTS "ai_data_access_logs" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "userId" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "recordIds" TEXT[],
    "queryDescription" TEXT NOT NULL,
    "recordCount" INTEGER NOT NULL,
    "containsPHI" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_data_access_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for performance (IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_user" ON "ai_conversations"("userId");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_client" ON "ai_conversations"("clientId");
CREATE INDEX IF NOT EXISTS "idx_ai_conversations_created" ON "ai_conversations"("createdAt");
CREATE INDEX IF NOT EXISTS "idx_ai_messages_conversation" ON "ai_conversation_messages"("conversationId");
CREATE INDEX IF NOT EXISTS "idx_ai_data_access_user" ON "ai_data_access_logs"("userId");
CREATE INDEX IF NOT EXISTS "idx_ai_data_access_conversation" ON "ai_data_access_logs"("conversationId");

-- Add foreign key constraints (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_userId_fkey') THEN
        ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversations_clientId_fkey') THEN
        ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ai_conversation_messages_conversationId_fkey') THEN
        ALTER TABLE "ai_conversation_messages" ADD CONSTRAINT "ai_conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END$$;
