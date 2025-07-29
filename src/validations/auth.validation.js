import { z } from "zod";

// Registration Schema (aligned with Prisma User model)
const registeredUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name is required and must be at least 2 characters")
    .max(50, "Name must be less than 50 characters"),
  email: z
    .string()
    .email("Invalid email address")
    .optional(), // Email is optional in Prisma
  password: z
    .string()
    .min(6, "Password is required and must be at least 6 characters")
    .max(15, "Password must be between 6 and 15 characters"),
  phone: z
    .string()
    .regex(/^\d{10,13}$/, "Phone number must be between 10 and 13 digits"),
  profileImage: z
    .string()
    .url("Must be a valid URL")
    .optional(),
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

export {
  registeredUserSchema,
  loginUserSchema,
  forgotPasswordSchema,
};
