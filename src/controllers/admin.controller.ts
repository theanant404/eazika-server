import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  globalProductSchema,
  globalProductsSchema,
} from "../validations/product.validation";
import * as fs from "fs";
import * as path from "path";

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

// Admin: analytics for a specific shop by id with optional date range
const getShopAnalyticsById = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  if (!shopId || Number.isNaN(Number(shopId))) {
    throw new ApiError(400, "Valid shopId is required");
  }

  // Optional date range filters (ISO strings expected)
  const startDateRaw = req.query.start as string | undefined;
  const endDateRaw = req.query.end as string | undefined;

  const dateFilter: any = {};
  if (startDateRaw) {
    const d = new Date(startDateRaw);
    if (isNaN(d.getTime())) throw new ApiError(400, "Invalid start date");
    dateFilter.gte = d;
  }
  if (endDateRaw) {
    const d = new Date(endDateRaw);
    if (isNaN(d.getTime())) throw new ApiError(400, "Invalid end date");
    // include entire end day by setting end to end-of-day
    d.setHours(23, 59, 59, 999);
    dateFilter.lte = d;
  }

  const timeWhere = Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {};

  // Validate shop exists
  const shop = await prisma.shopkeeper.findUnique({
    where: { id: Number(shopId) },
    select: {
      id: true,
      shopName: true,
      shopCategory: true,
      shopImage: true,
      isActive: true,
      status: true,
      address: {
        select: {
          line1: true,
          line2: true,
          city: true,
          state: true,
          pinCode: true,
          geoLocation: true,
        },
      },
    },
  });

  if (!shop) throw new ApiError(404, "Shop not found");

  const orderWhere = {
    orderItems: { some: { product: { shopkeeperId: Number(shopId) } } },
    ...timeWhere,
  } as const;

  const [totalOrders, activeOrders, deliveredAgg, orders, riders, customers] = await prisma.$transaction([
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
    prisma.order.findMany({
      where: orderWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
    // Get all riders who delivered for this shop
    prisma.deliveryBoy.findMany({
      where: {
        orders: {
          some: {
            ...orderWhere,
            status: "delivered",
          },
        },
      },
      distinct: ["id"],
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
        _count: { select: { orders: { where: { ...orderWhere, status: "delivered" } } } },
      },
    }),
    // Get all customers who ordered from this shop
    prisma.user.findMany({
      where: {
        orders: { some: orderWhere },
      },
      distinct: ["id"],
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        image: true,
        createdAt: true,
      },
    }),
  ]);

  // Build simple daily trend for graphs (orders count and delivered earnings per day)
  const trendMap: Record<string, { orders: number; earnings: number }> = {};
  orders.forEach((o) => {
    const dayKey = o.createdAt.toISOString().slice(0, 10); // yyyy-mm-dd
    if (!trendMap[dayKey]) trendMap[dayKey] = { orders: 0, earnings: 0 };
    trendMap[dayKey].orders += 1;
    if (o.status === "delivered") {
      trendMap[dayKey].earnings += o.totalAmount;
    }
  });

  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, v]) => ({ date, orders: v.orders, earnings: v.earnings }));

  // Format riders data
  const formattedRiders = riders.map((rider) => ({
    id: rider.id,
    name: rider.user.name,
    phone: rider.user.phone,
    email: rider.user.email,
    totalDeliveries: rider._count.orders,
  }));

  // Format customers data
  const formattedCustomers = customers.map((customer) => ({
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    image: customer.image,
    joinedAt: customer.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Shop analytics fetched", {
      shop: {
        id: shop.id,
        name: shop.shopName,
        category: shop.shopCategory,
        image: shop.shopImage?.[0] || null,
        status: shop.status,
        isActive: shop.isActive,
        location:
          shop.address
            ? `${shop.address.line1}${shop.address.line2 ? ", " + shop.address.line2 : ""}, ${shop.address.city}, ${shop.address.state}, ${shop.address.pinCode}`
            : null,
        geoLocation: shop.address?.geoLocation || null,
      },
      metrics: {
        totalOrders,
        totalActiveOrders: activeOrders,
        totalEarnings: deliveredAgg._sum.totalAmount || 0,
        totalRiders: riders.length,
        totalCustomers: customers.length,
      },
      orders,
      trend,
      riders: formattedRiders,
      customers: formattedCustomers,
    })
  );
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
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
          address: {
            where: { isDeleted: false },
            take: 1,
            select: {
              id: true,
              name: true,
              phone: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              pinCode: true,
              geoLocation: true,
            },
          },
        },
      },
      shopkeeper: {
        select: {
          shopName: true,
          address: {
            select: {
              id: true,
              name: true,
              phone: true,
              line1: true,
              line2: true,
              city: true,
              state: true,
              pinCode: true,
              geoLocation: true,
            },
          },
        },
      },
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
    shopName: rider.shopkeeper.shopName,
    address: (rider.user.address && rider.user.address[0])
      ? rider.user.address[0]
      : rider.shopkeeper.address,
    rating: 4.8 // Mock rating as it is not in schema yet
  }));

  res.status(200).json(new ApiResponse(200, "Riders fetched successfully", formattedRiders));
});



