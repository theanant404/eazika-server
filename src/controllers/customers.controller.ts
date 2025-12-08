import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { createOrderSchema } from "../validations/product.validation";

/* ================================= Customer Products Controllers ============================ */

const getProducts = asyncHandler(async (req, res) => {
  // write steps to get all active products with their prices and peginate the results
  // 1. Fetch active products from shopProduct table
  // 2. Include productPrices and shopkeeper details
  // 3. Paginate results based on query params page and limit
  // 4. Return paginated products with total count

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
      where: { isActive: true },
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

const getProductById = asyncHandler(async (req, res) => {
  // write steps to get product by ID with its prices and ratings
  // 1. Fetch product from shopProduct table by ID
  // 2. Include productPrices, globalProduct details and ratings with user info
  // 3. Calculate average rating and total number of ratings
  // 4. Return product details along with ratings summary

  const { productId } = req.params;
  console.log("Fetching product with ID:", productId);

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
      ratings: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or inactive");
  }

  const isGlobal = product.isGlobalProduct;
  let tatalRating = 0;

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
      ratings: product.ratings.map((r) => {
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
      rate: tatalRating / product.ratings.length || 0,
      count: product.ratings.length,
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
  // write steps to add item to cart
  // 1. Validate request body for shopProductId, productPriceId, and quantity
  // 2. Check if product is active and price exists
  // 3. Check if cart item already exists for user
  // 4. If exists, update quantity; else create new cart item
  // 5. Return cart item details

  const { productId, priceId, quantity } = req.body;
  console.log(
    "productId:",
    productId,
    "priceId:",
    priceId,
    "quantity:",
    quantity
  );
  console.log("Adding to cart:", req.body.data);

  // Validate inputs
  if (!(productId || priceId || parseInt(quantity) < 0))
    throw new ApiError(400, "productId, priceId and quantity are required");

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const item = prisma.$transaction(async (tx) => {
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
  // write steps to get all cart items for the authenticated user
  // 1. Fetch cart items from the database for the user
  // 2. Include shopProduct and productPrice details
  // 3. Return cart items

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

  if (!cartItems) throw new ApiError(500, "Failed to fetch cart items");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart fetched successfully", { items }));
});

const updateCartItem = asyncHandler(async (req, res) => {
  // write steps to update cart item quantity
  // 1. Validate request params for itemId and body for quantity
  // 2. Check if cart item exists and belongs to user
  // 3. Update cart item quantity
  // 4. Return updated cart item details

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
  // write steps to remove cart item
  // 1. Validate request params for itemId
  // 2. Check if cart item exists and belongs to user
  // 3. Delete cart item
  // 4. Return success response

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
  // write steps to clear all cart items for the authenticated user
  // 1. Delete all cart items from the database for the user
  // 2. Return success response
  await prisma.cartItem.deleteMany({
    where: { userId: req.user?.id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart cleared successfully"));
});

/* ================================= Customer Order Controllers ============================ */

const createOrder = asyncHandler(async (req, res) => {
  // write steps to create order
  // 1. Validate request body for addressId and paymentMethod
  // 2. Verify address belongs to user
  // 3. Fetch cart items for user
  // 4. Calculate total amount and total products
  // 5. Create order with order items
  // 6. Clear user's cart
  // 7. Return order details

  const { addressId, orderItems, paymentMethod } = createOrderSchema.parse(
    req.body
  );

  // console.log(
  //   `Creating order for addressId: ${addressId} with items:`,
  //   orderItems
  // );

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
      const amount = p.prices[0].price;
      const quantity = orderItems.find(
        (item) =>
          Number(item.productId) === p.id &&
          Number(item.priceId) === p.prices[0].id
      )!.quantity;

      totalAmount += amount * quantity;

      return {
        productId: p.id,
        priceId: p.prices[0].id,
        quantity: quantity,
        price: p.prices[0].price,
        weight: p.prices[0].weight,
        unit: p.prices[0].unit,
      };
    });

    console.log("Total Items Amount:", totalAmount, "Items:", items);
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

/**
 * Get single order by ID
 * Request params: orderId
 * - Verify order belongs to user
 * - Return order with all items, address, and delivery boy details
 */
const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Find order
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

  // Security: Verify order belongs to user
  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order));
});

/**
 * Get all orders for user with pagination
 * Query params: page, limit
 * - Fetch paginated orders sorted by newest first
 * - Include order items, address, and delivery boy info
 */
const getOrders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Fetch orders with pagination
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

  // Get total count for pagination
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

/**
 * Track order status
 * Request params: orderId
 * - Get current order status
 * - Return delivery boy details if assigned
 * - Show order timeline information
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Find order
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

  // Security: Verify order belongs to user
  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  // Build tracking data
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

/**
 * Cancel order by customer
 * Request params: orderId
 * Request body: { reason }
 * - Only allow cancellation of pending or confirmed orders
 * - Update order status to cancelled
 * - Record reason and who cancelled
 */
const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Find order
  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Security: Verify order belongs to user
  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  // Check if order can be cancelled (only pending or confirmed)
  if (order.status !== "pending" && order.status !== "confirmed") {
    throw new ApiError(400, `Cannot cancel order with status: ${order.status}`);
  }

  // Cancel order
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
