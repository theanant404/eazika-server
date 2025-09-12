import { Router } from "express";
import verifyJWT from '../middlewares/auth.middleware.js';
import { ensureShopkeeper } from "../middlewares/shop.middleware.js";

import {
  createOrder,
  getCustomerOrders,
  getOrderDetails,
  cancelOrder,
  rateOrder
} from "../controllers/order.controller.js";
import {
  getShopOrders,
  acceptOrder,
  rejectOrder,
  markOrderReady,
  getOrderStats
} from "../controllers/orderShop.controller.js";
import {
  customerOrderMiddleware,
  customerOrderOwnershipMiddleware
} from "../middlewares/order.middleware.js";
import {
  shopManagementMiddleware,
  shopOwnershipMiddleware
} from "../middlewares/shop.middleware.js";
import { validateShopOrderOwnership } from "../middlewares/order.middleware.js";
import {
  validateCreateOrder,
  validateUpdateOrderStatus,
  validateOrderRating
} from "../validations/order.validation.js";

const router = Router();

// Customer order routes
router.post("/", ...customerOrderMiddleware, validateCreateOrder, createOrder);
router.get("/", ...customerOrderMiddleware, getCustomerOrders);
router.get("/:id", ...customerOrderOwnershipMiddleware, getOrderDetails);
router.patch("/:id/cancel", ...customerOrderOwnershipMiddleware, cancelOrder);
router.post("/:id/rating", ...customerOrderOwnershipMiddleware, validateOrderRating, rateOrder);

// Shop order management routes
router.get("/shop/orders", ...shopManagementMiddleware, getShopOrders);
router.get("/shop/stats", ...shopManagementMiddleware, getOrderStats);
router.patch("/shop/:id/accept", verifyJWT, ensureShopkeeper, validateShopOrderOwnership, acceptOrder);
router.patch("/shop/:id/reject", verifyJWT, ensureShopkeeper, validateShopOrderOwnership, rejectOrder);
router.patch("/shop/:id/ready", verifyJWT, ensureShopkeeper, validateShopOrderOwnership, markOrderReady);

export default router;
