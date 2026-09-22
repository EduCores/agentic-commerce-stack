-- Add MetaConnection for plug & play Meta Ads
CREATE TABLE IF NOT EXISTS "MetaConnection" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "adAccountId" TEXT NOT NULL,
  "accessToken" TEXT NOT NULL,
  "appId" TEXT,
  "appSecret" TEXT,
  "pixelId" TEXT,
  "businessId" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastSyncAt" TIMESTAMP(3),
  "lastSyncStatus" TEXT,
  "lastError" TEXT,
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MetaConnection_isActive_idx" ON "MetaConnection"("isActive");
