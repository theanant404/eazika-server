import { z } from 'zod';

export const deliveryBoyProfileSchema = z.object({
  vehicleType: z.string().min(1, "Vehicle type is required"),
  vehicleNumber: z.string().min(1, "Vehicle number is required"),
  deliveryRadius: z.number().int().min(1).max(25).optional(),
  isAvailable: z.boolean().optional(),
  docs: z.array(z.object({
    type: z.enum(['LICENSE', 'AADHAR', 'PHOTO_ID']),
    url: z.string().url("Invalid URL"),
    number: z.string().optional()
  })).min(1, "At least one document is required"),
});

export function validateDeliveryBoyProfile(req, res, next) {
  try {
    deliveryBoyProfileSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
}
