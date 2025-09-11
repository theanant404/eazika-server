import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Browse all products from active shops
export const browseProducts = asyncHandler(async (req, res) => {
  const { 
    category, 
    search, 
    shopId,
    minPrice,
    maxPrice,
    page = 1, 
    limit = 20 
  } = req.query;

  const where = {
    isActive: true,
    shop: {
      isActive: true
    },
    stockQuantity: {
      gt: 0 // Only show products in stock
    }
  };

  // Filter by category
  if (category) {
    where.globalProduct = {
      category
    };
  }

  // Filter by shop
  if (shopId) {
    where.shopId = shopId;
  }

  // Price range filter
  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice) where.price.gte = parseFloat(minPrice);
    if (maxPrice) where.price.lte = parseFloat(maxPrice);
  }

  // Search functionality
  if (search) {
    where.OR = [
      {
        globalProduct: {
          name: { contains: search, mode: 'insensitive' }
        }
      },
      {
        globalProduct: {
          brand: { contains: search, mode: 'insensitive' }
        }
      },
      {
        globalProduct: {
          tags: { has: search }
        }
      }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [products, total] = await Promise.all([
    prisma.shopProduct.findMany({
      where,
      include: {
        globalProduct: true,
        shop: {
          select: {
            id: true,
            name: true,
            address: true,
            rating: true
          }
        }
      },
      take: parseInt(limit),
      skip,
      orderBy: [
        { shop: { rating: 'desc' } },
        { price: 'asc' }
      ]
    }),
    prisma.shopProduct.count({ where })
  ]);

  res.json(new ApiResponse(200, "Products retrieved successfully", {
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get product details
export const getProductDetails = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await prisma.shopProduct.findFirst({
    where: {
      id,
      isActive: true,
      shop: {
        isActive: true
      }
    },
    include: {
      globalProduct: true,
      shop: {
        select: {
          id: true,
          name: true,
          address: true,
          contact: true,
          rating: true,
          metadata: true
        }
      }
    }
  });

  if (!product) {
    throw new ApiError(404, "Product not found or unavailable");
  }

  res.json(new ApiResponse(200, "Product details retrieved successfully", product));
});

// Get products by shop
export const getShopProducts = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { category, page = 1, limit = 20 } = req.query;

  // Verify shop exists and is active
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      isActive: true
    }
  });

  if (!shop) {
    throw new ApiError(404, "Shop not found or inactive");
  }

  const where = {
    shopId,
    isActive: true,
    stockQuantity: {
      gt: 0
    }
  };

  if (category) {
    where.globalProduct = {
      category
    };
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
      orderBy: { price: 'asc' }
    }),
    prisma.shopProduct.count({ where })
  ]);

  res.json(new ApiResponse(200, "Shop products retrieved successfully", {
    shop: {
      id: shop.id,
      name: shop.name,
      description: shop.description,
      address: shop.address,
      rating: shop.rating
    },
    products,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get product categories
export const getCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.globalProduct.findMany({
    where: {
      shopProducts: {
        some: {
          isActive: true,
          shop: {
            isActive: true
          }
        }
      }
    },
    select: {
      category: true
    },
    distinct: ['category'],
    orderBy: {
      category: 'asc'
    }
  });

  const categoryList = categories.map(cat => cat.category);

  res.json(new ApiResponse(200, "Categories retrieved successfully", categoryList));
});

// Search suggestions
export const getSearchSuggestions = asyncHandler(async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.json(new ApiResponse(200, "Search suggestions", []));
  }

  const suggestions = await prisma.globalProduct.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } }
      ],
      shopProducts: {
        some: {
          isActive: true,
          shop: {
            isActive: true
          }
        }
      }
    },
    select: {
      name: true,
      brand: true
    },
    take: 10,
    distinct: ['name']
  });

  const suggestionList = suggestions.map(s => ({
    text: s.brand ? `${s.name} - ${s.brand}` : s.name,
    name: s.name,
    brand: s.brand
  }));

  res.json(new ApiResponse(200, "Search suggestions retrieved", suggestionList));
});
