import { z } from "zod";

const registeredUserSchema = z.object({
  firstName: z.string().min(2, "First name is required").max(30),
  lastName: z.string().max(30),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(6, "password is required")
    .max(15, "Password must be between 6 and 15 characters"),
  phone: z
    .string()
    .regex(/^\d{10,13}$/, "Invalid phone number")
    .optional(),
  imageUrl: z.string().optional(),
});

const loginUserSchema = z.object({
  emailPhone: z.string().min(1, "Email or phone is required"),
  password: z.string().min(6, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export { registeredUserSchema, loginUserSchema, forgotPasswordSchema };
