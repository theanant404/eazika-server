-- DropForeignKey
ALTER TABLE "shopkeepers" DROP CONSTRAINT "shopkeepers_bank_detail_id_fkey";

-- AlterTable
ALTER TABLE "shopkeepers" ALTER COLUMN "bank_detail_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "shopkeepers" ADD CONSTRAINT "shopkeepers_bank_detail_id_fkey" FOREIGN KEY ("bank_detail_id") REFERENCES "bank_details"("id") ON DELETE SET NULL ON UPDATE CASCADE;
