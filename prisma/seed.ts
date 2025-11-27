import { PrismaClient } from "../src/generated/prisma/client";
const prisma = new PrismaClient();
import { globalProductList as globalProducts } from "./globalProductList";

// const globalProduct = globalProducts[0];

async function main() {
  console.log("🌱 Starting Global Products seed...");
  console.log(`📦 Total products to create: ${globalProducts.length}`);

  //   const creatProduct = prisma.$transaction(async (tx) => {
  //     const category = await tx.productCategory.findUnique({
  //       where: { name: globalProduct.category || "other" },
  //       select: { id: true },
  //     });

  //     if (!category) throw new Error("Category not found");

  //     const pricing = await tx.productPrice.createManyAndReturn({
  //       data: globalProduct.pricing,
  //       select: { id: true },
  //     });
  //     if (pricing.length === 0)
  //       throw new Error("Failed to create pricing options");

  //     const createdProduct = await tx.globalProduct.create({
  //       data: {
  //         productCategoryId: category.id,
  //         brand: globalProduct.brand,
  //         name: globalProduct.name,
  //         description: globalProduct.description,
  //         images: globalProduct.images,
  //         priceIds: pricing.map((p) => p.id),
  //       },
  //     });

  //     return createdProduct;
  //   });

  const creatglobalProducts = prisma.$transaction(async (tx) => {
    let created = 0;
    const categories: Record<string, number> = {};

    for (const product of globalProducts) {
      const category = await tx.productCategory.findUnique({
        where: { name: product.category || "other" },
        select: { id: true },
      });

      if (!category) {
        console.warn(
          `⚠️  Skipping product "${product.name}": Category not found`
        );
        continue;
      }

      const pricing = await tx.productPrice.createManyAndReturn({
        data: product.pricing,
        select: { id: true },
      });
      if (pricing.length === 0) {
        console.warn(
          `⚠️  Skipping product "${product.name}": Failed to create pricing options`
        );
        continue;
      }

      await tx.globalProduct.create({
        data: {
          productCategoryId: category.id,
          brand: product.brand,
          name: product.name,
          description: product.description,
          images: product.images,
          priceIds: pricing.map((p) => p.id),
        },
      });

      created++;
      categories[product.category || "other"] =
        (categories[product.category || "other"] || 0) + 1;

      console.log(`✅ Created product: "${product.name}"`);
    }

    return { created, categories };
  });

  const result = await creatglobalProducts;
  console.log(`🌱 Seed completed: Created ${result.created} products.`);
  console.log("📊 Products created per category:");
  for (const [category, count] of Object.entries(result.categories)) {
    console.log(`   - ${category}: ${count}`);
  }
}

main()
  .catch((e) => console.error("❌ Seeding failed:", e))
  .finally(async () => await prisma.$disconnect());
