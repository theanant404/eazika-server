import { z } from 'zod';

export const addToCartSchema = z.object({
  shopProductId: z.string().min(1, "Product is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Maximum quantity is 100")
});

export const updateCartSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1").max(100, "Maximum quantity is 100")
});

export const createOrderSchema = z.object({
  deliveryAddressId: z.string().min(1, "Delivery address is required"),
  paymentMethod: z.enum(['COD', 'UPI', 'CARD', 'WALLET']),
  notes: z.string().max(500, "Notes too long").optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']),
  notes: z.string().max(500, "Notes too long").optional()
});

export const orderRatingSchema = z.object({
  rating: z.number().int().min(1, "Rating must be between 1-5").max(5, "Rating must be between 1-5"),
  review: z.string().max(500, "Review too long").optional()
});

// Validation middleware functions
export const validateAddToCart = (req, res, next) => {
  try {
    addToCartSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};

export const validateUpdateCart = (req, res, next) => {
  try {
    updateCartSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};

export const validateCreateOrder = (req, res, next) => {
  try {
    createOrderSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};

export const validateUpdateOrderStatus = (req, res, next) => {
  try {
    updateOrderStatusSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};

export const validateOrderRating = (req, res, next) => {
  try {
    orderRatingSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};
