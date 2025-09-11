import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Get orders for shopkeeper's shops
export const getShopOrders = asyncHandler(async (req, res) => {
  const { status, shopId, page = 1, limit = 10 } = req.query;

  const where = {
    shop: {
      ownerId: req.user.id
    }
  };

  if (status) {
    where.status = status;
  }

  if (shopId) {
    where.shopId = shopId;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        shop: {
          select: {
            id: true,
            name: true
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

  res.json(new ApiResponse(200, "Shop orders retrieved successfully", {
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Accept order
export const acceptOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { estimatedPreparationTime, notes } = req.body;

  const order = req.order;

  if (order.status !== 'PENDING') {
    throw new ApiError(400, "Order cannot be accepted at this stage");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: 'CONFIRMED',
      statusHistory: [
        ...order.statusHistory,
        {
          status: 'CONFIRMED',
          changedAt: new Date().toISOString(),
          by: req.user.id,
          notes: notes || 'Order accepted by shop'
        }
      ],
      deliveryInfo: {
        ...order.deliveryInfo,
        estimatedPreparationTime: estimatedPreparationTime || 30,
        shopNotes: notes
      }
    }
  });

  res.json(new ApiResponse(200, "Order accepted successfully", updatedOrder));
});

// Reject order
export const rejectOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const order = req.order;

  if (order.status !== 'PENDING') {
    throw new ApiError(400, "Order cannot be rejected at this stage");
  }

  // Update order and restore stock
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update order
    const updated = await tx.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: reason || 'Rejected by shop',
        statusHistory: [
          ...order.statusHistory,
          {
            status: 'CANCELLED',
            changedAt: new Date().toISOString(),
            by: req.user.id,
            notes: reason || 'Rejected by shop'
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

  res.json(new ApiResponse(200, "Order rejected successfully", updatedOrder));
});

// Mark order as ready for pickup
export const markOrderReady = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;

  const order = req.order;

  if (order.status !== 'CONFIRMED') {
    throw new ApiError(400, "Order must be confirmed before marking ready");
  }

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: 'READY_FOR_PICKUP',
      statusHistory: [
        ...order.statusHistory,
        {
          status: 'READY_FOR_PICKUP',
          changedAt: new Date().toISOString(),
          by: req.user.id,
          notes: notes || 'Order ready for pickup'
        }
      ]
    }
  });

  res.json(new ApiResponse(200, "Order marked as ready", updatedOrder));
});

// Get order statistics for shop
export const getOrderStats = asyncHandler(async (req, res) => {
  const { shopId, period = '30d' } = req.query;

  const where = {
    shop: {
      ownerId: req.user.id
    }
  };

  if (shopId) {
    where.shopId = shopId;
  }

  // Calculate date range based on period
  const now = new Date();
  let startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    case '3m':
      startDate.setMonth(now.getMonth() - 3);
      break;
    default:
      startDate.setDate(now.getDate() - 30);
  }

  where.createdAt = {
    gte: startDate
  };

  // Get order statistics
  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    deliveredOrders,
    cancelledOrders,
    revenueData
  ] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.count({ where: { ...where, status: 'PENDING' } }),
    prisma.order.count({ where: { ...where, status: 'CONFIRMED' } }),
    prisma.order.count({ where: { ...where, status: 'DELIVERED' } }),
    prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
    prisma.order.findMany({
      where: {
        ...where,
        status: 'DELIVERED'
      },
      select: {
        pricing: true,
        createdAt: true
      }
    })
  ]);

  const totalRevenue = revenueData.reduce((sum, order) => {
    return sum + (order.pricing.totalAmount || 0);
  }, 0);

  const stats = {
    overview: {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / deliveredOrders : 0
    },
    period: {
      label: period,
      startDate,
      endDate: now
    }
  };

  res.json(new ApiResponse(200, "Order statistics retrieved successfully", stats));
});
