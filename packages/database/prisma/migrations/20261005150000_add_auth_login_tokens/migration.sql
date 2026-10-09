CREATE TABLE "AuthLoginToken" (
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthLoginToken_pkey" PRIMARY KEY ("tokenHash")
);

CREATE INDEX "AuthLoginToken_expiresAt_idx" ON "AuthLoginToken"("expiresAt");
CREATE INDEX "AuthLoginToken_userId_organizationId_createdAt_idx" ON "AuthLoginToken"("userId", "organizationId", "createdAt");
ALTER TABLE "AuthLoginToken" ADD CONSTRAINT "AuthLoginToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuthLoginToken" ADD CONSTRAINT "AuthLoginToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
