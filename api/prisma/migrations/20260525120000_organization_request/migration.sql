-- CreateEnum
CREATE TYPE "OrgRequestStatus" AS ENUM ('NEW', 'CONTACTED', 'ASSIGNED', 'WON', 'LOST');

-- CreateTable
CREATE TABLE "OrganizationRequest" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "status" "OrgRequestStatus" NOT NULL DEFAULT 'NEW',
    "comment" TEXT,
    "sessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationRequest_status_idx" ON "OrganizationRequest"("status");

-- CreateIndex
CREATE INDEX "OrganizationRequest_sessionId_idx" ON "OrganizationRequest"("sessionId");

-- CreateIndex
CREATE INDEX "OrganizationRequest_createdAt_idx" ON "OrganizationRequest"("createdAt");

-- AddForeignKey
ALTER TABLE "OrganizationRequest" ADD CONSTRAINT "OrganizationRequest_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TrainingSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
