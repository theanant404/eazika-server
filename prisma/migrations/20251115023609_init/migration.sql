-- CreateEnum
CREATE TYPE "Role" AS ENUM ('user', 'shopkeeper', 'delivery_boy', 'admin');

-- CreateEnum
CREATE TYPE "ShopCategory" AS ENUM ('grocery', 'electronics', 'furniture', 'clothing', 'bakery', 'hmoeAppliances', 'others');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash_on_delivery', 'online_payment');

-- CreateEnum
CREATE TYPE "CancelBy" AS ENUM ('user', 'shopkeeper', 'delivery_boy', 'admin');

-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('grams', 'kg', 'ml', 'litre', 'piece');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT,
    "image" TEXT,
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
    "shopkeeper_id" INTEGER NOT NULL,
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

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" SERIAL NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "discount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "weight" INTEGER NOT NULL,
    "unit" "ProductUnit" NOT NULL DEFAULT 'grams',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "globalProductId" INTEGER,
    "shopProductId" INTEGER,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "global_products" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "images" TEXT[],
    "product_pricing" INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "global_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_products" (
    "id" SERIAL NOT NULL,
    "shopkeeper_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "global_product_id" INTEGER,
    "is_global_product" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT,
    "description" TEXT,
    "images" TEXT[],
    "price_ids" INTEGER[],
    "stock" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "shop_product_id" INTEGER NOT NULL,
    "product_price_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "shop_product_id" INTEGER NOT NULL,
    "product_price_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "orderId" INTEGER,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "assigned_delivery_boy_id" INTEGER,
    "total_products" INTEGER NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "address_id" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "cancel_by" "CancelBy",
    "cancel_reason" TEXT,
    "order_status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_otp_histories" (
    "id" SERIAL NOT NULL,
    "phone" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "phone_otp_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_otp_histories" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "request_id" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "email_otp_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "global_products_category_id_key" ON "global_products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "shop_products_category_id_key" ON "shop_products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "phone_otp_histories_request_id_key" ON "phone_otp_histories"("request_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_otp_histories_request_id_key" ON "email_otp_histories"("request_id");

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

-- AddForeignKey
ALTER TABLE "delivery_boys" ADD CONSTRAINT "delivery_boys_shopkeeper_id_fkey" FOREIGN KEY ("shopkeeper_id") REFERENCES "shopkeepers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_globalProductId_fkey" FOREIGN KEY ("globalProductId") REFERENCES "global_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_shopProductId_fkey" FOREIGN KEY ("shopProductId") REFERENCES "shop_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "global_products" ADD CONSTRAINT "global_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_shopkeeper_id_fkey" FOREIGN KEY ("shopkeeper_id") REFERENCES "shopkeepers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_global_product_id_fkey" FOREIGN KEY ("global_product_id") REFERENCES "global_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_products" ADD CONSTRAINT "shop_products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_shop_product_id_fkey" FOREIGN KEY ("shop_product_id") REFERENCES "shop_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "ProductPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_shop_product_id_fkey" FOREIGN KEY ("shop_product_id") REFERENCES "shop_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_price_id_fkey" FOREIGN KEY ("product_price_id") REFERENCES "ProductPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_delivery_boy_id_fkey" FOREIGN KEY ("assigned_delivery_boy_id") REFERENCES "delivery_boys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
