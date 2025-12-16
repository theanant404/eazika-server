import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  shopRegistrationSchema,
  updateStockAndPriceSchema,
} from "../validations/shop.validation";
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

  const created = await prisma.$transaction(async (tx) => {
    // Check existing profile inside the transaction to avoid race conditions
    const existing = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
    });
    if (existing)
      throw new ApiError(400, "Shop profile already exists for this user");

    // Create documents
    const createDocument = await tx.shopkeeperDocument.create({
      data: {
        aadharImage: payload.documents.aadharImage,
        electricityBillImage: payload.documents.electricityBillImage,
        businessCertificateImage: payload.documents.businessCertificateImage,
        panImage: payload.documents.panImage || null,
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
        documentId: createDocument.id,
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
  // write steps to get all products for the shop with pagination
  // 1. Parse pagination params from query
  // 2. Fetch products from DB with pagination
  // 3. Return products with pagination info

  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  const [products, totalCount] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: { shopkeeper: { userId: req.user!.id } },
      include: {
        prices: {
          select: {
            id: true,
            price: true,
            discount: true,
            weight: true,
            unit: true,
            stock: true,
          },
        },
        globalProduct: true,
        productCategories: true,
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.shopProduct.count({
      where: { isActive: true },
    }),
  ]);

  const filteredProducts = products.map((p) => {
    const isGlobal = p.isGlobalProduct;
    if (isGlobal) {
      return {
        id: p.id,
        isGlobalProduct: p.isGlobalProduct,
        category: p.productCategories.name,
        globalProductId: p.globalProductId,
        brand: p.globalProduct?.brand,
        name: p.globalProduct?.name,
        description: p.globalProduct?.description,
        images: p.globalProduct?.images,
        pricing: p.prices,
        isActive: p.isActive,
      };
    } else {
      return {
        id: p.id,
        isGlobalProduct: p.isGlobalProduct,
        category: p.productCategories.name,
        brand: p.brand,
        name: p.name,
        description: p.description,
        images: p.images,
        pricing: p.prices,
        isActive: p.isActive,
      };
    }
  });
  console.log("Filtered shop products:", filteredProducts);

  return res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products: filteredProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const getGlobalProducts = asyncHandler(async (req, res) => {
  // write steps to get all global products with pagination
  // 1. Parse pagination params from query
  // 2. Fetch global products from DB with pagination
  // 3. Return products with pagination info
  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  const [globalProducts, totalCount] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      include: {
        productCategories: true,
        prices: {
          select: {
            id: true,
            price: true,
            discount: true,
          },
        },
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.globalProduct.count(),
  ]);

  const formattedProducts = globalProducts.map((p) => ({
    id: p.id,
    category: p.productCategories.name,
    brand: p.brand,
    name: p.name,
    description: p.description,
    images: p.images,
    pricing: p.prices,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Global products fetched successfully", {
      globalProducts: formattedProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const getShopCategories = asyncHandler(async (req, res) => {
  // Fetch distinct shop categories from shopkeeper profiles
  const categories = await prisma.productCategory.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  // const categoryList = categories.map((cat) => ({
  //   id: cat.id,
  //   name: cat.name,
  // }));
  console.log("Fetched shop categories:", categories);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Shop categories fetched successfully", categories)
    );
});

const addShopProduct = asyncHandler(async (req, res) => {
  // write steps to add a new product to shop
  // 1. Validate request body using shopProductSchema
  // 2. Create shop product entry in DB
  // 3. Return created product

  const payload = shopProductSchema.parse(req.body);

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const product = await prisma.$transaction(async (tx) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: Number(req.user?.id) },
      select: { id: true },
    });

    if (!shopkeeper)
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

    const category = await tx.productCategory.findUnique({
      where: { id: payload.productCategoryId },
      select: { id: true },
    });
    if (!category) throw new ApiError(404, "Product category not found");

    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: category.id,
        isGlobalProduct: false,
        name: payload.name,
        brand: payload.brand,
        description: payload.description,
        images: payload.images,
        prices: { createMany: { data: payload.pricing } },
      },
    });
    console.log("Newly added shop product:", newProduct);
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

const updateStockAndPrice = asyncHandler(async (req, res) => {
  // write steps to update stock and price of a product
  // 1. Validate request body using updateStockAndPriceSchema
  // 2. Check if product belongs to shopkeeper
  // 3. Update stock and price in DB
  // 4. Return updated pricing info

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { priceId } = req.params;
  const payload = updateStockAndPriceSchema.parse(req.body);

  const pricing = prisma.productPrice.update({
    where: {
      id: parseInt(priceId),
      shopProduct: { shopkeeper: { userId: req.user.id } },
    },
    data: {
      stock: payload.stock,
      price: payload.price,
      discount: payload.discount,
      weight: payload.weight,
      unit: payload.unit,
    },
  });

  if (!pricing) {
    throw new ApiError(500, "Failed to update product stock and price");
  }

  return res.status(200).json(
    new ApiResponse(200, "Product stock and price updated successfully", {
      pricing,
    })
  );
});

// ================================ Other Shop Controllers =============================

const getCurrentOrders = asyncHandler(async (req, res) => {
  // write steps to get current orders for the shop
  // 1. Parse pagination params from query
  // 2. Fetch orders from DB with pagination
  // 3. Return orders with pagination info

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  const allOrders = await prisma.order.findMany({
    where: {
      orderItems: {
        some: { product: { shopkeeper: { userId: req.user.id } } },
      },
      status: { in: ["pending", "confirmed", "shipped"] },
    },
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, phone: true } },
      address: true,
    },
    skip,
    take: itemsPerPage,
    orderBy: { createdAt: "desc" },
  });

  const formattedOrders = allOrders.map((o) => {
    return {
      id: o.id,
      customerName: o.user.name,
      createdAt: o.createdAt,
      address: `${o.address.line1}, ${o.address.city}, ${o.address.state}, ${o.address.pinCode}`,
      itemCount: o.orderItems.length,
      paymentMethod: o.paymentMethod,
      status: o.status,
      totalAmount: o.totalAmount,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Current orders fetched successfully", {
      orders: formattedOrders,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: formattedOrders.length,
        totalPages: Math.ceil(formattedOrders.length / itemsPerPage),
      },
    })
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  // Find order
  const order = await prisma.order.findUnique({
    where: {
      id: parseInt(orderId),
      orderItems: {
        some: { product: { shopkeeper: { userId: req.user.id } } },
      },
    },

    include: {
      address: true,
      deliveryBoy: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
              shopkeeper: {
                include: {
                  deliveryBoys: {
                    include: {
                      user: { select: { id: true, name: true, phone: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  const orderItems = {
    id: order.id,
    customerName: order.address.name,
    customerPhone: order.address.phone,
    address: `${order.address.line1}, ${order.address.city}, ${order.address.state}, ${order.address.pinCode}`,
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: order.orderItems.length,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      image: item.product.isGlobalProduct
        ? item.product.globalProduct?.images[0]
        : item.product.images[0],
      name: item.product.isGlobalProduct
        ? item.product.globalProduct?.name
        : item.product.name,
      price: item.price,
      weight: item.weight,
      unit: item.unit,
    })),
    driver: order.deliveryBoy && {
      id: order.deliveryBoy.user.id,
      name: order.deliveryBoy.user.name,
      phone: order.deliveryBoy.user.phone,
    },
    driverList:
      order.orderItems.length > 0
        ? order.orderItems[0].product.shopkeeper.deliveryBoys.map((db) => ({
            id: db.user.id,
            name: db.user.name,
            phone: db.user.phone,
          }))
        : [],
  };

  return res.status(200).json(
    new ApiResponse(200, "Order fetched successfully", {
      order: orderItems,
    })
  );
});

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
        aov: totalOrders > 0 ? ((revenueAgg._sum.totalAmount || 0) / totalOrders).toFixed(2) : "0",
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

/**
 * Delete shop product (Soft delete)
 * Request params: productId
 */
const deleteShopProduct = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  if (!productId) throw new ApiError(400, "productId is required");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  await prisma.shopProduct.update({
    where: { id: product.id },
    data: { isActive: false },
  });

  return res.status(200).json(new ApiResponse(200, "Product deleted successfully"));
});



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

  let finalOrder = await prisma.order.update({
    where: { id: orderId },
    data: { 
        status: status,
        cancelBy: status === 'cancelled' ? 'shopkeeper' : undefined
    }
  });

  if (finalOrder.status === 'confirmed') {
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
        finalOrder = await prisma.order.update({
            where: { id: orderId },
            data: {
                assignedDeliveryBoyId: rider.id,
                status: 'shipped' // Automatically mark as shipped/assigned
            }
        });
        // We could notify the user here that it was auto-assigned, but for now we just do it.
    }
  }

  return res.status(200).json(new ApiResponse(200, "Order status updated", finalOrder));
});

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
      status: "shipped", // Updated to 'shipped' for consistency
    },
    include: {
      deliveryBoy: { include: { user: true } }
    }
  });

  return res.status(200).json(
    new ApiResponse(200, "Rider assigned successfully", updatedOrder)
  );
});

