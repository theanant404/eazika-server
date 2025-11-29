/*
  Warnings:

  - Added the required column `phone` to the `push_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "push_notifications" ADD COLUMN     "phone" TEXT NOT NULL;
