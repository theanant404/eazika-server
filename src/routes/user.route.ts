import { Router } from "express";
import * as user from "../controllers/user.controller";
import * as auth from "../middlewares/auth.middleware";

const router = Router();
const userRoute = Router();

// Registration Flow - POST /api/v2/users/register*
router.post("/register", user.sendRegistrationOtp);
router.post("/register/verify", user.verifyRegistrationOtp);
router.post("/register/resend", user.resendRegistrationOtp);

// Login Flow - POST /api/v2/users/login*
router.post("/login", user.sendLoginOtp);
router.post("/login/verify", user.verifyLoginOtp);
router.post("/login/resend", user.resendLoginOtp);

router.post("/refresh", user.refreshToken);
router.post("/logout", auth.authMiddleware, user.logout);

router.use("/user", auth.authMiddleware, userRoute);
// Profile Management
userRoute.get("/", user.getCurrentUser);
// userRoute.patch("/update-user", user.updateCurrentUser);
userRoute.patch("/update-user", user.updateCurrentUser);
userRoute.patch("/update-profile-picture", user.updateProfilePicture);

// Address Management (for delivery)
userRoute.get("/addresses", user.getAddresses);  // Added: Get all addresses
userRoute.post("/add-new-address", user.addNewAddress);
userRoute.patch("/update-address/:addressId", user.updateAddress);
userRoute.delete("/delete-address/:addressId", user.deleteAddress);

export default router;
