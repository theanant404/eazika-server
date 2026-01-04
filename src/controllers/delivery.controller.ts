import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";

/**
 * Create delivery boy profile
 * Request body: {
 *   aadharNumber (required),
 *   panNumber (optional),
 *   licenseNumber (required),
 *   licenseImages (array, required),
 *   vehicleOwnerName (required),
 *   vehicleName (optional),
 *   vehicleNo (required),
 *   shopkeeperId (required)
 * }
 * Steps:
 * 1. Validate all required fields
 * 2. Check uniqueness of aadhar, license, vehicle number
 * 3. Verify shopkeeper exists
 * 4. Create delivery boy profile
 * 5. Update user role to delivery_boy
 */
const createDeliveryProfile = asyncHandler(async (req, res) => {
  const {
    aadharNumber,
    panNumber,
    licenseNumber,
    licenseImages,
    vehicleOwnerName,
    vehicleName,
    vehicleNo,
    shopkeeperId,
  } = req.body;

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Validate required fields
  if (
    !aadharNumber ||
    !licenseNumber ||
    !licenseImages ||
    !Array.isArray(licenseImages) ||
    licenseImages.length === 0 ||
    !vehicleOwnerName ||
    !vehicleNo ||
    !shopkeeperId
  ) {
    throw new ApiError(400, "All required fields must be provided");
  }

  // Check if delivery profile already exists for user
  const existingDeliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (existingDeliveryBoy) {
    throw new ApiError(400, "Delivery profile already exists for this user");
  }

  // Check aadhar uniqueness
  const aadharExists = await prisma.deliveryBoy.findUnique({
    where: { aadharNumber },
  });
  if (aadharExists) {
    throw new ApiError(400, "Aadhar number already registered");
  }

  // Check license uniqueness
  const licenseExists = await prisma.deliveryBoy.findUnique({
    where: { licenseNumber },
  });
  if (licenseExists) {
    throw new ApiError(400, "License number already registered");
  }

  // Check vehicle number uniqueness
  const vehicleExists = await prisma.deliveryBoy.findUnique({
    where: { vehicleNo },
  });
  if (vehicleExists) {
    throw new ApiError(400, "Vehicle number already registered");
  }

  // Verify shopkeeper exists
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { id: shopkeeperId },
  });
  if (!shopkeeper) {
    throw new ApiError(404, "Shopkeeper not found");
  }

  // Create delivery boy profile
  const deliveryBoy = await prisma.deliveryBoy.create({
    data: {
      userId: req.user.id,
      aadharNumber,
      panNumber: panNumber || null,
      licenseNumber,
      licenseImage: licenseImages,
      vehicleOwnerName,
      vehicleName: vehicleName || null,
      vehicleNo,
      shopkeeperId,
    },
    include: {
      user: true,
      shopkeeper: true,
    },
  });

  // Update user role
  await prisma.user.update({
    where: { id: req.user.id },
    data: { role: "delivery_boy" },
  });

  return res
    .status(201)
    .json(
      new ApiResponse(201, "Delivery profile created successfully", deliveryBoy)
    );
});

/**
 * Update delivery boy profile
 * Request body: {
 *   panNumber (optional),
 *   vehicleName (optional),
 *   vehicleNo (optional),
 *   licenseImages (optional)
 * }
 * - Delivery boy can update their own profile after accepting shopkeeper invite
 * - Check uniqueness for panNumber and vehicleNo if provided
 * - Requires isDeliveryBoy middleware authorization
 */
const updateDeliveryProfile = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { panNumber, vehicleName, vehicleNo, licenseImages } = req.body;

  // Find delivery boy profile
  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (!deliveryBoy) {
    throw new ApiError(404, "Delivery profile not found");
  }

  // Prepare update data
  const updateData: any = {};

  // Validate and update panNumber if provided
  if (panNumber !== undefined && panNumber !== null) {
    if (panNumber && panNumber !== deliveryBoy.panNumber) {
      const panExists = await prisma.deliveryBoy.findUnique({
        where: { panNumber },
      });
      if (panExists) {
        throw new ApiError(400, "PAN number already registered");
      }
    }
    updateData.panNumber = panNumber;
  }

  // Update vehicleName if provided
  if (vehicleName !== undefined) {
    updateData.vehicleName = vehicleName;
  }

  // Validate and update vehicleNo if provided
  if (vehicleNo !== undefined) {
    if (vehicleNo !== deliveryBoy.vehicleNo) {
      const vehicleExists = await prisma.deliveryBoy.findUnique({
        where: { vehicleNo },
      });
      if (vehicleExists) {
        throw new ApiError(400, "Vehicle number already registered");
      }
    }
    updateData.vehicleNo = vehicleNo;
  }

  // Update licenseImages if provided
  if (
    licenseImages !== undefined &&
    Array.isArray(licenseImages) &&
    licenseImages.length > 0
  ) {
    updateData.licenseImage = licenseImages;
  }

  // Update delivery boy profile
  const updatedDeliveryBoy = await prisma.deliveryBoy.update({
    where: { userId: req.user.id },
    data: updateData,
    include: {
      user: true,
      shopkeeper: true,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        "Delivery profile updated successfully",
        updatedDeliveryBoy
      )
    );
});
const updateAvatar = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { avatar } = req.body;

  // Find delivery
  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (!deliveryBoy) throw new ApiError(404, "Delivery profile not found");

  // Update
  const updatedDeliveryBoy = await prisma.deliveryBoy.update({
    where: { userId: req.user.id },
    data: { avatar },
  });

  return res.status(200).json(
    new ApiResponse(200, "Avatar updated successfully", updatedDeliveryBoy)
  );
});

