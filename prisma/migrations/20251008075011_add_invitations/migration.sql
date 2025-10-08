-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "inviterEmail" TEXT NOT NULL,
    "inviterName" TEXT NOT NULL,
    "roleName" TEXT,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "public"."invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_tokenHash_key" ON "public"."invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "public"."invitations"("email");

-- CreateIndex
CREATE INDEX "invitations_organizationId_idx" ON "public"."invitations"("organizationId");

-- CreateIndex
CREATE INDEX "invitations_status_idx" ON "public"."invitations"("status");

-- CreateIndex
CREATE INDEX "invitations_expiresAt_idx" ON "public"."invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
