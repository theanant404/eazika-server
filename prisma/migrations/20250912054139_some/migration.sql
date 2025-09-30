/*
  Warnings:

  - You are about to drop the column `orderId` on the `ReturnRequest` table. All the data in the column will be lost.
  - Added the required column `orderItemId` to the `ReturnRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `ReturnRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ReturnStatus" ADD VALUE 'RECIEVED';

-- DropForeignKey
ALTER TABLE "ReturnRequest" DROP CONSTRAINT "ReturnRequest_orderId_fkey";

-- AlterTable
ALTER TABLE "ReturnRequest" DROP COLUMN "orderId",
ADD COLUMN     "orderItemId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AddForeignKey
ALTER TABLE "ReturnRequest" ADD CONSTRAINT "ReturnRequest_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
