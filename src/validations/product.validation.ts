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

export const shopProductSchema = zod.object({
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

export const shopWithGlobalProductSchema = zod.object({
  productCategoryId: zod.number().int("Product category ID must be an integer"),
  globalProductId: zod.number().int("Global Product ID must be an integer"),
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
