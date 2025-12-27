-- CreateTable
CREATE TABLE "shop_min_orders" (
    "id" SERIAL NOT NULL,
    "shopkeeper_id" INTEGER NOT NULL,
    "minimum_order_value" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_min_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_min_orders_shopkeeper_id_key" ON "shop_min_orders"("shopkeeper_id");

-- AddForeignKey
ALTER TABLE "shop_min_orders" ADD CONSTRAINT "shop_min_orders_shopkeeper_id_fkey" FOREIGN KEY ("shopkeeper_id") REFERENCES "shopkeepers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
