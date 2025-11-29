/*
  Warnings:

  - You are about to drop the `notifications` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "DivicType" AS ENUM ('android', 'ios', 'tablet', 'mobile_web', 'desktop_web', 'tablet_web', 'other');

-- DropTable
DROP TABLE "notifications";

-- CreateTable
CREATE TABLE "push_notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "endPoint" TEXT NOT NULL,
    "user_device" TEXT NOT NULL,
    "device_type" "DivicType" NOT NULL DEFAULT 'other',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_notification_histories" (
    "id" SERIAL NOT NULL,
    "push_notification_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "data" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_notification_histories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_notification_histories" ADD CONSTRAINT "push_notification_histories_push_notification_id_fkey" FOREIGN KEY ("push_notification_id") REFERENCES "push_notifications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
