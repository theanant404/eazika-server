-- AlterTable
ALTER TABLE "Shop" ADD COLUMN     "isRejected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rejectReason" TEXT;
