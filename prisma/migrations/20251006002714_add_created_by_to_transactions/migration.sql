-- AlterTable
ALTER TABLE "public"."transactions" ADD COLUMN     "createdById" TEXT;

-- AddForeignKey
ALTER TABLE "public"."transactions" ADD CONSTRAINT "transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
