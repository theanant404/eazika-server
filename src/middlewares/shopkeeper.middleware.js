import { prisma } from '../config/index.js';
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

// Check if shopkeeper profile is complete
export const requireCompleteShopkeeperProfile = [
  ...ensureShopkeeper,
  async (req, res, next) => {
    try {
      const profile = await prisma.shopkeeperProfile.findUnique({
        where: { userId: req.user.id }
      });

      if (!profile || !profile.businessName) {
        return res.status(400).json({
          success: false,
          error: 'Please complete your shopkeeper profile first',
          action: 'COMPLETE_PROFILE'
        });
      }

      req.shopkeeperProfile = profile;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to validate shopkeeper profile'
      });
    }
  }
];

// Rate limiting for shopkeeper operations
const shopkeeperRequestTracker = new Map();

export const shopkeeperRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 15; // Max 15 requests per minute

  if (!shopkeeperRequestTracker.has(userId)) {
    shopkeeperRequestTracker.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const tracker = shopkeeperRequestTracker.get(userId);
  
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

// Composite middleware for shopkeeper profile operations
export const shopkeeperProfileMiddleware = [
  ensureShopkeeper,
  shopkeeperRateLimit
];
