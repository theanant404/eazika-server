import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { shopRegistrationSchema } from "../validations/shop.validation";
import {
  shopProductSchema,
  shopWithGlobalProductSchema,
} from "../validations/product.validation";
import { Prisma } from "../generated/prisma/client";

//  ========== Shop Management Controllers ==========
const createShop = asyncHandler(async (req, res) => {
  // write a step to create shop profile for shopkeeper
  // 1. Validate request body using shopRegistrationSchema
  // 2. Check if shop profile already exists for the user
  // 3. Create bank details and documents entries
  // 4. Create shopkeeper profile
  // 5. Update user role to shopkeeper
  // 6. Return created shop profile

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = shopRegistrationSchema.parse(req.body);

  // Create shopkeeper, bank details and documents in a single transaction to minimize DB calls
  const created = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Check existing profile inside the transaction to avoid race conditions
    const existing = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
    });
    if (existing)
      throw new ApiError(400, "Shop profile already exists for this user");

    // Create bank details
    const createBankDetail = await tx.bankDetail.create({
      data: {
        accountHolderName: payload.bankDetail.accountHolderName,
        accountNumber: payload.bankDetail.accountNumber,
        ifscCode: payload.bankDetail.ifscCode,
        bankName: payload.bankDetail.bankName,
        branchName: payload.bankDetail.branchName,
        bankPassbookImage: payload.bankDetail.bankPassbookImage || null,
      },
    });
    if (!createBankDetail)
      throw new ApiError(500, "Failed to create bank details");

    // Create documents
    const createDocument = await tx.shopkeeperDocument.create({
      data: {
        aadharImage: payload.document.aadharImage,
        electricityBillImage: payload.document.electricityBillImage,
        businessCertificateImage: payload.document.businessCertificateImage,
        panImage: payload.document.panImage || null,
      },
    });
    if (!createDocument)
      throw new ApiError(500, "Failed to create shop documents");

    // Create shopkeeper profile
    const shopkeeper = await tx.shopkeeper.create({
      data: {
        userId: req.user!.id,
        shopName: payload.shopName,
        shopCategory: payload.shopCategory,
        shopImage: payload.shopImages,
        fssaiNumber: payload.fssaiNumber || null,
        gstNumber: payload.gstNumber || null,
        bankDetailId: createBankDetail.id,
        documentId: createDocument.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        bankDetail: { select: { id: true } },
        document: { select: { id: true } },
      },
    });

    // Update user role in same transaction
    await tx.user.update({
      where: { id: req.user!.id },
      data: { role: "shopkeeper" },
    });

    return shopkeeper;
  });

  if (!created) throw new ApiError(500, "Failed to create shop profile");

  return res
    .status(201)
    .json(new ApiResponse(201, "Shop created successfully", created));
});

