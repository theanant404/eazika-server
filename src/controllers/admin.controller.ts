import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  globalProductSchema,
  globalProductsSchema,
} from "../validations/product.validation";

/* ################ Shops Overview (Approved & Suspended) ################ */
const getShopsDetails = asyncHandler(async (req, res) => {
  // Fetch shops with status approved or suspended
  const shops = await prisma.shopkeeper.findMany({
    where: { status: { in: ["approved", "suspended"] } },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
      address: true,
    },
  });

  // Build stats per shop
  const enriched = await Promise.all(
    shops.map(async (shop) => {
      const orderWhere = {
        orderItems: { some: { product: { shopkeeperId: shop.id } } },
      } as const;

      const [
        totalOrders,
        activeOrders,
        deliveredAgg,
        deliveredOrders,
        customers,
      ] = await prisma.$transaction([
        prisma.order.count({ where: orderWhere }),
        prisma.order.count({
          where: {
            ...orderWhere,
            status: { notIn: ["delivered", "cancelled"] },
          },
        }),
        prisma.order.aggregate({
          where: { ...orderWhere, status: "delivered" },
          _sum: { totalAmount: true },
        }),
        prisma.order.count({ where: { ...orderWhere, status: "delivered" } }),
        prisma.order.findMany({
          where: orderWhere,
          distinct: ["userId"],
          select: { userId: true },
        }),
      ]);

      const address = shop.address;
      const location = address
        ? `${address.line1}, ${address.city}, ${address.state}, ${address.pinCode}`
        : "";

      return {
        id: shop.id,
        name: shop.shopName,
        category: shop.shopCategory,
        image: shop.shopImage?.[0] || null,
        status: shop.status,
        isActive: shop.isActive,
        location,
        contact: {
          ownerName: shop.user.name,
          phone: shop.user.phone,
          email: shop.user.email,
        },
        metrics: {
          totalOrders,
          totalActiveOrders: activeOrders,
          totalDeliveredOrders: deliveredOrders,
          totalEarnings: deliveredAgg._sum.totalAmount || 0,
          totalCustomers: customers.length,
        },
      };
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, "Approved and suspended shops fetched", enriched));
});

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

  // Top Cities by Orders
  const cityStats: any[] = await prisma.$queryRaw`
    SELECT "a"."city", COUNT("o"."id") as "orderCount"
    FROM "orders" "o"
    JOIN "addresses" "a" ON "o"."address_id" = "a"."id"
    GROUP BY "a"."city"
    ORDER BY "orderCount" DESC
    LIMIT 5;
  `;

  // Serialize BigInt to Number for JSON response
  const sanitizedCityStats = cityStats.map((stat: any) => ({
    city: stat.city,
    orderCount: Number(stat.orderCount)
  }));


  // Revenue & Order Trend (This Week)
  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)
  const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Adjust to get Monday
  const startOfWeek = new Date(now.setDate(diff));
  startOfWeek.setHours(0, 0, 0, 0);

  const weeklyOrders = await prisma.order.findMany({
    where: {
      createdAt: { gte: startOfWeek },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      status: true
    }
  });

  const revenueMap: Record<string, number> = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };

  const ordersMap: Record<string, number> = {
    'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0
  };

  weeklyOrders.forEach(order => {
    const dayName = order.createdAt.toLocaleDateString('en-US', { weekday: 'short' });
    if (revenueMap[dayName] !== undefined && order.status === 'delivered') { // Only count revenue for delivered
      revenueMap[dayName] += order.totalAmount;
    }
    if (ordersMap[dayName] !== undefined) {
      ordersMap[dayName] += 1;
    }
  });

  const revenueTrend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    name: day,
    value: revenueMap[day]
  }));

  const ordersTrend = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
    name: day,
    value: ordersMap[day]
  }));

  // Order Status Distribution
  const orderStatusGroups = await prisma.order.groupBy({
    by: ['status'],
    _count: {
      id: true
    }
  });

  const orderStatusDistribution = orderStatusGroups.map(group => ({
    name: group.status,
    value: group._count.id
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
    revenueTrend,
    ordersTrend,
    orderStatusDistribution
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

  const formattedShops = shops.map(shop => ({
    ...shop,
    status: shop.isActive ? 'active' : 'pending' // Simple mapping for now
  }));

  res.status(200).json(new ApiResponse(200, "Shops fetched successfully", formattedShops));
});

const getShopsPendingVerification = asyncHandler(async (req, res) => {
  const filterStatus = req.query.status as string; // optional filter:'all', 'pending', 'rejected'
  // console.log("Filter Status:", filterStatus);
  const shops = await prisma.shopkeeper.findMany({
    where: { status: filterStatus && filterStatus !== 'all' ? filterStatus : undefined },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true, image: true, createdAt: true, updatedAt: true, role: true }
      },
      document: true, // All KYC documents
      address: true, // Full address info
      bankDetail: true, // Bank details if present
      schedule: true, // Shop schedule if present
      minOrder: true, // Minimum order value if present
      deliveryRate: true, // Delivery rates if present
    }
  });

  // Optionally, format the response to group all info clearly
  const formattedShops = shops.map(shop => ({
    id: shop.id,
    shopName: shop.shopName,
    shopCategory: shop.shopCategory,
    shopImages: shop.shopImage,
    fssaiNumber: shop.fssaiNumber,
    gstNumber: shop.gstNumber,
    isActive: shop.isActive,
    status: shop.status,
    createdAt: shop.createdAt,
    updatedAt: shop.updatedAt,
    user: shop.user,
    address: shop.address,
    document: shop.document,
    bankDetail: shop.bankDetail,
    schedule: shop.schedule,
    minOrder: shop.minOrder,
    deliveryRate: shop.deliveryRate,
  }));

  return res.status(200).json(new ApiResponse(200, "Pending shops fetched", formattedShops));
});
const verifyShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected', 'suspended'].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'active' or 'rejected'");
  }

  const shop = await prisma.shopkeeper.update({
    where: { id: Number(shopId) },
    data: {
      isActive: status === 'approved' ? true : false,
      status: status
    }
  });

  res.status(200).json(new ApiResponse(200, `Shop ${status} successfully`, shop));
});

