/*
  Warnings:

  - The values [hmoeAppliances] on the enum `ShopCategory` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShopCategory_new" AS ENUM ('grocery', 'electronics', 'furniture', 'clothing', 'bakery', 'homeAppliances', 'others');
ALTER TABLE "shopkeepers" ALTER COLUMN "shop_category" TYPE "ShopCategory_new" USING ("shop_category"::text::"ShopCategory_new");
ALTER TYPE "ShopCategory" RENAME TO "ShopCategory_old";
ALTER TYPE "ShopCategory_new" RENAME TO "ShopCategory";
DROP TYPE "public"."ShopCategory_old";
COMMIT;
