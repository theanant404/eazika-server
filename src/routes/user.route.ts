import { Router } from "express";
import * as user from "../controllers/user.controller";
import * as auth from "../middlewares/auth.middleware";

const router = Router();

/**
 * User Authentication Routes
 *
 * Implements OTP-based authentication flow for registration and login.
 * OTP is sent via SMS using MSG91 service and expires after 5 minutes (300 seconds).
 * Maximum 3 verification attempts allowed per OTP request.
 *
 * Flow:
 * 1. Send OTP (register/login) - Returns requestId
 * 2. Verify OTP with requestId - Returns JWT tokens
 * 3. Resend OTP if needed (same requestId)
 */

// Registration Flow - POST /api/v2/users/register*
router.post("/register", user.sendRegistrationOtp); // Send OTP to register new user (requires: name, phone)
router.post("/register/verify", user.verifyRegistrationOtp); // Verify OTP and create account (requires: phone, requestId, otp)
router.post("/register/resend", user.resendRegistrationOtp); // Resend registration OTP (requires: name, phone)

// Login Flow - POST /api/v2/users/login*
router.post("/login", user.sendLoginOtp); // Send OTP to existing user for login (requires: phone)
router.post("/login/verify", user.verifyLoginOtp); // Verify login OTP and issue JWT tokens (requires: phone, requestId, otp)
router.post("/login/resend", user.resendLoginOtp); // Resend login OTP (requires: phone)

/**
 * Session Management Routes
 *
 * JWT tokens are used for authentication:
 * - Access Token: Valid for 7 days, sent in response body and stored in httpOnly cookie
 * - Refresh Token: Valid for 7 days, stored in httpOnly cookie
 *
 * Tokens are signed using HS256 algorithm with secret from env.JWT_SECRET
 */

router.post("/refresh", user.refreshToken); // Refresh access token using refresh token (from cookie or body)
router.post("/logout", auth.authMiddleware, user.logout); // Logout user and clear authentication cookies

/**
 * User Profile Routes
 *
 * All routes under /user require authentication (authMiddleware)
 * Base path: /api/v2/users/user/*
 *
 * Supports:
 * - Profile retrieval and updates
 * - Profile picture management
 * - Multiple address management (delivery addresses)
 */

const userRoute = router.use("/user", auth.authMiddleware); // Apply auth middleware to all /user/* routes

// Profile Management
userRoute.get("/", user.getCurrentUser); // GET /api/v2/users/user - Get authenticated user's profile
userRoute.patch("/update-user", user.updateCurrentUser); // PATCH /api/v2/users/user/update-user - Update user details (name, email)
userRoute.patch("/update-profile-picture", user.updateProfilePicture); // PATCH /api/v2/users/user/update-profile-picture - Update profile picture URL

// Address Management (for delivery)
userRoute.post("/add-new-address", user.addNewAddress); // POST /api/v2/users/user/add-new-address - Add new delivery address
userRoute.patch("/update-address/:addressId", user.updateAddress); // PATCH /api/v2/users/user/update-address/:addressId - Update existing address
userRoute.delete("/delete-address/:addressId", user.deleteAddress); // DELETE /api/v2/users/user/delete-address/:addressId - Delete address

export default router;
