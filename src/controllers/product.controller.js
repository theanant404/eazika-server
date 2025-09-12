import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Browse global product catalog
export const getGlobalProducts = asyncHandler(async (req, res) => {
  const { category, search, page = 1, limit = 20 } = req.query;

  const where = {};
  
  if (category) {
    where.category = category;
  }
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { brand: { contains: search, mode: 'insensitive' } },
      { tags: { has: search } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    prisma.globalProduct.findMany({
      where,
      take: parseInt(limit),
      skip,
      orderBy: { name: 'asc' }
    }),
    prisma.globalProduct.count({ where })
  ]);

  res.json(new ApiResponse(200, "Global products retrieved successfully", {
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get shop's products
export const getShopProducts = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { active, page = 1, limit = 20 } = req.query;

  // Verify shop ownership
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      ownerId: req.user.id
    }
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found or access denied");
  }

  const where = { shopId };
  
  if (active !== undefined) {
    where.isActive = active === 'true';
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      include: {
        globalProduct: true
      },
      take: parseInt(limit),
      skip,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.shopProduct.count({ where })
  ]);

  res.json(new ApiResponse(200, "Shop products retrieved successfully", {
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Add product to shop
export const addProductToShop = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { globalProductId, price, stockQuantity, discountPercent } = req.body;

  // Verify shop ownership
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      ownerId: req.user.id
    }
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found or access denied");
  }

  // Check if global product exists
  const globalProduct = await prisma.globalProduct.findUnique({
    where: { id: globalProductId }
  });

  if (!globalProduct) {
    throw new ApiError(404, "Product not found in catalog");
  }

  // Check if product already exists in shop
  const existingProduct = await prisma.shopProduct.findFirst({
    where: {
      shopId,
      globalProductId
    }
  });

  if (existingProduct) {
    throw new ApiError(409, "Product already exists in your shop");
  }

  const shopProduct = await prisma.shopProduct.create({
    data: {
      shopId,
      globalProductId,
      price,
      stockQuantity: stockQuantity || 0,
      discountPercent: discountPercent || 0,
      metadata: {
        addedAt: new Date().toISOString()
      }
    },
    include: {
      globalProduct: true
    }
  });

  res.json(new ApiResponse(201, "Product added to shop successfully", shopProduct));
});

// Update shop product
export const updateShopProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { price, stockQuantity, discountPercent } = req.body;

  const updatedProduct = await prisma.shopProduct.update({
    where: { id },
    data: {
      price: price !== undefined ? price : undefined,
      stockQuantity: stockQuantity !== undefined ? stockQuantity : undefined,
      discountPercent: discountPercent !== undefined ? discountPercent : undefined,
      metadata: {
        ...req.shopProduct.metadata,
        lastUpdated: new Date().toISOString()
      }
    },
    include: {
      globalProduct: true
    }
  });

  res.json(new ApiResponse(200, "Product updated successfully", updatedProduct));
});

// Remove product from shop
export const removeProductFromShop = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if product has any pending orders
  const orderItemCount = await prisma.orderItem.count({
    where: {
      shopProductId: id,
      order: {
        status: {
          not: 'DELIVERED'
        }
      }
    }
  });

  if (orderItemCount > 0) {
    throw new ApiError(400, "Cannot remove product with pending orders");
  }

  await prisma.shopProduct.delete({ where: { id } });

  res.json(new ApiResponse(200, "Product removed from shop successfully"));
});

// Toggle product availability
export const toggleProductAvailability = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const updatedProduct = await prisma.shopProduct.update({
    where: { id },
    data: {
      isActive: !req.shopProduct.isActive
    },
    include: {
      globalProduct: true
    }
  });

  res.json(new ApiResponse(200, `Product ${updatedProduct.isActive ? 'activated' : 'deactivated'} successfully`, updatedProduct));
});

// Get product categories
export const getProductCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.globalProduct.findMany({
    select: {
      category: true
    },
    distinct: ['category'],
    orderBy: {
      category: 'asc'
    }
  });

  const categoryList = categories.map(cat => cat.category);

  res.json(new ApiResponse(200, "Product categories retrieved successfully", categoryList));
});