const getShopRiders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const status = req.query.status as string; // 'pending' | 'verified' | 'all'

  const shopkeeper = await prisma.shopkeeper.findUnique({
      where: { userId: req.user.id }
  });
  if (!shopkeeper) throw new ApiError(404, "Shopkeeper profile not found");

  const whereClause: any = { shopkeeperId: shopkeeper.id };
  if (status === 'pending') whereClause.isVerified = false;
  if (status === 'verified') whereClause.isVerified = true;

  const riders = await prisma.deliveryBoy.findMany({
      where: whereClause,
      include: {
          user: { select: { id: true, name: true, phone: true, image: true } }
      }
  });

  return res.status(200).json(new ApiResponse(200, "Riders fetched", riders));
});

const approveRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId } = req.body;

  // Verify shopkeeper owns this rider request
  const rider = await prisma.deliveryBoy.findFirst({
      where: { 
          id: riderId,
          shopkeeper: { userId: req.user.id }
      }
  });
  if (!rider) throw new ApiError(404, "Rider request not found");

  const updated = await prisma.deliveryBoy.update({
      where: { id: riderId },
      data: { isVerified: true }
  });

  return res.status(200).json(new ApiResponse(200, "Rider approved", updated));
});

const rejectRider = asyncHandler(async (req, res) => {
    if (!req.user) throw new ApiError(401, "User not authenticated");
    const { riderId } = req.body;
  
    // Verify shopkeeper owns this rider request
    const rider = await prisma.deliveryBoy.findFirst({
        where: { 
            id: riderId,
            shopkeeper: { userId: req.user.id }
        }
    });
    if (!rider) throw new ApiError(404, "Rider request not found");
  
    // Delete the profile so they can re-apply or just to remove from list
    // Also revert user role if needed? 
    // If we delete DeliveryBoy, user role stays "delivery_boy". We should probably revert it to "user".
    
    await prisma.$transaction(async (tx) => {
       await tx.deliveryBoy.delete({ where: { id: riderId } });
       await tx.user.update({
           where: { id: rider.userId },
           data: { role: 'user' }
       });
    });
  
    return res.status(200).json(new ApiResponse(200, "Rider rejected and removed"));
  });

export {
  createShop,
  updateShop,
  getShopCategories,
  getShopProducts,
  getGlobalProducts,
  addShopGlobalProduct,
  addShopProduct,
  updateShopProduct,
  updateStockAndPrice,
  deleteShopProduct,
  getCurrentOrders,
  getOrderById,
  // getOrderHistory,
  updateOrderStatus,
  getUserByPhone,
  sendInviteToDeliveryPartner,
  getShopOrders,
  assignDeliveryPartner,
  // updateOrderStatus, // Removed duplicate

  getShopAnalytics,
  getShopRiders,
  approveRider,
  rejectRider
};
