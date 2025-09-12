import { Router } from "express";
import { getProfile, updateProfile } from "../controllers/customer.controller.js";
import { ensureCustomer } from "../middlewares/customer.middleware.js";
import { validateUpdateProfile } from "../validations/customer.validation.js";

const router = Router();

// All routes require customer authentication
router.use(ensureCustomer);

// Profile routes
router.get("/profile", getProfile);
router.put("/profile", validateUpdateProfile, updateProfile);

export default router;
