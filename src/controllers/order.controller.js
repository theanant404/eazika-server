import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Generate unique order number
function generateOrderNumber() {
  return `EZ${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
}

// Create order from cart
export const createOrder = asyncHandler(async (req, res) => {
  const { deliveryAddressId, paymentMethod, notes } = req.body;

  // Get customer's cart
  const cartItems = await prisma.cartItem.findMany({
    where: { customerId: req.user.id },
    include: {
      shopProduct: {
        include: {
          globalProduct: true,
          shop: true
        }
      }
    }
  });

  if (cartItems.length === 0) {
    throw new ApiError(400, "Cart is empty");
  }

  // Verify delivery address belongs to customer
  const deliveryAddress = await prisma.address.findFirst({
    where: {
      id: deliveryAddressId,
      userId: req.user.id
    }
  });

  if (!deliveryAddress) {
    throw new ApiError(404, "Delivery address not found");
  }

  // Group cart items by shop
  const shopGroups = {};
  cartItems.forEach(item => {
    const shopId = item.shopProduct.shopId;
    if (!shopGroups[shopId]) {
      shopGroups[shopId] = {
        shop: item.shopProduct.shop,
        items: []
      };
    }
    shopGroups[shopId].items.push(item);
  });

  // Create separate order for each shop
  const orders = [];

  for (const shopId in shopGroups) {
    const shopGroup = shopGroups[shopId];
    
    // Calculate order totals
    let subtotal = 0;
    const orderItems = [];

    // Validate stock and prepare order items
    for (const cartItem of shopGroup.items) {
      const product = cartItem.shopProduct;
      
      // Final stock validation
      if (product.stockQuantity < cartItem.quantity) {
        throw new ApiError(400, `${product.globalProduct.name} is out of stock`);
      }

      if (!product.isActive || !product.shop.isActive) {
        throw new ApiError(400, `${product.globalProduct.name} is currently unavailable`);
      }

      const itemTotal = parseFloat(product.price) * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        shopProductId: product.id,
        quantity: cartItem.quantity,
        unitPrice: product.price,
        totalPrice: itemTotal,
        snapshot: {
          productName: product.globalProduct.name,
          productBrand: product.globalProduct.brand,
          productImage: product.globalProduct.images[0] || null,
          originalPrice: product.price,
          discountPercent: product.discountPercent,
          isReturnable: product.isReturnable,
          returnPeriodDays: product.returnPeriodDays
        }
      });
    }

    const deliveryFee = 20; // Fixed delivery fee for now
    const totalAmount = subtotal + deliveryFee;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          customerId: req.user.id,
          shopId: shopId,
          status: 'PENDING',
          statusHistory: [{
            status: 'PENDING',
            changedAt: new Date().toISOString(),
            by: req.user.id,
            notes: 'Order placed'
          }],
          pricing: {
            subtotal,
            deliveryFee,
            totalAmount,
            currency: 'INR'
          },
          payment: {
            method: paymentMethod,
            status: paymentMethod === 'COD' ? 'PENDING' : 'PAID',
            paymentId: null
          },
          deliveryInfo: {
            address: {
              ...deliveryAddress,
              label: deliveryAddress.label
            },
            notes: notes || null,
            estimatedDelivery: null
          }
        }
      });

      // Create order items and reduce stock
      for (const itemData of orderItems) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            ...itemData
          }
        });

        // Reduce product stock
        await tx.shopProduct.update({
          where: { id: itemData.shopProductId },
          data: {
            stockQuantity: {
              decrement: itemData.quantity
            }
          }
        });
      }

      // Remove items from cart
      await tx.cartItem.deleteMany({
        where: {
          customerId: req.user.id,
          shopProductId: {
            in: shopGroup.items.map(item => item.shopProductId)
          }
        }
      });

      return newOrder;
    });

    orders.push(order);
  }

  res.json(new ApiResponse(201,  orders, "Order created successfully"));
});

// Get customer orders
export const getCustomerOrders = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;

  const where = { customerId: req.user.id };
  
  if (status) {
    where.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            contact: true
          }
        },
        orderItems: {
          include: {
            shopProduct: {
              include: {
                globalProduct: true
              }
            }
          }
        }
      },
      take: parseInt(limit),
      skip,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.order.count({ where })
  ]);

  res.json(new ApiResponse(200,  {
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, "Orders retrieved successfully"));
});

// Get order details
export const getOrderDetails = asyncHandler(async (req, res) => {
  const order = req.order;

  res.json(new ApiResponse(200, order, "Order details retrieved successfully"));
});

// Cancel order
export const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = req.order;

  // Check if order can be cancelled
  if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
    throw new ApiError(400, "Order cannot be cancelled at this stage");
  }

  // Update order status and restore stock
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update order
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason || 'Cancelled by customer',
        statusHistory: [
          ...order.statusHistory,
          {
            status: 'CANCELLED',
            changedAt: new Date().toISOString(),
            by: req.user.id,
            notes: reason || 'Cancelled by customer'
          }
        ]
      }
    });

    // Restore stock
    for (const item of order.orderItems) {
      await tx.shopProduct.update({
        where: { id: item.shopProductId },
        data: {
          stockQuantity: {
            increment: item.quantity
          }
        }
      });
    }

    return updated;
  });

  res.json(new ApiResponse(200, updatedOrder, "Order cancelled successfully"));
});

// Rate order
export const rateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, review } = req.body;

  const order = req.order;

  if (order.status !== 'DELIVERED') {
    throw new ApiError(400, "Order must be delivered before rating");
  }

  // Check if already rated
  const existingRating = await prisma.orderRating.findFirst({
    where: {
      orderId: id,
      customerId: req.user.id
    }
  });

  if (existingRating) {
    throw new ApiError(400, "Order has already been rated");
  }

  const orderRating = await prisma.orderRating.create({
    data: {
      orderId: id,
      customerId: req.user.id,
      rating,
      review: review || null
    }
  });

  // Update order with rating
  await prisma.order.update({
    where: { id },
    data: { rating }
  });

  res.json(new ApiResponse(201, orderRating, "Order rated successfully"));
});
