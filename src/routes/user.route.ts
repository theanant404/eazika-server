import { Router } from "express";
import * as user from "../controllers/user.controller";
import * as auth from "../middlewares/auth.middleware";

const router = Router();

// Auth (OTP) flows - clearer, RESTful and consistent naming
router.post("/register", user.sendRegistrationOtp); // send OTP to register
router.post("/register/verify", user.verifyRegistrationOtp); // verify OTP and create account
router.post("/register/resend", user.resendRegistrationOtp); // resend registration OTP

router.post("/login", user.sendLoginOtp); // send OTP to login
router.post("/login/verify", user.verifyLoginOtp); // verify login OTP and issue tokens
router.post("/login/resend", user.resendLoginOtp); // resend login OTP

// Session management
router.post("/refresh", user.refreshToken); // refresh access token
router.post("/logout", auth.authMiddleware, user.logout); // logout / revoke tokens

// // User profile (optional but useful)
// router.get("/users/me", user.getCurrentUser);                      // get current user's profile
// router.patch("/users/me", user.updateCurrentUser);                 // update current user's profile
// router.delete("/users/me", user.deleteCurrentUser);                // delete account

export default router;

// router.post("/request-otp", user.requestOtp);
// router.post("/verify-otp", user.verifyOtpHandler);
// router.post("/refresh", user.refreshHandler);
// router.post("/logout", user.logoutHandler);