const toggleShopStatus = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'

  if (!['approved', 'rejected', 'suspended'].includes(status)) {
    throw new ApiError(400, "Invalid status. Must be 'active' or 'rejected'");
  }
  const shop = await prisma.shopkeeper.update({
    where: { id: Number(shopId) },
    data: {
      isActive: status === 'approved' ? true : false,
      status: status
    }
  });

  res.status(200).json(new ApiResponse(200, `Shop ${status} successfully`, shop));
});


const getAllShopAddresses = asyncHandler(async (req, res) => {
  const shops = await prisma.shopkeeper.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      address: {
        select: {
          id: true,
          name: true,
          phone: true,
          line1: true,
          line2: true,
          street: true,
          city: true,
          state: true,
          pinCode: true,
          country: true,
          geoLocation: true,
        },
      },
    },
  });

  const formattedShops = shops.map(shop => ({
    shopId: shop.id,
    shopName: shop.shopName,
    shopCategory: shop.shopCategory,
    isActive: shop.isActive,
    address: shop.address ? {
      id: shop.address.id,
      name: shop.address.name,
      phone: shop.address.phone,
      line1: shop.address.line1,
      line2: shop.address.line2,
      street: shop.address.street,
      city: shop.address.city,
      state: shop.address.state,
      pinCode: shop.address.pinCode,
      country: shop.address.country,
      geoLocation: shop.address.geoLocation ?? null,
      fullAddress: `${shop.address.line1}, ${shop.address.city}, ${shop.address.state}, ${shop.address.pinCode}`,
    } : null,
  }));

  res.status(200).json(
    new ApiResponse(200, "Shop addresses fetched successfully", formattedShops)
  );
});

/* ################ Riders Management ################ */
const getAllRiders = asyncHandler(async (req, res) => {
  const riders = await prisma.deliveryBoy.findMany({
    include: {
      user: { select: { name: true, phone: true, email: true } },
      _count: {
        select: { orders: { where: { status: 'delivered' } } }
      }
    }
  });

  const formattedRiders = riders.map(rider => ({
    ...rider,
    name: rider.user.name,
    phone: rider.user.phone,
    email: rider.user.email,
    status: rider.isAvailable ? 'available' : 'busy',
    totalDeliveries: rider._count.orders,
    rating: 4.8 // Mock rating as it is not in schema yet
  }));

  res.status(200).json(new ApiResponse(200, "Riders fetched successfully", formattedRiders));
});



