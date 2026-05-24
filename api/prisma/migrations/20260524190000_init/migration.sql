-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'FLOW_COMPLETED', 'PAYMENT_PENDING', 'PROOF_UPLOADED', 'PAID', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'RESCHEDULED', 'CANCELLED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROOF_UPLOADED', 'VERIFIED', 'REJECTED', 'REFUNDED');
CREATE TYPE "SessionStatus" AS ENUM ('OPEN', 'RISK', 'CONFIRMED', 'ALMOST_FULL', 'FULL', 'CLOSED', 'CANCELLED');
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');
CREATE TYPE "MessageChannel" AS ENUM ('WHATSAPP', 'SYSTEM');
CREATE TYPE "MessageStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'RECEIVED');

-- CreateTable
CREATE TABLE "Lead" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT NOT NULL,
  "whatsapp" TEXT,
  "email" TEXT,
  "instagram" TEXT,
  "source" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrainingSession" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "day" TEXT NOT NULL,
  "time" TEXT NOT NULL,
  "duration" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "location" TEXT NOT NULL,
  "priceKzt" INTEGER NOT NULL,
  "seatsTotal" INTEGER NOT NULL,
  "seatsMin" INTEGER NOT NULL DEFAULT 15,
  "status" "SessionStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrainingSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "status" "ApplicationStatus" NOT NULL DEFAULT 'PAYMENT_PENDING',
  "flowCompleted" BOOLEAN NOT NULL DEFAULT false,
  "readinessConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "conditionsConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "comment" TEXT,
  "nextStep" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Payment" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "amountKzt" INTEGER NOT NULL,
  "method" TEXT NOT NULL DEFAULT 'kaspi_transfer',
  "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "receiptUrl" TEXT,
  "receiptMime" TEXT,
  "receiptOriginalName" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "rejectedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsappMessage" (
  "id" TEXT NOT NULL,
  "leadId" TEXT,
  "applicationId" TEXT,
  "direction" "MessageDirection" NOT NULL,
  "channel" "MessageChannel" NOT NULL DEFAULT 'WHATSAPP',
  "waMessageId" TEXT,
  "templateName" TEXT,
  "body" TEXT,
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WhatsappMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Reminder" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  "status" "MessageStatus" NOT NULL DEFAULT 'QUEUED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actor" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT NOT NULL,
  "entityId" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_phone_key" ON "Lead"("phone");
CREATE UNIQUE INDEX "TrainingSession_publicId_key" ON "TrainingSession"("publicId");
CREATE INDEX "Application_leadId_idx" ON "Application"("leadId");
CREATE INDEX "Application_sessionId_idx" ON "Application"("sessionId");
CREATE INDEX "Application_status_idx" ON "Application"("status");
CREATE INDEX "Payment_applicationId_idx" ON "Payment"("applicationId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "WhatsappMessage_leadId_idx" ON "WhatsappMessage"("leadId");
CREATE INDEX "WhatsappMessage_applicationId_idx" ON "WhatsappMessage"("applicationId");
CREATE INDEX "WhatsappMessage_waMessageId_idx" ON "WhatsappMessage"("waMessageId");
CREATE INDEX "Reminder_applicationId_idx" ON "Reminder"("applicationId");
CREATE INDEX "Reminder_scheduledAt_idx" ON "Reminder"("scheduledAt");
CREATE INDEX "Reminder_status_idx" ON "Reminder"("status");
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WhatsappMessage" ADD CONSTRAINT "WhatsappMessage_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