/* ################ Orders Management ################ */
const getDeliveredAnalytics = asyncHandler(async (req, res) => {
  const filter = ((req.query.filter as string) || "daily").toLowerCase();

  const now = new Date();
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (filter) {
    case "daily":
      // startDate already set to today 00:00
      break;
    case "weekly": {
      const currentDay = now.getDay(); // 0 (Sun) - 6 (Sat)
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "monthly": {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "yearly": {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    default:
      throw new ApiError(400, "Invalid filter. Use daily, weekly, monthly, or yearly");
  }

  const whereClause = {
    status: "delivered",
    createdAt: { gte: startDate },
  } as const;

  const [summary, deliveredOrders] = await prisma.$transaction([
    prisma.order.aggregate({
      where: whereClause,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
  ]);

  // Build daily buckets for graphing
  const trendMap: Record<string, { deliveredOrders: number; deliveredAmount: number }> = {};
  deliveredOrders.forEach((o) => {
    const dayKey = o.createdAt.toISOString().slice(0, 10); // yyyy-mm-dd
    if (!trendMap[dayKey]) trendMap[dayKey] = { deliveredOrders: 0, deliveredAmount: 0 };
    trendMap[dayKey].deliveredOrders += 1;
    trendMap[dayKey].deliveredAmount += o.totalAmount;
  });

  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, v]) => ({ date, deliveredOrders: v.deliveredOrders, deliveredAmount: v.deliveredAmount }));

  return res.status(200).json(
    new ApiResponse(200, "Delivered analytics fetched", {
      filter,
      startDate,
      endDate: now,
      metrics: {
        totalDeliveredOrders: summary._count?.id || 0,
        totalDeliveredAmount: summary._sum.totalAmount || 0,
      },
      trend,
    })
  );
});

// Rider-specific delivery analytics for graphing
const getRiderDeliveryAnalytics = asyncHandler(async (req, res) => {
  const { riderId } = req.params;
  if (!riderId || Number.isNaN(Number(riderId))) {
    throw new ApiError(400, "Valid riderId is required");
  }

  const filter = ((req.query.filter as string) || "weekly").toLowerCase();
  const now = new Date();
  let startDate: Date | undefined = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (filter) {
    case "daily":
      // startDate already set to today 00:00
      break;
    case "weekly": {
      const currentDay = now.getDay();
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
      startDate.setDate(diff);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "monthly": {
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "yearly": {
      startDate.setMonth(0, 1);
      startDate.setHours(0, 0, 0, 0);
      break;
    }
    case "all":
      startDate = undefined; // No date filter for all-time data
      break;
    default:
      throw new ApiError(400, "Invalid filter. Use daily, weekly, monthly, yearly, or all");
  }

  // Rider info with shop and address fallback
  const rider = await prisma.deliveryBoy.findUnique({
    where: { id: Number(riderId) },
    select: {
      id: true,
      isAvailable: true,
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
          address: {
            where: { isDeleted: false },
            take: 1,
            select: {
              line1: true,
              line2: true,
              city: true,
              state: true,
              pinCode: true,
              geoLocation: true,
            },
          },
        },
      },
      shopkeeper: {
        select: {
          shopName: true,
          address: {
            select: {
              line1: true,
              line2: true,
              city: true,
              state: true,
              pinCode: true,
              geoLocation: true,
            },
          },
        },
      },
    },
  });

  if (!rider) throw new ApiError(404, "Rider not found");

  const whereClause = {
    assignedDeliveryBoyId: Number(riderId),
    status: "delivered",
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
  } as const;

  const [summary, deliveredOrders] = await prisma.$transaction([
    prisma.order.aggregate({
      where: whereClause,
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
    prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        totalAmount: true,
        createdAt: true,
        riderAssignedAt: true,
        deliveredAt: true,
      },
    }),
  ]);

  // Build daily buckets for graphing
  const trendMap: Record<string, { deliveredOrders: number; deliveredAmount: number }> = {};
  deliveredOrders.forEach((o) => {
    const dayKey = o.createdAt.toISOString().slice(0, 10);
    if (!trendMap[dayKey]) trendMap[dayKey] = { deliveredOrders: 0, deliveredAmount: 0 };
    trendMap[dayKey].deliveredOrders += 1;
    trendMap[dayKey].deliveredAmount += o.totalAmount;
  });

  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([date, v]) => ({ date, deliveredOrders: v.deliveredOrders, deliveredAmount: v.deliveredAmount }));

  // Average delivery duration for this rider
  let durationSumMs = 0;
  let durationCount = 0;
  deliveredOrders.forEach((o) => {
    if (o.riderAssignedAt && o.deliveredAt) {
      durationSumMs += o.deliveredAt.getTime() - o.riderAssignedAt.getTime();
      durationCount += 1;
    }
  });
  const averageDeliveryDurationMinutes = durationCount
    ? Math.round((durationSumMs / durationCount / 1000 / 60) * 100) / 100
    : null;

  return res.status(200).json(
    new ApiResponse(200, "Rider delivery analytics fetched", {
      rider: {
        id: rider.id,
        name: rider.user.name,
        phone: rider.user.phone,
        email: rider.user.email,
        shopName: rider.shopkeeper.shopName,
        address: rider.user.address?.[0] || rider.shopkeeper.address || null,
      },
      filter,
      startDate: startDate || null,
      endDate: now,
      metrics: {
        totalDeliveredOrders: summary._count?.id || 0,
        totalDeliveredAmount: summary._sum.totalAmount || 0,
        averageDeliveryDurationMinutes,
      },
      trend,
    })
  );
});

