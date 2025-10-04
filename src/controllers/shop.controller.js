import prisma from "../config/dbConfig.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse, ApiError } from "../utils/apiHandler.js";
import * as validateShop from "../validations/shop.validation.js";

// Get all shops owned by shopkeeper
export const getShops = asyncHandler(async (req, res) => {
  const shops = await prisma.shop.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  res.json(new ApiResponse(200, shops, "Shops retrieved successfully"));
});

// Get single shop details
export const getShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shop = await prisma.shop.findFirst({
    where: {
      id,
      ownerId: req.user.id,
    },
    include: {
      _count: {
        select: {
          products: true,
          orders: true,
        },
      },
    },
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  res.json(new ApiResponse(200, shop, "Shop details retrieved successfully"));
});

// Create new shop
export const createShop = asyncHandler(async (req, res) => {
  const ShopPayload = await validateShop.shopSchema.parseAsync(req.body);

  // const existingShop = await prisma.shop.findFirst({
  //   where: { ownerId: req.user.id },
  // });
  // if (existingShop) throw new ApiError(400, "You already own a shop");

  const [newShop] = await prisma.$transaction([
    prisma.shop.create({
      data: {
        name: ShopPayload.name,
        ownerId: String(req.user.id),
        description: ShopPayload.description,
        address: ShopPayload.address,
        contact: {
          phone: ShopPayload.contact.phone,
          email: ShopPayload.contact.email,
          website: ShopPayload.contact.website,
          isPhoneVerified: false,
          isEmailVerified: false,
        },
        images: ShopPayload.images,
        isActive: false,
        metadata: {
          operatingHours: ShopPayload.operatingHours,
          lastUpdated: new Date().toISOString(),
        },
      },
    }),
    prisma.user.update({
      where: { id: req.user.id },
      data: { role: "SHOPKEEPER" },
    }),
  ]);

  if (!newShop) throw new ApiError(500, "Failed to create shop");

  res.json(new ApiResponse(201, "Shop created successfully", newShop));
});

// Update shop
export const updateShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { name, description, address, contact, operatingHours, images } =
    req.body;

  const updatedShop = await prisma.shop.update({
    where: { id },
    data: {
      name,
      description: description || null,
      address: address || {},
      contact: contact || {},
      images: images || [],
      metadata: {
        ...req.shop?.metadata,
        operatingHours: operatingHours || {},
        lastUpdated: new Date().toISOString(),
      },
    },
  });

  res.json(new ApiResponse(200, updatedShop, "Shop updated successfully"));
});

// Delete shop
export const deleteShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if shop has any orders
  const orderCount = await prisma.order.count({
    where: { shopId: id },
  });

  if (orderCount > 0) {
    throw new ApiError(400, "Cannot delete shop with existing orders");
  }

  await prisma.shop.delete({ where: { id } });

  res.json(new ApiResponse(200, null, "Shop deleted successfully"));
});

// Toggle shop active status
export const toggleShopStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shop = await prisma.shop.findFirst({
    where: { id, ownerId: req.user.id },
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  const updatedShop = await prisma.shop.update({
    where: { id },
    data: {
      isActive: !shop.isActive,
    },
  });

  res.json(
    new ApiResponse(
      200,
      updatedShop,
      `Shop ${updatedShop.isActive ? "activated" : "deactivated"} successfully`
    )
  );
});

