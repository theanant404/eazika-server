-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'shopkeeper', 'delivery_boy', 'admin');

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('grocery', 'electronics', 'furniture', 'clothing', 'bakery', 'hmoeAppliances', 'others');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "user_role" "Role" NOT NULL DEFAULT 'user',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "default_address_id" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "street" TEXT,
    "country" TEXT NOT NULL DEFAULT 'india',
    "state" TEXT NOT NULL DEFAULT 'maharashtra',
    "city" TEXT NOT NULL DEFAULT 'nagpur',
    "pin_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopkeepers" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "document_id" INTEGER NOT NULL,
    "bank_detail_id" INTEGER NOT NULL,
    "shop_name" TEXT NOT NULL,
    "shop_category" "ShopCategory" NOT NULL,
    "shop_images" TEXT[],
    "fssai_number" TEXT,
    "gst_number" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deactivated_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopkeepers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_boys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "aadhar_number" TEXT NOT NULL,
    "pan_number" TEXT,
    "license_number" TEXT NOT NULL,
    "license_images" TEXT[],
    "vehicle_owner_name" TEXT NOT NULL,
    "vehicle_name" TEXT,
    "vehicle_no" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_boys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_details" (
    "id" SERIAL NOT NULL,
    "account_holder_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "ifsc_code" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch_name" TEXT NOT NULL,
    "bank_passbook_image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopkeeper_documents" (
    "id" SERIAL NOT NULL,
    "aadhar_image" TEXT NOT NULL,
    "electricity_bill_image" TEXT NOT NULL,
    "business_certificate_image" TEXT NOT NULL,
    "pan_image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shopkeeper_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "shopkeepers_user_id_key" ON "shopkeepers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopkeepers_document_id_key" ON "shopkeepers"("document_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopkeepers_bank_detail_id_key" ON "shopkeepers"("bank_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "shopkeepers_fssai_number_key" ON "shopkeepers"("fssai_number");

-- CreateIndex
CREATE UNIQUE INDEX "shopkeepers_gst_number_key" ON "shopkeepers"("gst_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_boys_user_id_key" ON "delivery_boys"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_boys_aadhar_number_key" ON "delivery_boys"("aadhar_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_boys_pan_number_key" ON "delivery_boys"("pan_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_boys_license_number_key" ON "delivery_boys"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_boys_vehicle_no_key" ON "delivery_boys"("vehicle_no");

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopkeepers" ADD CONSTRAINT "shopkeepers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopkeepers" ADD CONSTRAINT "shopkeepers_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "shopkeeper_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shopkeepers" ADD CONSTRAINT "shopkeepers_bank_detail_id_fkey" FOREIGN KEY ("bank_detail_id") REFERENCES "bank_details"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_boys" ADD CONSTRAINT "delivery_boys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
