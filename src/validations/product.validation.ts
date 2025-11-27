import zod from "zod";

export const globalProductSchema = zod.object({
  productCategoryId: zod.number().int("Product category ID must be an integer"),
  name: zod
    .string()
    .min(2, "Product name must be at least 2 characters long")
    .max(200, "Product name must be at most 200 characters long"),
  brand: zod
    .string()
    .min(2, "Brand name must be at least 2 characters long")
    .max(100, "Brand name must be at most 100 characters long")
    .optional(),
  description: zod
    .string()
    .max(1000, "Description must be at most 1000 characters long")
    .optional(),
  images: zod
    .array(zod.string().url("Each product image must be a valid URL"))
    .min(1, "At least one product image is required"),
  pricing: zod
    .array(
      zod.object({
        price: zod.number().positive("Price must be a positive number"),
        discount: zod
          .number()
          .min(0, "Discount cannot be negative")
          .max(100, "Discount cannot exceed 100%"),
        weight: zod.number().positive("Weight must be a positive number"),
        stock: zod
          .number()
          .int("Stock must be an integer")
          .min(0, "Stock cannot be negative")
          .optional(),
        unit: zod
          .enum(["grams", "kg", "ml", "litre", "piece"])
          .default("grams"),
        globalProductId: zod.number().optional(),
        shopProductId: zod.number().optional(),
      })
    )
    .min(1, "At least one pricing option is required"),
});

export const globalProductsSchema = zod.array(globalProductSchema);

const sampleGlobalProducts = [
  {
    productCategoryId: 2,
    name: "Organic Brown Rice",
    brand: "24 Mantra",
    description: "Healthy whole-grain brown rice.",
    images: [
      "https://i.pinimg.com/1200x/9b/3f/57/9b3f57b110026778dabec1ae7b8dd0b2.jpg",
      "https://i.pinimg.com/736x/38/18/bb/3818bbaff85061b8a0c10bae56067a31.jpg",
    ],
    pricing: [
      {
        price: 165,
        discount: 5,
        weight: 1000,
        stock: 50,
        unit: "grams",
      },
    ],
  },
  {
    productCategoryId: 5,
    name: "Peri-Peri Nacho Chips",
    brand: "Cornitos",
    description: "Crispy spicy peri-peri flavored nachos.",
    images: [
      "https://i.pinimg.com/736x/38/18/bb/3818bbaff85061b8a0c10bae56067a31.jpg",
    ],
    pricing: [
      {
        price: 35,
        discount: 0,
        weight: 60,
        stock: 120,
        unit: "grams",
      },
      {
        price: 60,
        discount: 5,
        weight: 120,
        stock: 80,
        unit: "grams",
      },
    ],
  },
  {
    productCategoryId: 3,
    name: "Choco Chip Cookies",
    brand: "Dark Fantasy",
    description: "Loaded with rich chocolate chips.",
    images: [
      "https://i.pinimg.com/736x/a1/c6/90/a1c6905706d89909809ec40481aeb83c.jpg",
    ],
    pricing: [
      {
        price: 40,
        discount: 0,
        weight: 75,
        stock: 90,
        unit: "grams",
      },
    ],
  },

  {
    productCategoryId: 6,
    name: "Soft Light Moisturizer",
    brand: "Nivea",
    description: "Lightweight daily moisturizing cream.",
    images: [
      "https://i.pinimg.com/736x/13/8d/a2/138da221ba0939d99a6aa6d301f1140d.jpg",
    ],
    pricing: [
      {
        price: 120,
        discount: 5,
        weight: 100,
        stock: 60,
        unit: "grams",
      },
      {
        price: 220,
        discount: 10,
        weight: 200,
        stock: 40,
        unit: "grams",
      },
    ],
  },
];