// Get dashboard statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
  const shopkeeperId = req.user.id;

  // Get all shops owned by shopkeeper
  const shops = await prisma.shop.findMany({
    where: { ownerId: shopkeeperId },
    select: { id: true },
  });

  const shopIds = shops.map((shop) => shop.id);

  if (shopIds.length === 0) {
    return res.json(
      new ApiResponse(
        200,
        {
          totalProducts: 0,
          activeProducts: 0,
          outOfStock: 0,
          lowStock: 0,
          totalOrders: 0,
          pendingOrders: 0,
          todayRevenue: 0,
          monthlyRevenue: 0,
        },
        "No shops found"
      )
    );
  }

  // Get current date boundaries
  const today = new Date();
  const startOfToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  // Parallel queries for better performance
  const [
    productCounts,
    orderCounts,
    todayOrders,
    monthlyOrders,
    outOfStockCount,
    lowStockCount,
  ] = await Promise.all([
    // Product counts
    prisma.shopProduct.aggregate({
      where: { shopId: { in: shopIds } },
      _count: { id: true },
    }),

    // Active product count
    prisma.shopProduct.aggregate({
      where: {
        shopId: { in: shopIds },
        isActive: true,
      },
      _count: { id: true },
    }),

    // Today's delivered orders for revenue
    prisma.order.findMany({
      where: {
        shopId: { in: shopIds },
        status: "DELIVERED",
        deliveredAt: {
          gte: startOfToday,
        },
      },
      select: {
        pricing: true,
      },
    }),

    // Monthly delivered orders for revenue
    prisma.order.findMany({
      where: {
        shopId: { in: shopIds },
        status: "DELIVERED",
        deliveredAt: {
          gte: startOfMonth,
        },
      },
      select: {
        pricing: true,
      },
    }),

    // Out of stock products
    prisma.shopProduct.count({
      where: {
        shopId: { in: shopIds },
        stockQuantity: 0,
        isActive: true,
      },
    }),

    // Low stock products (less than or equal to 10)
    prisma.shopProduct.count({
      where: {
        shopId: { in: shopIds },
        stockQuantity: { lte: 10, gt: 0 },
        isActive: true,
      },
    }),
  ]);

  // Get order status counts
  const orderStatusCounts = await prisma.order.groupBy({
    by: ["status"],
    where: { shopId: { in: shopIds } },
    _count: { status: true },
  });

  // Calculate revenues
  const todayRevenue = todayOrders.reduce((sum, order) => {
    const pricing = typeof order.pricing === "object" ? order.pricing : {};
    return sum + (pricing.totalAmount || 0);
  }, 0);

  const monthlyRevenue = monthlyOrders.reduce((sum, order) => {
    const pricing = typeof order.pricing === "object" ? order.pricing : {};
    return sum + (pricing.totalAmount || 0);
  }, 0);

  // Process order status counts
  const pendingOrders =
    orderStatusCounts.find((o) => o.status === "PENDING")?._count.status || 0;
  const totalOrders = orderStatusCounts.reduce(
    (sum, stat) => sum + stat._count.status,
    0
  );

  const stats = {
    totalProducts: productCounts._count.id || 0,
    activeProducts: orderCounts._count.id || 0,
    outOfStock: outOfStockCount,
    lowStock: lowStockCount,
    totalOrders: totalOrders,
    pendingOrders: pendingOrders,
    todayRevenue: Math.round(todayRevenue),
    monthlyRevenue: Math.round(monthlyRevenue),
  };

  res.json(
    new ApiResponse(200, stats, "Dashboard statistics retrieved successfully")
  );
});

// Get low stock products
export const getLowStockProducts = asyncHandler(async (req, res) => {
  const { threshold = 10 } = req.query;
  const shopkeeperId = req.user.id;

  // Get all shops owned by shopkeeper
  const shops = await prisma.shop.findMany({
    where: { ownerId: shopkeeperId },
    select: { id: true },
  });

  const shopIds = shops.map((shop) => shop.id);

  if (shopIds.length === 0) {
    return res.json(new ApiResponse(200, [], "No shops found"));
  }

  const lowStockProducts = await prisma.shopProduct.findMany({
    where: {
      shopId: { in: shopIds },
      stockQuantity: {
        lte: parseInt(threshold),
      },
      isActive: true,
    },
    include: {
      globalProduct: {
        select: {
          name: true,
          brand: true,
          category: true,
          images: true,
        },
      },
      shop: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      stockQuantity: "asc", // Most critical first
    },
  });

  const formattedProducts = lowStockProducts.map((product) => ({
    id: product.id,
    stockQuantity: product.stockQuantity,
    price: parseFloat(product.price),
    globalProduct: product.globalProduct,
    shop: product.shop,
    priority:
      product.stockQuantity === 0
        ? "critical"
        : product.stockQuantity <= 5
          ? "high"
          : "medium",
  }));

  res.json(
    new ApiResponse(
      200,
      formattedProducts,
      "Low stock products retrieved successfully"
    )
  );
});

