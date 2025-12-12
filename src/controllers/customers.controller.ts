import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { createOrderSchema } from "../validations/product.validation";

/* ================================= Customer Products Controllers ============================ */

const getProducts = asyncHandler(async (req, res) => {
  // 1. Pagination Setup
  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || (req.query.page as string) || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || (req.query.limit as string) || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  // 2. City Filtering (ADDED)
  const city = req.query.city as string;
  const whereClause: any = { isActive: true };

  if (city) {
    whereClause.shopkeeper = {
      user: {
        address: {
          some: {
            city: {
              equals: city,
              mode: 'insensitive' // Case-insensitive match
            }
          }
        }
      }
    };
  }

  const [products, totalCount] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: whereClause, // Updated to use whereClause
      include: {
        prices: {
          select: {
            id: true,
            price: true,
            discount: true,
            weight: true,
            unit: true,
          },
        },
        globalProduct: true,
        productCategories: true,
        shopkeeper: true, // Included for verification if needed
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.shopProduct.count({
      where: whereClause,
    }),
  ]);

  const filteredProducts = products.map((p) => {
    const isGlobal = p.isGlobalProduct;
    return {
      id: p.id,
      isGlobalProduct: p.isGlobalProduct,
      category: p.productCategories.name,
      brand: isGlobal ? p.globalProduct?.brand : p.brand,
      name: isGlobal ? p.globalProduct?.name : p.name,
      description: isGlobal ? p.globalProduct?.description : p.description,
      images: isGlobal ? p.globalProduct?.images : p.images,
      prices: p.prices,
    };
  });

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

/**
 * Get list of cities where Eazika is active (ADDED)
 */
const getAvailableCities = asyncHandler(async (req, res) => {
  const locations = await prisma.address.findMany({
    where: {
      user: {
        shopkeeper: {
          isActive: true
        }
      }
    },
    select: {
      city: true
    },
    distinct: ['city']
  });

  const cities = locations.map(loc => loc.city);

  return res.status(200).json(
    new ApiResponse(200, "Available cities fetched", cities)
  );
});

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  // console.log("Fetching product with ID:", productId);

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  // Fetch product by ID
  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId), isActive: true },
    include: {
      prices: {
        select: {
          id: true,
          price: true,
          discount: true,
          weight: true,
          unit: true,
        },
      },
      globalProduct: true,
      productCategories: true,
      // ratings: { // Uncomment when ratings table is ready
      //   include: {
      //     user: {
      //       select: {
      //         id: true,
      //         name: true,
      //         image: true,
      //       },
      //     },
      //   },
      // },
    },
  });

  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or inactive");
  }

  const isGlobal = product.isGlobalProduct;
  let tatalRating = 0;
  // Mock ratings until relation exists in schema
  const ratings = (product as any).ratings || [];

  const productData = {
    id: product.id,
    isGlobalProduct: product.isGlobalProduct,
    category: product.productCategories.name,
    brand: isGlobal ? product.globalProduct?.brand : product.brand,
    name: isGlobal ? product.globalProduct?.name : product.name,
    description: isGlobal
      ? product.globalProduct?.description
      : product.description,
    images: isGlobal ? product.globalProduct?.images : product.images,
    prices: product.prices,
    rating: {
      ratings: ratings.map((r: any) => {
        tatalRating += r.rating;
        return {
          id: r.id,
          userId: r.user.id,
          userName: r.user.name,
          userImage: r.user.image,
          review: r.review,
          rating: r.rating,
          createdAt: r.createdAt,
        };
      }),
      rate: ratings.length > 0 ? tatalRating / ratings.length : 0,
      count: ratings.length,
    },
  };

  return res.status(200).json(
    new ApiResponse(200, "Product fetched successfully", {
      product: productData,
    })
  );
});

/* ================================= Customer Cart Controllers ============================ */

const addToCart = asyncHandler(async (req, res) => {
  const { productId, priceId, quantity } = req.body;
  // console.log("productId:", productId, "priceId:", priceId, "quantity:", quantity);

  // Validate inputs
  if (!(productId || priceId || parseInt(quantity) < 0))
    throw new ApiError(400, "productId, priceId and quantity are required");

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const item = await prisma.$transaction(async (tx) => {
    const product = await tx.shopProduct.findUnique({
      where: {
        id: productId,
        isActive: true,
      },
      include: {
        prices: { where: { id: priceId } },
      },
    });

    if (!product) throw new ApiError(404, "Product not found or inactive");

    // Check existing item
    const existingItem = await tx.cartItem.findFirst({
        where: {
            userId: req.user!.id,
            shopProductId: productId,
            productPriceId: priceId
        }
    });

    if (existingItem) {
        return tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: existingItem.quantity + parseInt(quantity) },
            include: { productPrice: true, shopProduct: true }
        });
    }

    return tx.cartItem.create({
      data: {
        userId: req.user?.id!,
        shopProductId: productId,
        productPriceId: priceId,
        quantity: quantity,
      },
      include: {
        productPrice: true,
        shopProduct: true,
      },
    });
  });
  if (!item) throw new ApiError(500, "Failed to add item to cart");

  return res
    .status(201)
    .json(new ApiResponse(201, "Item added to cart successfully", item));
});

