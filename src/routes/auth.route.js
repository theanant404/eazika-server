import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  loginWithGoogle,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", auth, logoutUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/google-login", loginWithGoogle);

export default router;
