import { Router } from "express";
import {
  getProfile,
  updateProfile,
  updateKycStatus,
  uploadKycDocuments
} from "../controllers/shopkeeper.controller.js";
import { shopkeeperProfileMiddleware } from "../middlewares/shopkeeper.middleware.js";
import { validateShopkeeperProfile } from "../validations/shopkeeper.validation.js";

const router = Router();

// Profile routes
router.get("/profile", ...shopkeeperProfileMiddleware, getProfile);
router.put("/profile", ...shopkeeperProfileMiddleware, validateShopkeeperProfile, updateProfile);
router.patch("/kyc-status", ...shopkeeperProfileMiddleware, updateKycStatus);
router.post("/kyc-documents", ...shopkeeperProfileMiddleware, uploadKycDocuments);

export default router;
