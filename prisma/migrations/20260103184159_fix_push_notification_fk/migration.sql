-- DropForeignKey
ALTER TABLE "push_notifications" DROP CONSTRAINT "push_notifications_id_fkey";

-- AddForeignKey
ALTER TABLE "push_notifications" ADD CONSTRAINT "push_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
