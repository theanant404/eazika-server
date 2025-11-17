import { email, z } from "zod";

export const registrationOtpSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  deviceInfo: z.string().optional(),
});

export const verifyRegistrationOtpSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  requestId: z.string("Invalid request ID format"),
  otp: z.string().length(4, "OTP must be exactly 4 digits"),
  deviceInfo: z.string().optional(),
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long")
    .optional(),
  email: z.string().email("Invalid email address").optional(),
  defaultAddressId: z.number().int().positive().optional(),
});

export const userAddressSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters long")
    .max(100, "Name must be at most 100 characters long"),
  phone: z.string().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
  line1: z
    .string()
    .min(5, "Address Line 1 must be at least 5 characters long")
    .max(200, "Address Line 1 must be at most 200 characters long"),
  line2: z
    .string()
    .max(200, "Address Line 2 must be at most 200 characters long")
    .optional(),
  street: z
    .string()
    .max(100, "Street must be at most 100 characters long")
    .optional(),
  city: z
    .string()
    .min(2, "City must be at least 2 characters long")
    .max(100, "City must be at most 100 characters long"),
  state: z
    .string()
    .min(2, "State must be at least 2 characters long")
    .max(100, "State must be at most 100 characters long"),
  country: z
    .string()
    .min(2, "Country must be at least 2 characters long")
    .max(100, "Country must be at most 100 characters long"),
  pinCode: z
    .string()
    .regex(/^\d{5,10}$/, "Pin Code must be between 5 to 10 digits"),
  geoLocation: z.string().optional(),
});
