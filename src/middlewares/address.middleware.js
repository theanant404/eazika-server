import prisma from '../config/dbConfig.js';
import { ensureCustomer } from './customer.middleware.js';
import { validateAddressInput } from '../validations/address.validation.js';

// Validate address ownership
export const validateAddressOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Address ID is required'
      });
    }

    const address = await prisma.address.findFirst({
      where: {
        id,
        userId: req.user.id
      }
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found or access denied'
      });
    }

    // Attach address to request for controller use
    req.address = address;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate address ownership'
    });
  }
};

// Check if customer has at least one address
export const requireAtLeastOneAddress = async (req, res, next) => {
  try {
    const addressCount = await prisma.address.count({
      where: { userId: req.user.id }
    });

    if (addressCount === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please add at least one delivery address',
        action: 'ADD_ADDRESS'
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate address requirement'
    });
  }
};

// Rate limiting for address operations
const addressRequestTracker = new Map();

export const addressRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 10;

  if (!addressRequestTracker.has(userId)) {
    addressRequestTracker.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const tracker = addressRequestTracker.get(userId);
  
  if (now > tracker.resetTime) {
    tracker.count = 1;
    tracker.resetTime = now + windowMs;
    return next();
  }

  if (tracker.count >= maxRequests) {
    return res.status(429).json({
      success: false,
      message: 'Too many address requests. Try again later.'
    });
  }

  tracker.count++;
  next();
};

// Composite middleware arrays for clean route definitions
export const addressCreateMiddleware = [
  ensureCustomer,
  addressRateLimit,
  validateAddressInput
];

export const addressUpdateMiddleware = [
  ensureCustomer,
  validateAddressOwnership,
  validateAddressInput
];

export const addressAccessMiddleware = [
  ensureCustomer,
  validateAddressOwnership
];