// Get rider order history by rider ID
const getRiderOrderHistory = asyncHandler(async (req, res) => {
  const { riderId } = req.params;
  if (!riderId || Number.isNaN(Number(riderId))) {
    throw new ApiError(400, "Valid riderId is required");
  }

  // Verify rider exists
  const rider = await prisma.deliveryBoy.findUnique({
    where: { id: Number(riderId) },
    select: {
      id: true,
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      shopkeeper: {
        select: {
          shopName: true,
        },
      },
    },
  });

  if (!rider) throw new ApiError(404, "Rider not found");

  // Get order counts
  const [totalCompleted, totalCanceled, orders] = await prisma.$transaction([
    prisma.order.count({
      where: {
        assignedDeliveryBoyId: Number(riderId),
        status: "delivered",
      },
    }),
    prisma.order.count({
      where: {
        assignedDeliveryBoyId: Number(riderId),
        status: "cancelled",
      },
    }),
    prisma.order.findMany({
      where: {
        assignedDeliveryBoyId: Number(riderId),
        status: { in: ["delivered", "cancelled"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        totalAmount: true,
        status: true,
        createdAt: true,
        deliveredAt: true,
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        address: {
          select: {
            line1: true,
            city: true,
          },
        },
      },
    }),
  ]);

  const formattedOrders = orders.map((order) => ({
    orderId: order.id,
    amount: order.totalAmount,
    status: order.status,
    dateTime: order.createdAt,
    deliveredAt: order.deliveredAt || null,
    customer: {
      name: order.user.name,
      phone: order.user.phone,
    },
    deliveryAddress: order.address
      ? `${order.address.line1}, ${order.address.city}`
      : null,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Rider order history fetched successfully", {
      rider: {
        id: rider.id,
        name: rider.user.name,
        phone: rider.user.phone,
        email: rider.user.email,
        shopName: rider.shopkeeper.shopName,
      },
      summary: {
        totalCompletedOrders: totalCompleted,
        totalCanceledOrders: totalCanceled,
        totalOrders: totalCompleted + totalCanceled,
      },
      orders: formattedOrders,
    })
  );
});

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

// Upload products from JSON file (eaz_products.json) one by one
const uploadProductsFromJson = asyncHandler(async (req, res) => {
  console.log("Starting upload of products from JSON file...");
  try {
    // Read the JSON file from project root
    const jsonFilePath = path.join(process.cwd(), "eaz_products.json");

    if (!fs.existsSync(jsonFilePath)) {
      throw new ApiError(404, "eaz_products.json file not found in project root");
    }

    // Read and parse JSON file
    const fileContent = fs.readFileSync(jsonFilePath, "utf-8");
    const productsFromJson = JSON.parse(fileContent);

    if (!Array.isArray(productsFromJson)) {
      throw new ApiError(400, "JSON file must contain an array of products");
    }

    let successCount = 0;
    let failedCount = 0;
    const errors: any[] = [];

    // Process products one by one
    for (const product of productsFromJson) {
      try {
        // Validate required fields
        if (!product.name) {
          failedCount++;
          errors.push({
            product: product.name || "Unknown",
            error: "Product name is required",
          });
          continue;
        }

        // Get category ID from JSON (catogery field)
        const categoryId = product.productCategoryId ? Number(product.productCategoryId) : null;

        // Check if category exists
        if (categoryId) {
          const categoryExists = await prisma.productCategory.findUnique({
            where: { id: categoryId },
          });

          if (!categoryExists) {
            failedCount++;
            errors.push({
              product: product.name,
              error: `Category with ID ${categoryId} does not exist`,
            });
            continue;
          }
        }

        // Create product in database
        const createdProduct = await prisma.globalProduct.create({
          data: {
            name: product.name,
            brand: product.brand || null,
            description: product.description || null,
            images: product.images || [],
            productCategoryId: categoryId!,
            isActive: true,
          },
        });

        successCount++;
      } catch (error: any) {
        failedCount++;
        errors.push({
          product: product.name || "Unknown",
          error: error.message || "Unknown error",
        });
      }
    }
    console.log(`Upload completed: ${successCount} succeeded, ${failedCount} failed.`);
    // Return response with summary
    return res.status(200).json(
      new ApiResponse(200, "Products uploaded from JSON file", {
        summary: {
          totalProducts: productsFromJson.length,
          successfullyCreated: successCount,
          failed: failedCount,
        },
        errors: errors.length > 0 ? errors : null,
        message:
          failedCount === 0
            ? `All ${successCount} products uploaded successfully!`
            : `${successCount} products created, ${failedCount} failed`,
      })
    );
  } catch (error: any) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, error.message || "Failed to upload products from JSON");
  }
});

