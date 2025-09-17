import { Router } from "express";
import {
  createProductReview,
  getProductReviews,
  getShopReviews,
  getCustomerReviews,
  moderateReview
} from "../controllers/productReview.controller.js";
import { validateProductReview } from "../validations/productReview.validation.js";
import { ensureCustomer } from "../middlewares/customer.middleware.js";
import {  ensureAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// Customer routes
router.post("/", ensureCustomer, validateProductReview, createProductReview);
router.get("/my-reviews", ensureCustomer, getCustomerReviews);

// Public routes
router.get("/product/:shopProductId", getProductReviews);
router.get("/shop/:shopId", getShopReviews);

// Admin routes
router.patch("/:id/moderate", ensureAdmin, moderateReview);

export default router;
