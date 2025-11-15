import { Router } from "express";
import * as customer from "../controllers/customers.controller.js";

const router = Router();

// cart routes
router.post("/add-to-cart", customer.addToCart);
router.get("/get-cart", customer.getCart);
router.put("/update-cart-item/:itemId", customer.updateCartItem);
router.delete("/remove-cart-item/:itemId", customer.removeCartItem);
router.delete("/clear-cart", customer.clearCart);

// order routes
router.post("/create-order", customer.createOrder);
router.get("/get-order/:orderId", customer.getOrder);
router.get("/get-orders", customer.getOrders);
router.get("track-order/:orderId", customer.trackOrder);
router.put(
  "/cancel-order-by-customer/:orderId",
  customer.cancelOrderByCustomer
);

export default router;
