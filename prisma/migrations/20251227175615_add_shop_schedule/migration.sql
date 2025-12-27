-- CreateTable
CREATE TABLE "shop_schedules" (
    "id" SERIAL NOT NULL,
    "shopkeeper_id" INTEGER NOT NULL,
    "is_online_delivery" BOOLEAN NOT NULL DEFAULT false,
    "weekly_slots" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shop_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "shop_schedules_shopkeeper_id_key" ON "shop_schedules"("shopkeeper_id");

-- AddForeignKey
ALTER TABLE "shop_schedules" ADD CONSTRAINT "shop_schedules_shopkeeper_id_fkey" FOREIGN KEY ("shopkeeper_id") REFERENCES "shopkeepers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
