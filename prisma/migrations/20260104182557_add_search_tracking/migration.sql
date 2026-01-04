-- CreateTable
CREATE TABLE "search_trackings" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "search_query" TEXT NOT NULL,
    "location" TEXT,
    "results_count" INTEGER NOT NULL,
    "selected_product_id" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "search_trackings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "search_trackings" ADD CONSTRAINT "search_trackings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
