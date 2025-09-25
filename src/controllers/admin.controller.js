import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

/* ----------  DASHBOARD METRICS  ---------- */
export const getAdminDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    totalUsers,
    newUsersThisMonth,
    totalShops,
    activeShops,
    pendingShops,
    totalOrders,
    ordersThisMonth,
    totalReviews,
    pendingReturns
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.shop.count(),
    prisma.shop.count({ where: { isActive: true } }),
    prisma.shop.count({ where: { isActive: false } }),
    prisma.order.count(),
    prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
    prisma.productReview.count(),
    prisma.returnRequest.count({ where: { status: 'REQUESTED' } })
  ]);

  // Calculate revenue manually from delivered orders
  const deliveredOrders = await prisma.order.findMany({
    where: { status: 'DELIVERED' },
    select: { pricing: true, createdAt: true }
  });

  const totalRevenue = deliveredOrders.reduce((sum, order) => {
    const amount = typeof order.pricing === 'object' ? order.pricing?.totalAmount || 0 : 0;
    return sum + parseFloat(amount);
  }, 0);

  const revenueThisMonth = deliveredOrders
    .filter(order => new Date(order.createdAt) >= thisMonth)
    .reduce((sum, order) => {
      const amount = typeof order.pricing === 'object' ? order.pricing?.totalAmount || 0 : 0;
      return sum + parseFloat(amount);
    }, 0);

  // FIXED: Correct parameter order (statusCode, data, message)
  res.json(new ApiResponse(200, {
    users: {
      total: totalUsers,
      newThisMonth: newUsersThisMonth
    },
    shops: {
      total: totalShops,
      active: activeShops,
      pending: pendingShops
    },
    orders: {
      total: totalOrders,
      thisMonth: ordersThisMonth
    },
    revenue: {
      total: totalRevenue,
      thisMonth: revenueThisMonth
    },
    reviews: {
      total: totalReviews
    },
    returns: {
      pending: pendingReturns
    }
  }, 'Admin dashboard metrics'));
});

/* ----------  USER MANAGEMENT  ---------- */
export const listUsers = asyncHandler(async (req, res) => {
  const { role, search, page = 1, limit = 20 } = req.query;
  
  const where = {};
  if (role) where.role = role;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.count({ where })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'Users retrieved'));
});

export const getUserDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      orders: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      },
      productReviews: {
        take: 5,
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, user, 'User details'));
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: { isActive: Boolean(isActive) }
  });

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, user, `User ${isActive ? 'activated' : 'deactivated'}`));
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  if (!['CUSTOMER', 'SHOPKEEPER', 'DELIVERY_BOY', 'ADMIN'].includes(role)) {
    throw new ApiError(400, 'Invalid role');
  }

  const user = await prisma.user.update({
    where: { id },
    data: { role }
  });

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, user, 'User role updated'));
});

/* ----------  SHOP MANAGEMENT  ---------- */
export const listShops = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  
  const where = {};
  if (status === 'active') where.isActive = true;
  if (status === 'pending') where.isActive = false;
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [shops, total] = await Promise.all([
    prisma.shop.findMany({
      where,
      include: {
        owner: {
          select: { name: true, email: true, phone: true }
        },
        _count: {
          select: {
            products: true,
            orders: true
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.shop.count({ where })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    shops,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'Shops retrieved'));
});

export const getShopDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const shop = await prisma.shop.findUnique({
    where: { id },
    include: {
      owner: {
        select: { name: true, email: true, phone: true }
      },
      products: {
        take: 10,
        include: {
          globalProduct: {
            select: { name: true, images: true }
          }
        }
      },
      orders: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: {
            select: { name: true }
          }
        }
      }
    }
  });

  if (!shop) {
    throw new ApiError(404, 'Shop not found');
  }

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, shop, 'Shop details'));
});

export const approveShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const shop = await prisma.shop.update({
    where: { id },
    data: { 
      isActive: true
    }
  });

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, shop, 'Shop approved'));
});

export const rejectShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  
  const shop = await prisma.shop.update({
    where: { id },
    data: { 
      isActive: false
    }
  });

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, shop, 'Shop rejected'));
});

/* ----------  ORDER MANAGEMENT  ---------- */
export const listOrders = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;
  
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.orderNumber = { contains: search, mode: 'insensitive' };
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: {
        customer: {
          select: { name: true, email: true }
        },
        shop: {
          select: { name: true }
        },
        deliveryBoy: {
          select: { name: true, phone: true }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.order.count({ where })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    orders,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'Orders retrieved'));
});

export const getOrderDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      shop: true,
      deliveryBoy: true,
      orderItems: {
        include: {
          shopProduct: {
            include: {
              globalProduct: true
            }
          }
        }
      }
    }
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, order, 'Order details'));
});

/* ----------  RETURN MANAGEMENT  ---------- */
export const listReturns = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  
  const where = status ? { status } : {};

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [returns, total] = await Promise.all([
    prisma.returnRequest.findMany({
      where,
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                customer: {
                  select: { name: true, email: true }
                }
              }
            },
            shopProduct: {
              include: {
                globalProduct: {
                  select: { name: true }
                }
              }
            }
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.returnRequest.count({ where })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    returns,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'Returns retrieved'));
});

/* ----------  REVIEW MANAGEMENT  ---------- */
export const listReviews = asyncHandler(async (req, res) => {
  const { isHidden, page = 1, limit = 20 } = req.query;
  
  const where = {};
  if (isHidden !== undefined) where.isHidden = Boolean(isHidden);

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      include: {
        customer: {
          select: { name: true, email: true }
        },
        shopProduct: {
          include: {
            globalProduct: {
              select: { name: true }
            }
          }
        }
      },
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' }
    }),
    prisma.productReview.count({ where })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }, 'Reviews retrieved'));
});

/* ----------  ANALYTICS  ---------- */
export const getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30' } = req.query;
  const days = parseInt(period);
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [
    orderTrends,
    topShops,
    topProducts,
    userRegistrations
  ] = await Promise.all([
    prisma.order.groupBy({
      by: ['status'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    }),
    prisma.shop.findMany({
      take: 10,
      orderBy: { totalReviews: 'desc' },
      select: {
        id: true,
        name: true,
        avgRating: true,
        totalReviews: true,
        _count: { select: { orders: true } }
      }
    }),
    prisma.shopProduct.findMany({
      take: 10,
      orderBy: { totalReviews: 'desc' },
      include: {
        globalProduct: {
          select: { name: true }
        }
      }
    }),
    prisma.user.groupBy({
      by: ['role'],
      where: { createdAt: { gte: startDate } },
      _count: { id: true }
    })
  ]);

  // FIXED: Correct parameter order
  res.json(new ApiResponse(200, {
    orderTrends,
    topShops,
    topProducts,
    userRegistrations,
    period: `${days} days`
  }, 'Analytics data'));
});