// Get active shops and active orders locations for live tracking
const getActiveLocations = asyncHandler(async (req, res) => {
  const [activeShops, activeOrders] = await prisma.$transaction([
    // Get all active shops with geo location
    prisma.shopkeeper.findMany({
      where: {
        isActive: true,
        status: "approved",
        address: {
          geoLocation: { not: null },
        },
      },
      select: {
        id: true,
        shopName: true,
        shopCategory: true,
        address: {
          select: {
            geoLocation: true,
          },
        },
      },
    }),
    // Get all active orders (not delivered/cancelled) with user location
    prisma.order.findMany({
      where: {
        status: { notIn: ["delivered", "cancelled"] },
        address: {
          geoLocation: { not: null },
        },
      },
      select: {
        id: true,
        status: true,
        user: {
          select: {
            id: true,
            name: true,
          },
        },
        address: {
          select: {
            geoLocation: true,
          },
        },
      },
    }),
  ]);

  // Format shops data
  const formattedShops = activeShops.map((shop) => {
    const coords = shop.address!.geoLocation!.split(",");
    return {
      id: shop.id,
      name: shop.shopName,
      category: shop.shopCategory,
      geoLocation: shop.address!.geoLocation,
      latitude: parseFloat(coords[0]?.trim() || "0"),
      longitude: parseFloat(coords[1]?.trim() || "0"),
      type: "shop",
    };
  });

  // Format active orders data
  const formattedOrders = activeOrders.map((order) => {
    const coords = order.address!.geoLocation!.split(",");
    return {
      orderId: order.id,
      userId: order.user.id,
      userName: order.user.name,
      orderStatus: order.status,
      geoLocation: order.address!.geoLocation,
      latitude: parseFloat(coords[0]?.trim() || "0"),
      longitude: parseFloat(coords[1]?.trim() || "0"),
      type: "order",
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Active locations fetched successfully", {
      shops: formattedShops,
      orders: formattedOrders,
      summary: {
        totalActiveShops: formattedShops.length,
        totalActiveOrders: formattedOrders.length,
      },
    })
  );
});

