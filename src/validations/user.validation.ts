import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().max(50, "Label too long").optional(),
  line1: z.string().min(1, "Address line 1 is required").max(255, "Address line 1 too long"),
  line2: z.string().max(255, "Address line 2 too long").optional(),
  city: z.string().min(1, "City is required").max(100, "City name too long"),
  state: z.string().min(1, "State is required").max(100, "State name too long"),
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
  geoLocation: z.object({
    latitude: z.number().min(-90).max(90, "Invalid latitude"),
    longitude: z.number().min(-180).max(180, "Invalid longitude")
  }).optional(),
  isDefault: z.boolean().optional()
});

export const validateAddressInput = (req, res, next) => {
  try {
    addressSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};
