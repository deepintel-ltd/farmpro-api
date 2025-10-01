/*
  Warnings:

  - The `authProvider` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE', 'GITHUB');

-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "authProvider",
ADD COLUMN     "authProvider" "public"."AuthProvider" DEFAULT 'LOCAL';
