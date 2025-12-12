import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  globalProductSchema,
  globalProductsSchema,
} from "../validations/product.validation";

/* ################ Dashboard Stats ################ */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalShops, totalOrders, pendingShops] = await prisma.$transaction([
    prisma.user.count(),
    prisma.shopkeeper.count(),
    prisma.order.count(),
    prisma.shopkeeper.count({ where: { isActive: false } }) 
  ]);

  // Calculate Total Revenue (Sum of all delivered orders)
  const revenueAgg = await prisma.order.aggregate({
    _sum: {
        totalAmount: true 
    },
    where: { status: 'delivered' }
  });

  res.status(200).json(new ApiResponse(200, "Stats fetched successfully", {
    totalUsers,
    totalShops,
    totalOrders,
    pendingShopApprovals: pendingShops,
    totalSales: revenueAgg._sum.totalAmount || 0,
    // Add mock trend data if you don't have historical data tables yet
    revenueTrend: [
        { name: 'Mon', value: 0 },
        { name: 'Tue', value: 0 },
        { name: 'Wed', value: 0 },
        { name: 'Thu', value: 0 },
        { name: 'Fri', value: 0 },
        { name: 'Sat', value: 0 },
        { name: 'Sun', value: 0 },
    ]
  }));
});

/* ################ Admin Users Controllers ################ */
const getAllUsers = asyncHandler(async (req, res) => {
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const skip = (page - 1) * limit;

  const [users, totalUsers] = await prisma.$transaction([
    prisma.user.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,      
        isActive: true,   
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

/* ################ Shop Management ################ */
const getAllShops = asyncHandler(async (req, res) => {
  const status = req.query.status as string; // 'pending' | 'active' | 'rejected' | 'all'

  const whereClause: any = {};
  if (status && status !== 'all') {
    if (status === 'active') {
        whereClause.isActive = true;
    } else if (status === 'pending' || status === 'rejected') {
        whereClause.isActive = false;
    }
  }

  const shops = await prisma.shopkeeper.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true, phone: true }
      }
    }
  });

  res.status(200).json(new ApiResponse(200, "Shops fetched successfully", shops));
});

const verifyShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { status } = req.body; // 'active' or 'rejected'

  if (!['active', 'rejected'].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'active' or 'rejected'");
  }

  const shop = await prisma.shopkeeper.update({
    where: { id: Number(shopId) },
    data: { 
        isActive: status === 'active'
    }
  });

  res.status(200).json(new ApiResponse(200, `Shop ${status} successfully`, shop));
});

/* ################ Products Controllers ################ */
const createProductCategory = asyncHandler(async (req, res) => {
  const { name, description } = req.body;
  if (!name || name.length < 2 || name.length > 100) {
    throw new ApiError(
      400,
      "Product category name must be between 2 and 100 characters long"
    );
  }
  const createdCategory = await prisma.productCategory.create({
    data: { name, description },
  });
  res.status(201).json(
    new ApiResponse(201, "Product category created successfully", {
      category: createdCategory,
    })
  );
});

const getAllProductCategories = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(200, "Product categories fetched successfully", {
      categories: await prisma.productCategory.findMany(),
    })
  );
});

const createGlobalProduct = asyncHandler(async (req, res) => {
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

  res.status(201).json(
    new ApiResponse(201, "Global products created successfully", {
      products: createdProducts,
    })
  );
});

export {
  getDashboardStats,
  getAllUsers,
  getAllShops,
  verifyShop,
  createProductCategory,
  getAllProductCategories,
  createGlobalProduct,
  createGlobalProductsBulk,
};