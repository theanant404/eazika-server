import { z } from "zod";

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