/**
 * Get all orders assigned to delivery boy
 * Query params: status, page, limit
 * - Fetch orders assigned to delivery boy
 * - Filter by status if provided (pending, confirmed, shipped, delivered, cancelled)
 * - Return with pagination
 * - Include order items and customer details
 */
const getAssignedOrders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string | undefined;
  const skip = (page - 1) * limit;

  // Find delivery boy profile
  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (!deliveryBoy) {
    throw new ApiError(404, "Delivery profile not found");
  }

  // Build where clause
  const whereClause: any = {
    assignedDeliveryBoyId: deliveryBoy.id,
  };

  if (status) {
    whereClause.status = status;
  }

  // Fetch assigned orders with pagination
  const orders = await prisma.order.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      address: true,
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
            },
          },
          priceDetails: true,
        },
      },
    },
  });

  // Get total count for pagination
  const totalCount = await prisma.order.count({
    where: whereClause,
  });

  const formattedOrders = orders.map((order) => {
    const address = order.address;

    return {
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      totalProducts: order.totalProducts,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: order.user,
      address: address
        ? {
          id: address.id,
          name: address.name,
          phone: address.phone,
          line1: address.line1,
          line2: address.line2,
          city: address.city,
          state: address.state,
          pinCode: address.pinCode,
          geoLocation: {
            raw: address.geoLocation,
            latitude: address.geoLocation?.split(",")[0] || null,
            longitude: address.geoLocation?.split(",")[1] || null,
          },
        }
        : null,
      items: order.orderItems.map((item) => {
        const product = item.product;
        const isGlobal = product?.isGlobalProduct;

        return {
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
          unit: item.unit,
          weight: item.weight,
          price: item.price,
          productName: product
            ? isGlobal
              ? product.globalProduct?.name
              : product.name
            : null,
          priceDetails: item.priceDetails
            ? {
              id: item.priceDetails.id,
              price: item.priceDetails.price,
              discount: item.priceDetails.discount,
              weight: item.priceDetails.weight,
              unit: item.priceDetails.unit,
            }
            : null,
        };
      }),
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Assigned orders fetched successfully", {
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  );
});
const getDeliveryOrderHistory = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  // Find delivery boy profile
  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (!deliveryBoy) {
    throw new ApiError(404, "Delivery profile not found");
  }

  // Fetch delivered/cancelled orders with pagination
  const orders = await prisma.order.findMany({
    where: {
      assignedDeliveryBoyId: deliveryBoy.id,
      status: { in: ["delivered", "cancelled"] },
    },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
      address: true,
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
            },
          },
          priceDetails: true,
        },
      },
    },
  });

  // Get total count for pagination
  const totalCount = await prisma.order.count({
    where: {
      assignedDeliveryBoyId: deliveryBoy.id,
      status: { in: ["delivered", "cancelled"] },
    },
  });

  const formattedOrders = orders.map((order) => {
    return {
      id: order.id,
      customerName: order.user?.name || order.address?.name || "N/A",
      productPrice: order.totalAmount,
      status: order.status,
    };
  });
  return res.status(200).json(
    new ApiResponse(200, "Delivery order history fetched successfully", {
      orders: formattedOrders,
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
 * Get nearby shops for delivery partner registration
 * Query params: lat, lng, city (optional)
 * - Returns list of shops with basic details
 * - For MVP, returns all shops. In future, implement geospatial query.
 */
const getNearbyShops = asyncHandler(async (req, res) => {
  // const { lat, lng } = req.query; 
  const city = req.query.city as string | undefined;

  let addressWhere: any = { isDeleted: false };
  if (city) {
    // Case insensitive partial match
    addressWhere.city = { contains: city, mode: 'insensitive' };
  }

  // Fetch all shopkeepers with their address
  const shops = await prisma.shopkeeper.findMany({
    where: {
      isActive: true,
      // If city is provided, we only want shops in that city
      user: {
        address: {
          some: addressWhere
        }
      }
    },
    select: {
      id: true,
      shopName: true,
      shopImage: true,
      user: {
        select: {
          address: {
            where: { isDeleted: false },
            take: 1
          }
        }
      }
    }
  });

  const formattedShops = shops.map(shop => {
    const address = shop.user.address[0];
    return {
      id: shop.id,
      name: shop.shopName,
      image: shop.shopImage[0] || null,
      address: address ? `${address.line1}, ${address.city}` : "Address not available",
      distance: null // Calculate if needed
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Shops fetched successfully", formattedShops)
  );
});

/**
 * Get Available Cities
 * - Returns list of unique cities where shops are located
 */
const getAvailableCities = asyncHandler(async (req, res) => {
  const cities = await prisma.address.findMany({
    where: {
      isDeleted: false,
      user: {
        role: 'shopkeeper',
        shopkeeper: {
          isActive: true
        }
      }
    },
    select: { city: true },
    distinct: ['city']
  });

  const uniqueCities = cities.map(c => c.city).filter(Boolean);

  return res.status(200).json(
    new ApiResponse(200, "Cities fetched successfully", uniqueCities)
  );
});


/**
 * Update Order Status (Rider)
 * Request body: { orderId, status }
 * Status transitions: confirmed -> shipped -> delivered
 */
const updateOrderStatus = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { orderId, status, otp } = req.body;

  if (!['shipped', 'delivered', 'cancelled'].includes(status)) {
    throw new ApiError(400, "Invalid status");
  }

  // Find delivery boy
  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
  });

  if (!deliveryBoy) throw new ApiError(404, "Delivery profile not found");

  // Verify order is assigned to this rider
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });

  if (!order) throw new ApiError(404, "Order not found");
  if (order.assignedDeliveryBoyId !== deliveryBoy.id) {
    throw new ApiError(403, "Order not assigned to you");
  }
  // If delivering, verify OTP
  if (order.deliveryOtp !== otp) {
    throw new ApiError(400, "Invalid OTP");
  }
  // Update
  const updateData: any = {
    status,
    deliveredAt: Date.now()
  };

  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: updateData
  });

  return res.status(200).json(
    new ApiResponse(200, "Order status updated", updatedOrder)
  );
});

