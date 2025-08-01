import { Router } from "express";
import auth from "../middlewares/auth.middleware.js";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
} from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/logout", auth, logoutUser);
router.post("/refresh-token", refreshAccessToken);

export default router;
