import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";

/* -------Customer Cart Controllers-------- */

/**
 * Add items to cart
 * Request body: { shopProductId, productPriceId, quantity }
 * - Check if item already exists in cart
 * - If yes, update quantity; if no, create new cart item
 * - Validate product is active and price exists
 */
const addToCart = asyncHandler(async (req, res) => {
  const { shopProductId, productPriceId, quantity } = req.body;

  // Validate inputs
  if (!shopProductId || !productPriceId || quantity === undefined || quantity < 1) {
    throw new ApiError(400, "shopProductId, productPriceId, and quantity (>0) are required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Verify shop product exists and is active
  const shopProduct = await prisma.shopProduct.findUnique({
    where: { id: shopProductId },
  });

  if (!shopProduct || !shopProduct.isActive) {
    throw new ApiError(404, "Product not found or inactive");
  }

  // Verify product price exists
  const productPrice = await prisma.productPrice.findUnique({
    where: { id: productPriceId },
  });

  if (!productPrice) {
    throw new ApiError(404, "Product price not found");
  }

  // Check if item already exists in cart
  const existingCartItem = await prisma.cartItem.findFirst({
    where: {
      userId: req.user.id,
      shopProductId,
      productPriceId,
    },
  });

  let cartItem;
  if (existingCartItem) {
    // Update quantity if already exists
    cartItem = await prisma.cartItem.update({
      where: { id: existingCartItem.id },
      data: { quantity: existingCartItem.quantity + quantity },
      include: {
        productPrice: true,
        shopProduct: true,
      },
    });
  } else {
    // Create new cart item
    cartItem = await prisma.cartItem.create({
      data: {
        userId: req.user.id,
        shopProductId,
        productPriceId,
        quantity,
      },
      include: {
        productPrice: true,
        shopProduct: true,
      },
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, "Item added to cart successfully", cartItem));
});

/**
 * Get all cart items for user
 * Returns: Array of cart items with product and price details
 * - Calculate total price: (price - discount) * quantity for each item
 * - Calculate total quantity across all items
 */
const getCart = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: {
      shopProduct: {
        include: {
          shopkeeper: true,
        },
      },
      productPrice: true,
    },
  });

  if (!cartItems || cartItems.length === 0) {
    return res.status(200).json(
      new ApiResponse(200, "Cart is empty", {
        items: [],
        totalItems: 0,
        totalPrice: 0,
      })
    );
  }

  // Calculate totals
  let totalPrice = 0;
  let totalItems = 0;

  for (const item of cartItems) {
    if (item.productPrice) {
      const itemPrice = item.productPrice.price - item.productPrice.discount;
      totalPrice += itemPrice * item.quantity;
    }
    totalItems += item.quantity;
  }

  return res.status(200).json(
    new ApiResponse(200, "Cart fetched successfully", {
      items: cartItems,
      totalItems,
      totalPrice,
    })
  );
});

/**
 * Update cart item quantity
 * Request params: itemId (CartItem.id)
 * Request body: { quantity }
 * - Validate cart item belongs to user
 * - Update quantity to new value
 */
const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  // Validate inputs
  if (!itemId || quantity === undefined || quantity < 1) {
    throw new ApiError(400, "itemId and quantity (>0) are required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Find cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: parseInt(itemId) },
  });

  if (!cartItem) {
    throw new ApiError(404, "Cart item not found");
  }

  // Security: Verify cart item belongs to user
  if (cartItem.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Cart item doesn't belong to user");
  }

  // Update cart item quantity
  const updatedCartItem = await prisma.cartItem.update({
    where: { id: cartItem.id },
    data: { quantity },
    include: {
      productPrice: true,
      shopProduct: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart item updated successfully", updatedCartItem));
});

/**
 * Remove item from cart
 * Request params: itemId (CartItem.id)
 * - Delete cart item if it belongs to user
 */
const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  if (!itemId) {
    throw new ApiError(400, "itemId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Find cart item
  const cartItem = await prisma.cartItem.findUnique({
    where: { id: parseInt(itemId) },
  });

  if (!cartItem) {
    throw new ApiError(404, "Cart item not found");
  }

  // Security: Verify cart item belongs to user
  if (cartItem.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Cart item doesn't belong to user");
  }

  // Delete cart item
  await prisma.cartItem.delete({
    where: { id: cartItem.id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Item removed from cart successfully"));
});

/**
 * Clear entire cart for user
 * - Delete all cart items for authenticated user
 */
const clearCart = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  await prisma.cartItem.deleteMany({
    where: { userId: req.user.id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart cleared successfully"));
});

/* -------Customer Order Controllers-------- */

/**
 * Create order from cart
 * Request body: { addressId, paymentMethod }
 * Steps:
 * 1. Validate address belongs to user
 * 2. Fetch user's cart items
 * 3. Calculate total amount and total products
 * 4. Create order with order items
 * 5. Clear user's cart
 * 6. Return order with details
 */
const createOrder = asyncHandler(async (req, res) => {
  const { addressId, paymentMethod } = req.body;

  // Validate inputs
  if (!addressId || !paymentMethod) {
    throw new ApiError(400, "addressId and paymentMethod are required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Verify address belongs to user
  const address = await prisma.address.findUnique({
    where: { id: parseInt(addressId) },
  });

  if (!address || address.userId !== req.user.id) {
    throw new ApiError(404, "Address not found or doesn't belong to user");
  }

  // Fetch cart items
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { productPrice: true },
  });

  if (!cartItems || cartItems.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Calculate totals
  let totalAmount = 0;
  let totalProducts = 0;

  for (const item of cartItems) {
    if (item.productPrice) {
      const itemPrice = item.productPrice.price - item.productPrice.discount;
      totalAmount += itemPrice * item.quantity;
    }
    totalProducts += item.quantity;
  }

  // Create order with order items
  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      addressId: parseInt(addressId),
      paymentMethod,
      totalAmount,
      totalProducts,
      orderItems: {
        create: cartItems.map((item: any) => ({
          shopProductId: item.shopProductId,
          productPriceId: item.productPriceId,
          quantity: item.quantity,
        })),
      },
    },
    include: {
      orderItems: {
        include: {
          productPrice: true,
          shopProduct: true,
        },
      },
      address: true,
    },
  });

  // Clear cart after successful order creation
  await prisma.cartItem.deleteMany({
    where: { userId: req.user.id },
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
          productPrice: true,
          shopProduct: true,
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
          productPrice: true,
          shopProduct: true,
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
          productPrice: true,
          shopProduct: true,
        },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Order cancelled successfully", cancelledOrder));
});

export {
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