/* ################ Orders Management ################ */
const getAllOrders = asyncHandler(async (req, res) => {
  const orders = await prisma.order.findMany({
    include: {
      user: { select: { name: true } },
      orderItems: { // Access shop via OrderItem -> ShopProduct -> Shopkeeper -> User (Shop Name)
        include: {
          product: {
            include: {
              shopkeeper: {
                include: {
                  user: { select: { name: true } } // shop owner name
                }
              }
            }
          }
        },

      },
      deliveryBoy: {
        include: {
          user: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const formattedOrders = orders.map(order => {
    // Extract shop name from first item's product
    const shopName = order.orderItems[0]?.product?.shopkeeper?.shopName || "Unknown Shop";

    return {
      id: `#ORD-${order.id}`,
      customer: order.user.name,
      shop: shopName,
      rider: order.deliveryBoy?.user.name || null,
      amount: `₹${order.totalAmount}`,
      status: order.status,
      date: order.createdAt.toLocaleDateString(),
      rawDate: order.createdAt,
      items: order.orderItems.map(item => ({
        name: item.product.name,
        qty: item.quantity,
        price: `₹${item.price}`
      }))
    };
  });

  res.status(200).json(new ApiResponse(200, "Orders fetched successfully", formattedOrders));
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
      isActive: validatedData.isActive,
      // prices: { createMany: { data: validatedData.pricing } },
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
          // prices: { createMany: { data: product.pricing } },
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
  getShopsDetails,
  getAllShopAddresses,
  verifyShop,
  toggleShopStatus,
  getAllRiders,
  getAllOrders,
  createProductCategory,
  getAllProductCategories,
  createGlobalProduct,
  createGlobalProductsBulk,
  getLiveMapData,
  getAllGlobalProducts,
  getAllShopProducts,
  getGlobalProductById,
  updateGlobalProduct,
  toggleGlobalProductStatus,
  toggleShopProductStatus,
  updateProductCategory,
  getShopsPendingVerification
};

/* ################ Product Management ################ */

const getAllGlobalProducts = asyncHandler(async (req, res) => {
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || "";

  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        productCategories: true,
      },
    }),
    prisma.globalProduct.count({ where: whereClause }),
  ]);
  // console.log(products)
  res.status(200).json(
    new ApiResponse(200, "Global products fetched successfully", {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

const getAllShopProducts = asyncHandler(async (req, res) => {
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const skip = (page - 1) * limit;
  const search = (req.query.search as string) || "";

  const whereClause: any = {};
  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { contains: search, mode: "insensitive" } },
      { shopkeeper: { shopName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [products, total] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        shopkeeper: {
          select: {
            shopName: true,
            user: { select: { name: true, phone: true } },
          },
        },
        productCategories: true,
        prices: true,
      },
    }),
    prisma.shopProduct.count({ where: whereClause }),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Shop products fetched successfully", {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

const getGlobalProductById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const product = await prisma.globalProduct.findUnique({
    where: { id: Number(id) },
    include: {
      productCategories: true,
      productPrices: true,
    },
  });

  if (!product) {
    throw new ApiError(404, "Global product not found");
  }

  res.status(200).json(new ApiResponse(200, "Product fetched successfully", product));
});

const updateGlobalProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, brand, description, images, productCategoryId, isActive } = req.body;

  const product = await prisma.globalProduct.update({
    where: { id: Number(id) },
    data: {
      name,
      brand,
      description,
      images,
      productCategoryId,
      isActive,
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, "Global product updated successfully", product));
});

const toggleGlobalProductStatus = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { isActive } = req.body;
  console.log(productId)
  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  const product = await prisma.globalProduct.update({
    where: { id: Number(productId) },
    data: { isActive },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      `Global product ${isActive ? "activated" : "deactivated"} successfully`,
      product
    )
  );
});

const toggleShopProductStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  const product = await prisma.shopProduct.update({
    where: { id: Number(id) },
    data: { isActive },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      `Shop product ${isActive ? "activated" : "deactivated"} successfully`,
      product
    )
  );
});
const getLiveMapData = asyncHandler(async (req, res) => {
  const [shops, riders] = await prisma.$transaction([
    prisma.shopkeeper.findMany({
      where: { isActive: true },
      select: {
        id: true,
        shopName: true,
        shopCategory: true,
        user: {
          select: {
            name: true,
            phone: true,
            address: {
              where: { isDeleted: false },
              take: 1
            }
          }
        }
      }
    }),
    prisma.deliveryBoy.findMany({
      select: {
        id: true,
        currentLat: true,
        currentLng: true,
        isAvailable: true,
        user: { select: { name: true, phone: true } }
      }
    })
  ]);

  // Process Shops to extract Coordinates
  const processedShops = shops.map(shop => {
    // Parse geoLocation string "lat,lng" if available
    let lat = 0, lng = 0;
    const addr = shop.user.address[0];
    if (addr && addr.geoLocation) {
      const parts = addr.geoLocation.split(',');
      if (parts.length === 2) {
        lat = parseFloat(parts[0].trim());
        lng = parseFloat(parts[1].trim());
      }
    }
    return {
      id: shop.id,
      name: shop.shopName,
      category: shop.shopCategory,
      owner: shop.user.name,
      phone: shop.user.phone,
      lat,
      lng,
      status: 'active'
    };
  }).filter(s => s.lat !== 0 && s.lng !== 0); // Only return shops with valid location

  const processedRiders = riders.map(rider => ({
    id: rider.id,
    name: rider.user.name,
    phone: rider.user.phone,
    lat: rider.currentLat || 0,
    lng: rider.currentLng || 0,
    status: rider.isAvailable ? 'available' : 'busy' // Simplified status
  })).filter(r => r.lat !== 0 && r.lng !== 0);

  res.status(200).json(new ApiResponse(200, "Live map data fetched", {
    shops: processedShops,
    riders: processedRiders
  }));
});
const updateProductCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!name || name.length < 2 || name.length > 100) {
    throw new ApiError(400, "Product category name must be between 2 and 100 characters long");
  }

  const updatedCategory = await prisma.productCategory.update({
    where: { id: Number(id) },
    data: { name, description },
  });

  res.status(200).json(new ApiResponse(200, "Product category updated successfully", updatedCategory));
});