const updateShop = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { shopName, shopImages, fssaiNumber, gstNumber, isActive } = req.body;

  // Find shopkeeper profile
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Only shopkeeper allowed");
  }

  // Prepare update data
  const updateData: any = {};

  if (shopName) updateData.shopName = shopName;
  if (shopImages && Array.isArray(shopImages) && shopImages.length > 0)
    updateData.shopImage = shopImages;

  // Validate FSSAI if provided
  if (fssaiNumber !== undefined) {
    if (fssaiNumber && fssaiNumber !== shopkeeper.fssaiNumber) {
      const fssaiExists = await prisma.shopkeeper.findUnique({
        where: { fssaiNumber },
      });
      if (fssaiExists) {
        throw new ApiError(400, "FSSAI number already registered");
      }
    }
    updateData.fssaiNumber = fssaiNumber;
  }

  // Validate GST if provided
  if (gstNumber !== undefined) {
    if (gstNumber && gstNumber !== shopkeeper.gstNumber) {
      const gstExists = await prisma.shopkeeper.findUnique({
        where: { gstNumber },
      });
      if (gstExists) {
        throw new ApiError(400, "GST number already registered");
      }
    }
    updateData.gstNumber = gstNumber;
  }

  // Update isActive
  if (isActive !== undefined) {
    updateData.isActive = isActive;
    if (!isActive) {
      updateData.deactivatedAt = new Date();
    }
  }

  // Update shopkeeper
  const updatedShopkeeper = await prisma.shopkeeper.update({
    where: { id: shopkeeper.id },
    data: updateData,
    include: {
      user: true,
      document: true,
      bankDetail: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Shop updated successfully", updatedShopkeeper));
});

// ========== Product Management Controllers ==========
const getShopProducts = asyncHandler(async (req, res) => {
  // write steps to get all shop products for authenticated shopkeeper with pagination
  // 1. Parse page and limit from query params, set defaults if not provided
  // 2. Calculate offset for pagination
  // 3. Fetch shop products from DB with limit and offset
  // 4. Return products with pagination info

  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const offset = (page - 1) * limit;

  const [products, total] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: { shopkeeperId: req.user!.id },
      skip: offset,
      take: limit,
      include: {
        productCategories: true,
        prices: true,
        globalProduct: true,
      },
    }),
    prisma.shopProduct.count({
      where: { shopkeeperId: req.user!.id },
    }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Shop products fetched successfully", {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

const getGlobalProducts = asyncHandler(async (req, res) => {
  // write steps to get all global products with pagination
  // 1. Parse page and limit from query params, set defaults if not provided
  // 2. Calculate offset for pagination
  // 3. Fetch global products from DB with limit and offset
  // 4. Return products with pagination info

  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const offset = (page - 1) * limit;
  const [products, total] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      skip: offset,
      take: limit,
      include: {
        productCategories: true,
        prices: true,
      },
    }),
    prisma.globalProduct.count(),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Global products fetched successfully", {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

const addShopProduct = asyncHandler(async (req, res) => {
  // write steps to add a new product to shop
  // 1. Validate request body using shopProductSchema
  // 2. Create shop product entry in DB
  // 3. Return created product

  const payload = shopProductSchema.parse(req.body);

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!shopkeeper)
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");
    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: payload.productCategoryId,
        isGlobalProduct: false,
        name: payload.name,
        brand: payload.brand,
        description: payload.description,
        images: payload.images,
        prices: { createMany: { data: payload.pricing } },
      },
    });
    if (!newProduct) throw new ApiError(500, "Failed to add product");

    return newProduct;
  });

  if (!product) throw new ApiError(500, "Failed to add product");

  return res
    .status(201)
    .json(new ApiResponse(201, "Product added successfully", product));
});

const addShopGlobalProduct = asyncHandler(async (req, res) => {
  // write steps to add a new product to shop linked to global product
  // 1. Validate request body using shopProductSchema
  // 2. Check if global product exists
  // 3. Create shop product entry in DB linked to global product
  // 4. Return created product

  const payload = shopWithGlobalProductSchema.parse(req.body);

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!shopkeeper)
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

    // Check if global product exists
    const globalProduct = await tx.globalProduct.findUnique({
      where: { id: payload.globalProductId },
    });
    if (!globalProduct) throw new ApiError(404, "Global product not found");

    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: payload.productCategoryId,
        isGlobalProduct: true,
        globalProductId: payload.globalProductId,
        prices: { createMany: { data: payload.pricing } },
      },
      include: {
        prices: true,
        globalProduct: true,
        productCategories: true,
      },
    });
    if (!newProduct) throw new ApiError(500, "Failed to add product");

    return newProduct;
  });

  if (!product) throw new ApiError(500, "Failed to add product");

  return res
    .status(201)
    .json(new ApiResponse(201, "Product added successfully", product));
});

/**
 * Update shop product details
 * Request params: productId
 * Request body: {
 *   name (optional),
 *   description (optional),
 *   images (optional),
 *   priceIds (optional),
 *   isActive (optional)
 * }
 * - Only shopkeeper can update their products
 * - Validate price IDs if provided
 */
const updateShopProduct = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  const { name, description, images, priceIds, isActive } = req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");
  }

  // Find product
  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  // Prepare update data
  const updateData: any = {};

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (images && Array.isArray(images) && images.length > 0)
    updateData.images = images;

  // Validate and update priceIds if provided
  if (priceIds && Array.isArray(priceIds) && priceIds.length > 0) {
    const prices = await prisma.productPrice.findMany({
      where: { id: { in: priceIds } },
    });

    if (prices.length !== priceIds.length) {
      throw new ApiError(400, "Some product prices not found");
    }

    updateData.priceIds = priceIds;
  }

  if (isActive !== undefined) updateData.isActive = isActive;

  // Update product
  const updatedProduct = await prisma.shopProduct.update({
    where: { id: product.id },
    data: updateData,
    include: {
      prices: true,
      globalProduct: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Product updated successfully", updatedProduct));
});

/**
 * Update product stock
 * Request params: productId
 * Request body: { stock }
 * - Sets the product stock to the exact number provided
 * - Only shopkeeper can update stock
 * - Stock cannot be negative
 */
const updateShopProductStock = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  const { stock } = req.body;

  if (!productId || stock === undefined) {
    throw new ApiError(400, "productId and stock are required");
  }

  if (stock < 0) {
    throw new ApiError(400, "Stock cannot be negative");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Find product
  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  // Update product stock with new value
  const updatedProduct = await prisma.shopProduct.update({
    where: { id: product.id },
    data: { stock },
  });

  return res.status(200).json(
    new ApiResponse(200, "Stock updated successfully", {
      productId: updatedProduct.id,
      previousStock: product.stock,
      newStock: updatedProduct.stock,
    })
  );
});