/**
 * Update Rider Location
 * Request body: { lat, lng }
 */
const updateLocation = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    throw new ApiError(400, "lat and lng are required");
  }

  const deliveryBoy = await prisma.deliveryBoy.update({
    where: { userId: req.user.id },
    data: {
      currentLat: lat,
      currentLng: lng,
      lastLocationUpdate: new Date()
    }
  });

  return res.status(200).json(
    new ApiResponse(200, "Location updated", {
      lat: deliveryBoy.currentLat,
      lng: deliveryBoy.currentLng
    })
  );
});

/**
 * Toggle Delivery Availability
 * Request body: { isOnline }
 */
const toggleAvailability = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { isOnline } = req.body;
  // console.log(isOnline)
  if (typeof isOnline !== 'boolean') {
    throw new ApiError(400, "isOnline (boolean) is required");
  }

  const deliveryBoy = await prisma.deliveryBoy.update({
    where: { userId: req.user.id },
    data: { isAvailable: isOnline }
  });
  // console.log(deliveryBoy)
  // console.log("Updated availability to:", deliveryBoy.isAvailable);
  return res.status(200).json(
    new ApiResponse(200, "Availability updated", { isAvailable: deliveryBoy.isAvailable })
  );
});

/**
 * Get Delivery Profile
 */
const getDeliveryProfile = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const deliveryBoy = await prisma.deliveryBoy.findUnique({
    where: { userId: req.user.id },
    include: {
      user: { select: { name: true, phone: true } },
      shopkeeper: { select: { shopName: true } }
    }
  });

  if (!deliveryBoy) throw new ApiError(404, "Profile not found");

  // Calculate Total Earnings (Sum of totalAmount of delivered orders)
  const earnings = await prisma.order.aggregate({
    where: {
      assignedDeliveryBoyId: deliveryBoy.id,
      status: 'delivered'
    },
    _sum: {
      totalAmount: true
    }
  });

  const profileWithStats = {
    ...deliveryBoy,
    totalEarnings: earnings._sum.totalAmount || 0
  };

  return res.status(200).json(
    new ApiResponse(200, "Profile fetched", profileWithStats)
  );
});

export {
  createDeliveryProfile,
  updateDeliveryProfile,
  getAssignedOrders,
  updateOrderStatus,
  updateLocation,
  getNearbyShops,
  toggleAvailability,
  getDeliveryProfile,
  getAvailableCities,
  getDeliveryOrderHistory,
  updateAvatar
};
