import prisma from '../config/dbConfig.js';
import verifyJWT from './auth.middleware.js';

// Ensure user is customer for cart/order operations
export const ensureCustomer = [
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        error: 'Customer access required'
      });
    }
    next();
  }
];

// Validate cart item ownership
export const validateCartItemOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Cart item ID is required'
      });
    }

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id,
        customerId: req.user.id
      },
      include: {
        shopProduct: {
          include: {
            globalProduct: true,
            shop: true
          }
        }
      }
    });

    if (!cartItem) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found or access denied'
      });
    }

    req.cartItem = cartItem;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate cart item ownership'
    });
  }
};

// Validate order ownership (customer)
export const validateCustomerOrderOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        customerId: req.user.id
      },
      include: {
        shop: true,
        orderItems: {
          include: {
            shopProduct: {
              include: {
                globalProduct: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate order ownership'
    });
  }
};

// Validate order ownership (shopkeeper)
export const validateShopOrderOwnership = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await prisma.order.findFirst({
      where: {
        id,
        shop: {
          ownerId: req.user.id
        }
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true
          }
        },
        orderItems: {
          include: {
            shopProduct: {
              include: {
                globalProduct: true
              }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    req.order = order;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate order ownership'
    });
  }
};

// Stock validation before adding to cart
export const validateStock = async (req, res, next) => {
  try {
    const { shopProductId, quantity } = req.body;

    const product = await prisma.shopProduct.findUnique({
      where: { id: shopProductId },
      include: {
        globalProduct: true,
        shop: true
      }
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!product.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Product is currently unavailable'
      });
    }

    if (!product.shop.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Shop is currently closed'
      });
    }

    if (product.stockQuantity < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stockQuantity} items available in stock`
      });
    }

    req.product = product;
    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to validate product stock'
    });
  }
};

// Rate limiting for order operations
const orderRequestTracker = new Map();

export const orderRateLimit = (req, res, next) => {
  const userId = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 30; // More lenient for orders

  if (!orderRequestTracker.has(userId)) {
    orderRequestTracker.set(userId, { count: 1, resetTime: now + windowMs });
    return next();
  }

  const tracker = orderRequestTracker.get(userId);
  
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
export const customerOrderMiddleware = [
  ensureCustomer,
  orderRateLimit
];

export const cartMiddleware = [
  ensureCustomer,
  validateStock,
  orderRateLimit
];

export const customerOrderOwnershipMiddleware = [
  ensureCustomer,
  validateCustomerOrderOwnership
];

export const cartItemOwnershipMiddleware = [
  ensureCustomer,
  validateCartItemOwnership
];