export {
  getDashboardStats,
  getAllUsers,
  getAllShops,
  getShopsDetails,
  getAllShopAddresses,
  getShopAnalyticsById,
  verifyShop,
  toggleShopStatus,
  getAllRiders,
  getAllOrders,
  createProductCategory,
  getAllProductCategories,
  createGlobalProduct,
  createGlobalProductsBulk,
  uploadProductsFromJson,
  getLiveMapData,
  getDeliveredAnalytics,
  getRiderDeliveryAnalytics,
  getRiderOrderHistory,
  getActiveLocations,
  getAllGlobalProducts,
  getAllShopProducts,
  getGlobalProductById,
  updateGlobalProduct,
  toggleGlobalProductStatus,
  toggleShopProductStatus,
  updateProductCategory,
  getShopsPendingVerification,
  getSearchTrackingAnalytics,
  getSearchTrackingList,
  deleteSearchTracking,
  deleteAllSearchTracking,
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
  // console.log(productId)
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

/* ################ Search Tracking Analytics ################ */
const getSearchTrackingAnalytics = asyncHandler(async (req, res) => {
  // Get analytics about search behavior
  const totalSearches = await prisma.searchTracking.count();

  const uniqueSearchQueries = await prisma.searchTracking.findMany({
    select: { searchQuery: true },
    distinct: ["searchQuery"],
  });

  const topSearches = await prisma.searchTracking.groupBy({
    by: ["searchQuery"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  const topSelectedProducts = await prisma.searchTracking.groupBy({
    by: ["selectedProductId"],
    _count: { id: true },
    where: { selectedProductId: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  const searchesByLocation = await prisma.searchTracking.groupBy({
    by: ["location"],
    _count: { id: true },
    where: { location: { not: null } },
    orderBy: { _count: { id: "desc" } },
  });

  const avgResultsPerSearch = await prisma.searchTracking.aggregate({
    _avg: { resultsCount: true },
  });

  const recentSearches = await prisma.searchTracking.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true, phone: true } } },
  });

  return res.status(200).json(
    new ApiResponse(200, "Search tracking analytics fetched", {
      totalSearches,
      uniqueSearchQueries: uniqueSearchQueries.length,
      topSearches,
      topSelectedProducts,
      searchesByLocation,
      averageResultsPerSearch: avgResultsPerSearch._avg.resultsCount || 0,
      recentSearches,
    })
  );
});

const getSearchTrackingList = asyncHandler(async (req, res) => {
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "20");
  const searchQuery = (req.query.search as string) || "";
  const skip = (page - 1) * limit;

  const whereClause: any = {};
  if (searchQuery) {
    whereClause.searchQuery = { contains: searchQuery, mode: "insensitive" };
  }

  const [searches, totalCount] = await prisma.$transaction([
    prisma.searchTracking.findMany({
      where: whereClause,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.searchTracking.count({ where: whereClause }),
  ]);

  return res.status(200).json(
    new ApiResponse(200, "Search tracking list fetched", {
      searches,
      pagination: {
        currentPage: page,
        itemsPerPage: limit,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  );
});

const deleteSearchTracking = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const searchTracking = await prisma.searchTracking.findUnique({
    where: { id: Number(id) },
  });

  if (!searchTracking) {
    throw new ApiError(404, "Search tracking record not found");
  }

  await prisma.searchTracking.delete({
    where: { id: Number(id) },
  });

  return res.status(200).json(
    new ApiResponse(200, "Search tracking record deleted successfully", null)
  );
});

const deleteAllSearchTracking = asyncHandler(async (req, res) => {
  const result = await prisma.searchTracking.deleteMany({});

  return res.status(200).json(
    new ApiResponse(
      200,
      `${result.count} search tracking records deleted successfully`,
      { deletedCount: result.count }
    )
  );
});
