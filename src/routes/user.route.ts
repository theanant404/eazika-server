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
const userRoute = router.use("/user", auth.authMiddleware); // protect all /user routes

userRoute.get("/", user.getCurrentUser); // get current user's profile
userRoute.patch("/update-user", user.updateCurrentUser); // update current user's profile
userRoute.patch("/update-profile-picture", user.updateProfilePicture); // update profile picture
userRoute.post("/add-new-address", user.addNewAddress); // add new address for current user
userRoute.patch("/update-address/:addressId", user.updateAddress); // update address by ID
userRoute.delete("/delete-address/:addressId", user.deleteAddress); // delete address by ID

// router.get("/user/me", auth.authMiddleware, user.getCurrentUser); // get current user's profile
// router.patch("/user/me", auth.authMiddleware, user.updateCurrentUser); // update current user's profile
// router.

export default router;