const getCart = asyncHandler(async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user?.id },
    include: {
      shopProduct: {
        include: {
          globalProduct: true,
        },
      },
      productPrice: true,
    },
  });

  const items = cartItems.map((i) => {
    const isGlobal = i.shopProduct.isGlobalProduct;
    return {
      id: i.id,
      userId: i.userId,
      productId: i.shopProductId,
      priceId: i.productPriceId,
      quantity: i.quantity,
      product: {
        name: isGlobal ? i.shopProduct.globalProduct?.name : i.shopProduct.name,
        description: isGlobal
          ? i.shopProduct.globalProduct?.description
          : i.shopProduct.description,
        image: isGlobal
          ? i.shopProduct.globalProduct?.images[0]
          : i.shopProduct.images[0],
        price: i.productPrice!.price,
      },
    };
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart fetched successfully", { items }));
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  if (!itemId) throw new ApiError(400, "itemId is required");
  if (parseInt(quantity) < 0)
    throw new ApiError(400, "quantity must be a positive integer");

  const cartItem = await prisma.cartItem.update({
    where: { id: parseInt(itemId), userId: req.user?.id },
    data: { quantity: parseInt(quantity) },
  });

  if (!cartItem) throw new ApiError(500, "Failed to update cart item");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart item updated successfully", cartItem));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  if (!itemId) throw new ApiError(400, "itemId is required");

  const deletedItem = await prisma.cartItem.deleteMany({
    where: { id: parseInt(itemId), userId: req.user?.id },
  });
  if (deletedItem.count === 0)
    throw new ApiError(404, "Cart item not found or doesn't belong to user");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart item removed successfully"));
});

const clearCart = asyncHandler(async (req, res) => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user?.id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart cleared successfully"));
});

/* ================================= Customer Order Controllers ============================ */

const createOrder = asyncHandler(async (req, res) => {
  const { addressId, orderItems, paymentMethod } = createOrderSchema.parse(
    req.body
  );

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({
      where: { id: addressId, userId: req.user!.id },
    });

    if (!address)
      throw new ApiError(404, "Address not found or doesn't belong to user");

    const product = await tx.shopProduct.findMany({
      where: {
        id: { in: orderItems.map((i) => Number(i.productId)) },
        isActive: true,
      },
      include: {
        prices: {
          where: { id: { in: orderItems.map((i) => Number(i.priceId)) } },
        },
      },
    });

    if (product.length === 0)
      throw new ApiError(400, "No valid products found for the order items");

    let totalAmount = 0;

    const items = await product.map((p) => {
      const quantity = orderItems.find(
        (item) =>
          Number(item.productId) === p.id &&
          Number(item.priceId) === p.prices[0].id
      )!.quantity;

      const amount = p.prices[0].price;
      totalAmount += amount * quantity;

      return {
        shopProductId: p.id, // Mapped correctly to schema
        productPriceId: p.prices[0].id, // Mapped correctly to schema
        quantity: quantity,
        // price/weight/unit are not stored in OrderItem schema based on your earlier schema file, 
        // they are relational lookups. If you want snapshot, you need schema changes.
        // For now, mapping to existing OrderItem fields:
      };
    });

    // console.log("Total Items Amount:", totalAmount);
    return await tx.order.create({
      data: {
        userId: req.user!.id,
        addressId: address.id,
        paymentMethod: paymentMethod,
        totalAmount,
        totalProducts: items.length,
        orderItems: { createMany: { data: items } },
      },
    });
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Order created successfully", order));
});

const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: {
      orderItems: {
        include: {
          // productPrice: true,
          // shopProduct: true,
        },
      },
      address: true,
      deliveryBoy: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order));
});

const getOrders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: {
        include: {
          // productPrice: true,
          // shopProduct: true,
        },
      },
      address: true,
      deliveryBoy: {
        include: {
          user: true,
        },
      },
    },
  });

  const totalCount = await prisma.order.count({
    where: { userId: req.user.id },
  });

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", {
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  );
});

const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: {
      deliveryBoy: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  const trackingData = {
    orderId: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    totalProducts: order.totalProducts,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    deliveryBoy: order.deliveryBoy
      ? {
          id: order.deliveryBoy.id,
          name: order.deliveryBoy.user.name,
          phone: order.deliveryBoy.user.phone,
          vehicleNo: order.deliveryBoy.vehicleNo,
        }
      : null,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, "Order tracked successfully", trackingData));
});

const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  if (order.status !== "pending" && order.status !== "confirmed") {
    throw new ApiError(400, `Cannot cancel order with status: ${order.status}`);
  }

  const cancelledOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "cancelled",
      cancelBy: "user",
      cancelReason: reason || "Customer cancelled the order",
    },
    include: {
      orderItems: {
        include: {
          // productPrice: true,
          // shopProduct: true,
        },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Order cancelled successfully", cancelledOrder));
});

export {
  getProducts,
  getProductById,
  getAvailableCities, // New Export
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrder,
  getOrders,
  trackOrder,
  cancelOrderByCustomer,
};