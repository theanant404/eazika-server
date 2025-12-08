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
          // shopProduct: true,
          // productPrice: true,
        },
      },
    },
  });

  // Get total count for pagination
  const totalCount = await prisma.order.count({
    where: whereClause,
  });

  return res.status(200).json(
    new ApiResponse(200, "Assigned orders fetched successfully", {
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

export { createDeliveryProfile, updateDeliveryProfile, getAssignedOrders };