// Get shop orders (for dashboard and orders page)
export const getShopOrders = asyncHandler(async (req, res) => {
  const { status, limit = 50, offset = 0 } = req.query;
  const shopkeeperId = req.user.id;

  // Get all shops owned by shopkeeper
  const shops = await prisma.shop.findMany({
    where: { ownerId: shopkeeperId },
    select: { id: true },
  });

  const shopIds = shops.map((shop) => shop.id);

  if (shopIds.length === 0) {
    return res.json(new ApiResponse(200, [], "No shops found"));
  }

  const whereClause = {
    shopId: { in: shopIds },
    ...(status && { status: status.toUpperCase() }),
  };

  const orders = await prisma.order.findMany({
    where: whereClause,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      },
      shop: {
        select: {
          name: true,
        },
      },
      orderItems: {
        include: {
          shopProduct: {
            include: {
              globalProduct: {
                select: {
                  name: true,
                  brand: true,
                  images: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit),
    skip: parseInt(offset),
  });

  // Format orders for frontend
  const formattedOrders = orders.map((order) => ({
    ...order,
    pricing:
      typeof order.pricing === "object"
        ? order.pricing
        : JSON.parse(order.pricing || "{}"),
    deliveryInfo:
      typeof order.deliveryInfo === "object"
        ? order.deliveryInfo
        : JSON.parse(order.deliveryInfo || "{}"),
    statusHistory:
      typeof order.statusHistory === "object"
        ? order.statusHistory
        : JSON.parse(order.statusHistory || "[]"),
  }));

  res.json(
    new ApiResponse(200, formattedOrders, "Shop orders retrieved successfully")
  );
});

// Update order status
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, notes } = req.body;
  const shopkeeperId = req.user.id;

  // Verify order belongs to shopkeeper's shop
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      shop: {
        ownerId: shopkeeperId,
      },
    },
    include: {
      shop: true,
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or access denied");
  }

  // Validate status transition
  const validStatuses = [
    "PENDING",
    "CONFIRMED",
    "READY_FOR_PICKUP",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
    "CANCELLED",
  ];
  if (!validStatuses.includes(status)) {
    throw new ApiError(400, "Invalid order status");
  }

  // Get current status history
  const currentHistory =
    typeof order.statusHistory === "object"
      ? order.statusHistory
      : JSON.parse(order.statusHistory || "[]");

  // Add new status to history
  const newHistory = [
    ...currentHistory,
    {
      status,
      changedAt: new Date().toISOString(),
      changedBy: req.user.id,
      notes: notes || null,
    },
  ];

  // Update order
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status,
      statusHistory: newHistory,
      ...(status === "DELIVERED" && { deliveredAt: new Date() }),
    },
  });

  res.json(
    new ApiResponse(200, updatedOrder, "Order status updated successfully")
  );
});

// Get shop products
export const getShopProducts = asyncHandler(async (req, res) => {
  const {
    shopId,
    category,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
    limit = 50,
    offset = 0,
  } = req.query;
  const shopkeeperId = req.user.id;

  let whereClause = {};

  if (shopId) {
    // Verify shop ownership
    const shop = await prisma.shop.findFirst({
      where: { id: shopId, ownerId: shopkeeperId },
    });
    if (!shop) {
      throw new ApiError(404, "Shop not found or access denied");
    }
    whereClause.shopId = shopId;
  } else {
    // Get all shops owned by shopkeeper
    const shops = await prisma.shop.findMany({
      where: { ownerId: shopkeeperId },
      select: { id: true },
    });
    whereClause.shopId = { in: shops.map((shop) => shop.id) };
  }

  // Add filters
  if (category) {
    whereClause.globalProduct = {
      category: category,
    };
  }

  if (search) {
    whereClause.globalProduct = {
      ...whereClause.globalProduct,
      name: {
        contains: search,
        mode: "insensitive",
      },
    };
  }

  const products = await prisma.shopProduct.findMany({
    where: whereClause,
    include: {
      globalProduct: {
        select: {
          name: true,
          brand: true,
          category: true,
          images: true,
          tags: true,
        },
      },
      shop: {
        select: {
          name: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: {
      [sortBy]: sortOrder,
    },
    take: parseInt(limit),
    skip: parseInt(offset),
  });

  const formattedProducts = products.map((product) => ({
    ...product,
    price: parseFloat(product.price),
    avgRating: parseFloat(product.avgRating) || 0,
    reviewCount: product._count.reviews,
  }));

  res.json(
    new ApiResponse(
      200,
      formattedProducts,
      "Shop products retrieved successfully"
    )
  );
});

// Update product stock
export const updateProductStock = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { stockQuantity } = req.body;
  const shopkeeperId = req.user.id;

  if (stockQuantity < 0) {
    throw new ApiError(400, "Stock quantity cannot be negative");
  }

  // Verify product belongs to shopkeeper's shop
  const product = await prisma.shopProduct.findFirst({
    where: {
      id: productId,
      shop: {
        ownerId: shopkeeperId,
      },
    },
  });

  if (!product) {
    throw new ApiError(404, "Product not found or access denied");
  }

  const updatedProduct = await prisma.shopProduct.update({
    where: { id: productId },
    data: {
      stockQuantity: parseInt(stockQuantity),
      updatedAt: new Date(),
    },
    include: {
      globalProduct: {
        select: {
          name: true,
          brand: true,
        },
      },
    },
  });

  res.json(
    new ApiResponse(200, updatedProduct, "Product stock updated successfully")
  );
});
