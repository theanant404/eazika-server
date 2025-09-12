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

// Validate shop ownership
export const validateShopOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Shop ID is required'
      });
    }

    const shop = await prisma.shop.findFirst({
      where: {
        id,
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
  const maxRequests = 20;

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

// Composite middleware arrays
export const shopManagementMiddleware = [
  ensureShopkeeper,
  shopRateLimit
];

export const shopOwnershipMiddleware = [
  ensureShopkeeper,
  validateShopOwnership
];

export const productOwnershipMiddleware = [
  ensureShopkeeper,
  validateShopProductOwnership
];
