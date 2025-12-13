import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  globalProductSchema,
  globalProductsSchema,
} from "../validations/product.validation";

/* ################ Dashboard Stats ################ */
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalShops, totalOrders, pendingShops, totalRiders, activeRiders] = await prisma.$transaction([
    prisma.user.count(),
    prisma.shopkeeper.count(),
    prisma.order.count(),
    prisma.shopkeeper.count({ where: { isActive: false } }),
    prisma.deliveryBoy.count(),
    prisma.deliveryBoy.count({ where: { isAvailable: true } })
  ]);

  // Total Revenue
  const revenueAgg = await prisma.order.aggregate({
    _sum: { totalAmount: true },
    where: { status: 'delivered' }
  });

  // Top Cities by Orders (Approximate via Address GroupBy linked to Shopkeeper? No, Orders link to Address)
  // Since we can't do deep relation group by easily in Prisma without raw query, we will fetch top cities from Addresses used in orders.
  // Alternative: Group addresses by city and count. This counts *users* in cities or *orders*?
  // User wants "Cities analytics". Let's show "Orders per City".
  // We use $queryRaw for this aggregation.
  
  const cityStats: any[] = await prisma.$queryRaw`
    SELECT "a"."city", COUNT("o"."id") as "orderCount"
    FROM "orders" "o"
    JOIN "addresses" "a" ON "o"."addressId" = "a"."id"
    GROUP BY "a"."city"
    ORDER BY "orderCount" DESC
    LIMIT 5;
  `;

  // Serialize BigInt to Number for JSON response
  const sanitizedCityStats = cityStats.map((stat: any) => ({
      city: stat.city,
      orderCount: Number(stat.orderCount)
  }));


  res.status(200).json(new ApiResponse(200, "Stats fetched successfully", {
    totalUsers,
    totalShops,
    totalOrders,
    pendingShopApprovals: pendingShops,
    totalSales: revenueAgg._sum.totalAmount || 0,
    riders: {
        total: totalRiders,
        active: activeRiders
    },
    topCities: sanitizedCityStats,
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