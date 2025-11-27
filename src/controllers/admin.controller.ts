import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import redis from "@/config/redis.config";
import {
  globalProductSchema,
  globalProductsSchema,
} from "../validations/product.validation";

/* ################ Admin Users Controllers ################ */
const getAllUsers = asyncHandler(async (req, res) => {
  // write steps to get all users from the database with pagination
  // 1. get page and limit from query params
  // 2. fetch users from the database
  // 3. return users with pagination info

  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    }),
    prisma.user.count(),
  ]);

  const totalPages = Math.ceil(totalUsers / limit);

  res.status(200).json(
    new ApiResponse(200, "Users fetched successfully", {
      users,
      pagination: {
        totalUsers,
        totalPages,
        currentPage: page,
        pageSize: limit,
      },
    })
  );
});

/* ################ Products Controllers ################ */
const createProductCategory = asyncHandler(async (req, res) => {
  // write steps to add a product category to the database
  // 1. validate request body
  // 2. create product category in the database
  // 3. return success response

  const { name, description } = req.body;
  if (!name || name.length < 2 || name.length > 100) {
    throw new ApiError(
      400,
      "Product category name must be between 2 and 100 characters long"
    );
  }
  const createdCategory = await prisma.productCategory.create({
    data: {
      name,
      description,
    },
  });
  res.status(201).json(
    new ApiResponse(201, "Product category created successfully", {
      category: createdCategory,
    })
  );
});

const getAllProductCategories = asyncHandler(async (req, res) => {
  // write steps to get all product categories from the database
  // 1. fetch product categories from the database
  // 2. return product categories

  res.status(200).json(
    new ApiResponse(200, "Product categories fetched successfully", {
      categories: await prisma.productCategory.findMany(),
    })
  );
});

const createGlobalProduct = asyncHandler(async (req, res) => {
  // write steps to add a global product to the database
  // 1. validate request body
  // 2. create global product in the database
  // 3. return success response

  const validatedData = globalProductSchema.parse(req.body);

  const createdProduct = await prisma.globalProduct.create({
    data: {
      productCategoryId: validatedData.productCategoryId,
      name: validatedData.name,
      brand: validatedData.brand,
      description: validatedData.description,
      images: validatedData.images,
      prices: { createMany: { data: validatedData.pricing } },
    },
  });
  res.status(201).json(
    new ApiResponse(201, "Global product created successfully", {
      product: createdProduct,
    })
  );
});

const createGlobalProductsBulk = asyncHandler(async (req, res) => {
  // write steps to add multiple global products to the database
  // 1. validate request body
  // 2. create global products in the database
  // 3. return success response

  const validatedData = globalProductsSchema.parse(req.body.products);

  const createdProducts = await prisma.$transaction(
    validatedData.map((product) =>
      prisma.globalProduct.create({
        data: {
          productCategoryId: product.productCategoryId,
          name: product.name,
          brand: product.brand,
          description: product.description,
          images: product.images,
          prices: { createMany: { data: product.pricing } },
        },
      })
    )
  );
  // const createdProducts = await prisma.globalProduct.createMany({
  //   data: validatedData,
  // });

  res.status(201).json(
    new ApiResponse(201, "Global products created successfully", {
      products: createdProducts,
    })
  );
});

export {
  getAllUsers,
  createProductCategory,
  getAllProductCategories,
  createGlobalProduct,
  createGlobalProductsBulk,
};
