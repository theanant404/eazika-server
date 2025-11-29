/*
  Warnings:

  - You are about to drop the column `endPoint` on the `push_notifications` table. All the data in the column will be lost.
  - Added the required column `auth_key` to the `push_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `endpoint` to the `push_notifications` table without a default value. This is not possible if the table is not empty.
  - Added the required column `p256dh_key` to the `push_notifications` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "push_notifications" DROP COLUMN "endPoint",
ADD COLUMN     "auth_key" TEXT NOT NULL,
ADD COLUMN     "endpoint" TEXT NOT NULL,
ADD COLUMN     "expiration_time" TIMESTAMP(3),
ADD COLUMN     "p256dh_key" TEXT NOT NULL,
ALTER COLUMN "user_device" DROP NOT NULL;
