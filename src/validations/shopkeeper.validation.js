import { z } from 'zod';

export const shopkeeperProfileSchema = z.object({
  businessName: z.string().min(1, "Business name is required").max(100, "Business name too long"),
  businessType: z.string().optional(),
  gstNumber: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid GST number format").optional(),
  contactPhone: z.string().regex(/^\d{10}$/, "Invalid phone number").optional(),
  contactEmail: z.string().email("Invalid email format").optional(),
  businessAddress: z.object({
    line1: z.string().min(1, "Address line 1 is required"),
    line2: z.string().optional(),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Invalid pincode format")
  }).optional(),
  bankDetails: z.object({
    accountNumber: z.string().min(8, "Invalid account number").max(20, "Account number too long"),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
    bankName: z.string().min(1, "Bank name is required"),
    accountHolderName: z.string().min(1, "Account holder name is required")
  }).optional()
});

export const validateShopkeeperProfile = (req, res, next) => {
  try {
    shopkeeperProfileSchema.parse(req.body);
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.errors[0].message,
      errors: error.errors
    });
  }
};
