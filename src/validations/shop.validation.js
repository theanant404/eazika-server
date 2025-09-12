import { z } from 'zod';

export const shopSchema = z.object({
  name: z.string().min(1, "Shop name is required").max(100, "Shop name too long"),
  description: z.string().max(500, "Description too long").optional(),
  address: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode format"),
    landmark: z.string().optional(),
    geoLocation: z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    }).optional()
  }),
  contact: z.object({
    phone: z.string().regex(/^\d{10}$/, "Invalid phone number"),
    email: z.string().email().optional(),
    whatsapp: z.string().regex(/^\d{10}$/, "Invalid WhatsApp number").optional()
  }),
  operatingHours: z.object({
    monday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    tuesday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    wednesday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    thursday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    friday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    saturday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional(),
    sunday: z.object({ 
      open: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      close: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"), 
      isClosed: z.boolean().optional() 
    }).optional()
  }).optional(),
  images: z.array(z.string().url("Invalid image URL")).max(10, "Maximum 10 images allowed").optional()
});

export const shopProductSchema = z.object({
  globalProductId: z.string().min(1, "Product is required"),
  price: z.number().min(0.01, "Price must be greater than 0"),
  stockQuantity: z.number().int().min(0, "Stock cannot be negative"),
  discountPercent: z.number().int().min(0).max(100, "Discount must be between 0-100").optional()
});

export const validateShop = (req, res, next) => {
  try {
    shopSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};

export const validateShopProduct = (req, res, next) => {
  try {
    shopProductSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};
