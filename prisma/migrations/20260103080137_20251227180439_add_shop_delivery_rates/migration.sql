-- AlterTable
ALTER TABLE "delivery_boys" ADD COLUMN     "avatar" TEXT DEFAULT '';

-- AlterTable
ALTER TABLE "shopkeepers" ALTER COLUMN "is_active" SET DEFAULT false;
