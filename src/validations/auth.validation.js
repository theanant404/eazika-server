import { z } from "zod";

// Registration Schema (aligned with Prisma User model and controller requirements)
const registeredUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required and must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .optional(),
  password: z
    .string()
    .min(6, "Password is required and must be at least 6 characters")
    .max(15, "Password must be between 6 and 15 characters"),
  phone: z
    .string()
    .regex(/^\d{10,13}$/, "Phone number must be between 10 and 13 digits"),
  role: z.enum(["CUSTOMER", "SHOPKEEPER", "DELIVERY_BOY", "ADMIN"])
    .default("CUSTOMER"),  // Makes role optional with default value
  profileImage: z
    .string()
    .url("Must be a valid URL")
    .optional(),
  
  // Shopkeeper-specific fields
  businessName: z
    .string()
    .trim()
    .min(1, "Business name is required for shopkeepers")
    .max(100, "Business name must be less than 100 characters")
    .optional(), // Optional because it's only required for SHOPKEEPER role
  
  // Delivery Boy-specific fields
  vehicleType: z
    .string()
    .trim()
    .min(1, "Vehicle type is required for delivery boys")
    .optional(), // Optional because it's only required for DELIVERY_BOY role
  vehicleNumber: z
    .string()
    .trim()
    .min(1, "Vehicle number is required for delivery boys")
    .max(20, "Vehicle number must be less than 20 characters")
    .optional(), // Optional because it's only required for DELIVERY_BOY role
})
.refine((data) => {
  // If role is SHOPKEEPER, businessName should be provided
  if (data.role === "SHOPKEEPER") {
    return data.businessName && data.businessName.trim().length > 0;
  }
  return true;
}, {
  message: "Business name is required for shopkeeper registration",
  path: ["businessName"]
})
.refine((data) => {
  // If role is DELIVERY_BOY, vehicleType should be provided
  if (data.role === "DELIVERY_BOY") {
    return data.vehicleType && data.vehicleType.trim().length > 0;
  }
  return true;
}, {
  message: "Vehicle type is required for delivery boy registration",
  path: ["vehicleType"]
});

// Login Schema
const loginUserSchema = z.object({
  emailPhone: z
    .string()
    .min(1, "Email or phone is required"),
  password: z
    .string()
    .min(6, "Password is required"),
});

// Forgot Password Schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Invalid email address"),
});

// Update Profile Schema (for profile updates after registration)
const updateProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name must be less than 50 characters")
    .optional(),
  email: z
    .string()
    .email("Invalid email address")
    .optional(),
  profileImage: z
    .string()
    .url("Must be a valid URL")
    .optional(),
  // Role-specific profile updates can be added here
}).strict(); // Prevents additional fields

// Change Password Schema
const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(6, "Current password is required"),
  newPassword: z
    .string()
    .min(6, "New password must be at least 6 characters")
    .max(15, "New password must be between 6 and 15 characters"),
  confirmPassword: z
    .string()
    .min(6, "Please confirm your new password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match",
  path: ["confirmPassword"],
});

export {
  registeredUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
};