/**
 * Get user by phone number
 * Query params: phone
 * - Find user by phone for delivery partner invitations
 * - Return basic user info
 */
const getUserByPhone = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { phone } = req.query;

  if (!phone || typeof phone !== "string") {
    throw new ApiError(400, "phone is required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "User fetched successfully", user));
});

/**
 * Send invite to delivery partner
 * Request body: {
 *   userId (required),
 *   message (optional)
 * }
 * Steps:
 * 1. Verify user exists
 * 2. Check user is not already delivery partner for this shop
 * 3. Create notification for user
 * 4. Return success
 */
const sendInviteToDeliveryPartner = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { userId, message } = req.body;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Check if user is already delivery partner for this shop
  const existingDeliveryBoy = await prisma.deliveryBoy.findFirst({
    where: {
      userId,
      shopkeeperId: shopkeeper.id,
    },
  });

  if (existingDeliveryBoy) {
    throw new ApiError(400, "User is already a delivery partner for this shop");
  }

  // Create notification for user
  // await prisma.notification.create({
  //   data: {
  //     userId,
  //     title: "Delivery Partner Invitation",
  //     message:
  //       message || `${shopkeeper.shopName} has invited you to be a delivery partner`,
  //     isRead: false,
  //   },
  // });

  // return res.status(200).json(
  //   new ApiResponse(200, "Invitation sent successfully", {
  //     invitedUserId: userId,
  //     shopName: shopkeeper.shopName,
  //     sentAt: new Date(),
  //   })
  // );
});

/**
 * Get Shop Analytics
 * Query params: range (optional: '7d', '30d', 'all')
 */
const getShopAnalytics = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id }
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  const range = req.query.range as string || '7d';
  
  // Date Filter Logic
  let dateFilter: any = {};
  const today = new Date();
  if (range === '7d') {
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFilter = { createdAt: { gte: lastWeek } };
  } else if (range === '30d') {
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFilter = { createdAt: { gte: lastMonth } };
  }
  
  // Base Query for Shop Orders
  const shopOrdersClause = {
    orderItems: { some: { product: { shopkeeperId: shopkeeper.id } } },
    ...dateFilter
  };

  // Aggregation
  const [totalOrders, deliveredOrders, cancelledOrders, revenueAgg] = await prisma.$transaction([
    prisma.order.count({ where: shopOrdersClause }),
    prisma.order.count({ where: { ...shopOrdersClause, status: 'delivered' } }),
    prisma.order.count({ where: { ...shopOrdersClause, status: 'cancelled' } }),
    prisma.order.aggregate({
      _sum: { totalAmount: true },
      where: { ...shopOrdersClause, status: 'delivered' }
    })
  ]);

  const activeOrders = totalOrders - deliveredOrders - cancelledOrders;
  const customers = await prisma.order.findMany({
      where: shopOrdersClause,
      distinct: ['userId'],
      select: { userId: true }
  });

  const analyticsData = {
    metrics: {
        revenue: (revenueAgg._sum.totalAmount || 0).toString(),
        orders: totalOrders.toString(),
        customers: customers.length.toString(),
        aov: totalOrders > 0 ? (revenueAgg._sum.totalAmount || 0 / totalOrders).toFixed(2) : "0",
    },
    orderStats: { // Extra metadata for our internal use if needed
        active: activeOrders,
        delivered: deliveredOrders,
        cancelled: cancelledOrders
    },
    // Mock charts for now to match interface
    revenueChart: [], 
    ordersChart: [], 
    products: []
  };

  return res.status(200).json(new ApiResponse(200, "Analytics fetched", analyticsData));
});

export {
  createShop,
  updateShop,
  getShopProducts,
  getGlobalProducts,
  addShopGlobalProduct,
  addShopProduct,
  updateShopProduct,
  updateShopProductStock,
  getUserByPhone,
  sendInviteToDeliveryPartner,
  getShopOrders, 
  assignDeliveryPartner,
  updateOrderStatus,
  getShopAnalytics, // Exported
};

