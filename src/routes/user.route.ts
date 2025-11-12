import { Router } from "express";
import * as user from "../controllers/user.controller";

const router = Router();

router.post("/register", user.registerUser);
router.post("/login", user.loginUser);
router.get("/verify-phone-otp", user.verifyPhoneOTP);

export default router;
