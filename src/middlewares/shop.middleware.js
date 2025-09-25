import prisma from '../config/dbConfig.js';
import verifyJWT from './auth.middleware.js';

// Ensure user is shopkeeper
export const ensureShopkeeper = [
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'SHOPKEEPER') {
      return res.status(403).json({
        success: false,
        error: 'Shopkeeper access required'
      });
    }
    next();
  }
];

// ✅ UPDATED: Validate shop ownership - handles both :id and :shopId parameters
export const validateShopOwnership = async (req, res, next) => {
  try {
    const { id, shopId } = req.params;
    const shopIdToUse = shopId || id; // Use shopId if available, fallback to id
    
    if (!shopIdToUse) {
      return res.status(400).json({
        success: false,
        message: 'Shop ID is required'
      });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id: shopIdToUse,
        ownerId: req.user.id
      }
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found or access denied'
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    console.error('Shop ownership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate shop ownership'
    });
  }
};

// ✅ NEW: Specific middleware for :shopId routes (cleaner approach)
export const validateShopOwnershipByShopId = async (req, res, next) => {
  try {
    const { shopId } = req.params;
    
    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: 'Shop ID is required'
      });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id: shopId,
        ownerId: req.user.id
      }
    });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: 'Shop not found or access denied'
      });
    }

    req.shop = shop;
    next();
  } catch (error) {
    console.error('Shop ownership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate shop ownership'
    });
  }
};

// Validate shop product ownership
export const validateShopProductOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required'
      });
    }

    const shopProduct = await prisma.shopProduct.findFirst({
      where: {
        id,
        shop: {
          ownerId: req.user.id
        }
      },
      include: {
        shop: true,
        globalProduct: true
      }
    });

    if (!shopProduct) {
      return res.status(404).json({
        success: false,
        message: 'Product not found or access denied'
      });
    }

    req.shopProduct = shopProduct;
    next();
  } catch (error) {
    console.error('Product ownership validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate product ownership'
    });
  }
};

// Rate limiting for shop operations
const shopRequestTracker = new Map();

export const shopRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 200000000000000000;

  if (!shopRequestTracker.has(userId)) {
    shopRequestTracker.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const tracker = shopRequestTracker.get(userId);
  
  if (now > tracker.resetTime) {
    tracker.count = 1;
    tracker.resetTime = now + windowMs;
    return next();
  }

  if (tracker.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.'
    });
  }

  tracker.count++;
  next();
};

// ✅ EXISTING: Composite middleware arrays
export const shopManagementMiddleware = [
  ensureShopkeeper,
  shopRateLimit
];

export const shopOwnershipMiddleware = [
  ensureShopkeeper,
  validateShopOwnership  // ✅ This now handles both :id and :shopId
];

export const productOwnershipMiddleware = [
  ensureShopkeeper,
  validateShopProductOwnership
];

// ✅ NEW: Specific middleware for :shopId routes
export const shopOwnershipByShopIdMiddleware = [
  ensureShopkeeper,
  validateShopOwnershipByShopId
];