// ========== Order Management Controllers ==========

/**
 * Update Order Status (Shopkeeper)
 * Request body: { orderId, status }
 * Used for Accepting/Rejecting orders
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { orderId, status } = req.body;
  if (!orderId || !status) throw new ApiError(400, "orderId and status required");

  // Validate status
  if (!['confirmed', 'cancelled', 'preparing', 'ready'].includes(status)) {
     throw new ApiError(400, "Invalid status upgrade for shopkeeper");
  }

  const shopkeeper = await prisma.shopkeeper.findUnique({where: {userId: req.user.id}});
  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  // Check ownership
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      orderItems: { some: { product: { shopkeeperId: shopkeeper.id } } }
    }
  });

  if (!order) throw new ApiError(404, "Order not found");

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: { 
        status: status,
        cancelBy: status === 'cancelled' ? 'shopkeeper' : undefined
    }
  });

  if (updatedOrder.status === 'confirmed') {
    // Check for auto-assignment
    const availableRiders = await prisma.deliveryBoy.findMany({
        where: {
            shopkeeperId: shopkeeper.id,
            isAvailable: true,
        }
    });

    if (availableRiders.length === 1) {
        const rider = availableRiders[0];
        // Auto-assign
        await prisma.order.update({
            where: { id: orderId },
            data: {
                assignedDeliveryBoyId: rider.id,
                status: 'shipped' // Automatically mark as shipped/assigned
            }
        });
        // We could notify the user here that it was auto-assigned, but for now we just do it.
    }
  }

  return res.status(200).json(new ApiResponse(200, "Order status updated", updatedOrder));
});

/**
 * Get orders for shopkeeper

/**
 * Get orders for shopkeeper
 * Query params: status, page, limit
 * 1. Find shopkeeper
 * 2. Find orders containing products from this shopkeeper
 * 3. Return orders
 */
const getShopOrders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const status = req.query.status as string; // Optional: pending, confirmed, shipped, delivered, cancelled
  const skip = (page - 1) * limit;

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Find orders that have items belonging to this shop
  // Note: This approach assumes we want to show the whole order if it contains ANY item from the shop.
  // Ideally, orders should be split or filtered, but for MVP we show the order.
  const whereClause: any = {
    orderItems: {
      some: {
        product: {
          shopkeeperId: shopkeeper.id,
        },
      },
    },
  };

  if (status) {
    whereClause.status = status;
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, phone: true },
        },
        address: true,
        orderItems: {
          include: {
            product: true, // Include product to verify ownership on frontend if needed
            priceDetails: true 
          }
        },
        deliveryBoy: {
          include: { user: { select: { name: true, phone: true } } }
        }
      },
    }),
    prisma.order.count({ where: whereClause }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Shop orders fetched successfully", {
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    })
  );
});

/**
 * Assign rider to order
 * Request body: { orderId, deliveryBoyId }
 * 1. Verify order belongs (contains items) to shop
 * 2. Verify delivery boy belongs to shop
 * 3. Update order with assignedDeliveryBoyId
 * 4. Update status to 'confirmed' or 'ready' if applicable
 */
const assignDeliveryPartner = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { orderId, deliveryBoyId } = req.body;

  if (!orderId || !deliveryBoyId) {
    throw new ApiError(400, "orderId and deliveryBoyId are required");
  }

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  // Verify Delivery Boy
  const deliveryBoy = await prisma.deliveryBoy.findFirst({
    where: {
      id: deliveryBoyId,
      shopkeeperId: shopkeeper.id,
    },
  });

  if (!deliveryBoy) {
    throw new ApiError(400, "Delivery boy not found or not assigned to your shop");
  }

  // Verify Order contains shop's products
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      orderItems: {
        some: {
          product: {
            shopkeeperId: shopkeeper.id,
          },
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found or doesn't belong to your shop");
  }

  // Assign
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      assignedDeliveryBoyId: deliveryBoy.id,
      status: "confirmed", // or 'shipped'? Usually 'confirmed' implies shop accepted it. 'shipped' when rider picks up.
      // Let's set to confirmed for now, allowing rider to move it to shipped/delivered.
    },
    include: {
      deliveryBoy: { include: { user: true } }
    }
  });

  return res.status(200).json(
    new ApiResponse(200, "Rider assigned successfully", updatedOrder)
  );
});
