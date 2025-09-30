-- AlterTable
ALTER TABLE "ShopProduct" ADD COLUMN     "isReturnable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "returnPeriodDays" INTEGER NOT NULL DEFAULT 3;
