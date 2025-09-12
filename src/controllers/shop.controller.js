import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Get all shops owned by shopkeeper
export const getShops = asyncHandler(async (req, res) => {
  const shops = await prisma.shop.findMany({
    where: { ownerId: req.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          products: true,
          orders: true
        }
      }
    }
  });

  res.json(new ApiResponse(200, "Shops retrieved successfully", shops));
});

// Get single shop details
export const getShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const shop = await prisma.shop.findFirst({
    where: {
      id,
      ownerId: req.user.id
    },
    include: {
      _count: {
        select: {
          products: true,
          orders: true
        }
      }
    }
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found");
  }

  res.json(new ApiResponse(200, "Shop details retrieved successfully", shop));
});

// Create new shop
export const createShop = asyncHandler(async (req, res) => {
  const { 
    name, 
    description, 
    address, 
    contact, 
    operatingHours,
    images 
  } = req.body;

  // Check if shopkeeper profile is complete
  const profile = await prisma.shopkeeperProfile.findUnique({
    where: { userId: req.user.id }
  });

  if (!profile || !profile.businessName) {
    throw new ApiError(400, "Please complete your shopkeeper profile first");
  }

  const newShop = await prisma.shop.create({
    data: {
      ownerId: req.user.id,
      name,
      description: description || null,
      address: address || {},
      contact: contact || {},
      images: images || [],
      metadata: {
        operatingHours: operatingHours || {},
        deliveryRadius: 5,
        minimumOrder: 0,
        deliveryFee: 0,
        createdAt: new Date().toISOString()
      }
    }
  });

  res.json(new ApiResponse(201, "Shop created successfully", newShop));
});

// Update shop
export const updateShop = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { 
    name, 
    description, 
    address, 
    contact, 
    operatingHours,
    images 
  } = req.body;

  const updatedShop = await prisma.shop.update({
    where: { id },
    data: {
      name,
      description: description || null,
      address: address || {},
      contact: contact || {},
      images: images || [],
      metadata: {
        ...req.shop.metadata,
        operatingHours: operatingHours || {},
        lastUpdated: new Date().toISOString()
      }
    }
  });

  res.json(new ApiResponse(200, "Shop updated successfully", updatedShop));
});

// Delete shop
export const deleteShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if shop has any orders
  const orderCount = await prisma.order.count({
    where: { shopId: id }
  });

  if (orderCount > 0) {
    throw new ApiError(400, "Cannot delete shop with existing orders");
  }

  await prisma.shop.delete({ where: { id } });

  res.json(new ApiResponse(200, "Shop deleted successfully"));
});

// Toggle shop active status
export const toggleShopStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedShop = await prisma.shop.update({
    where: { id },
    data: {
      isActive: !req.shop.isActive
    }
  });

  res.json(new ApiResponse(200, `Shop ${updatedShop.isActive ? 'activated' : 'deactivated'} successfully`, updatedShop));
});
