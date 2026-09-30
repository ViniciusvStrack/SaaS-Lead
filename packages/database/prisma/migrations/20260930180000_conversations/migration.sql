CREATE TABLE "Contact" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "externalContactId" TEXT NOT NULL,
  "displayName" TEXT, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Conversation" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "contactId" UUID NOT NULL,
  "numberId" UUID NOT NULL, "status" TEXT NOT NULL DEFAULT 'OPEN', "lastMessageBody" TEXT,
  "lastMessageAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Message" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "conversationId" UUID NOT NULL,
  "webhookEventId" UUID, "externalMessageId" TEXT NOT NULL, "direction" TEXT NOT NULL,
  "body" TEXT, "payload" JSONB, "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Contact_organizationId_externalContactId_key" ON "Contact"("organizationId", "externalContactId");
CREATE INDEX "Contact_organizationId_displayName_idx" ON "Contact"("organizationId", "displayName");
CREATE UNIQUE INDEX "Conversation_organizationId_numberId_contactId_key" ON "Conversation"("organizationId", "numberId", "contactId");
CREATE INDEX "Conversation_organizationId_lastMessageAt_idx" ON "Conversation"("organizationId", "lastMessageAt");
CREATE UNIQUE INDEX "Message_webhookEventId_key" ON "Message"("webhookEventId");
CREATE UNIQUE INDEX "Message_organizationId_externalMessageId_key" ON "Message"("organizationId", "externalMessageId");
CREATE INDEX "Message_organizationId_conversationId_occurredAt_idx" ON "Message"("organizationId", "conversationId", "occurredAt");
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_numberId_fkey" FOREIGN KEY ("numberId") REFERENCES "WhatsAppNumber"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Message" ADD CONSTRAINT "Message_webhookEventId_fkey" FOREIGN KEY ("webhookEventId") REFERENCES "WebhookEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
