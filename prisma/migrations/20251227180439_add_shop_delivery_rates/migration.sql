-- CreateTable
CREATE TABLE "shop_delivery_rates" (
    "id" SERIAL NOT NULL,
    "shopkeeper_id" INTEGER NOT NULL,
    "delivery_rates" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_delivery_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_delivery_rates_shopkeeper_id_key" ON "shop_delivery_rates"("shopkeeper_id");

-- AddForeignKey
ALTER TABLE "shop_delivery_rates" ADD CONSTRAINT "shop_delivery_rates_shopkeeper_id_fkey" FOREIGN KEY ("shopkeeper_id") REFERENCES "shopkeepers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
