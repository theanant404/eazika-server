import { Router } from "express";
import * as customer from "../controllers/customers.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();

/* ----------- Product Browsing Routes ----------- */
router.get("/cities", customer.getAvailableCities);
router.get("/products", customer.getProducts);
router.get("/products/:productId", customer.getProductById);

/* ---------------------- Cart Management Routes ------------------- */
const cart = Router();
router.use("/carts", authMiddleware, cart);

cart.get("/get-cart", customer.getCart);
cart.post("/add-to-cart", customer.addToCart);
cart.put("/update-cart-item/:itemId", customer.updateCartItem);
cart.delete("/remove-cart-item/:itemId", customer.removeCartItem);
cart.delete("/clear-cart", customer.clearCart);

/* ----------- Shopping Cart Routes ----------- */
router.post("/add-to-cart", authMiddleware, customer.addToCart);
router.get("/get-cart", authMiddleware, customer.getCart);
router.put(
  "/update-cart-item/:itemId",
  authMiddleware,
  customer.updateCartItem
); // PUT /api/v2/customers/update-cart-item/:itemId - Update cart item quantity
router.delete(
  "/remove-cart-item/:itemId",
  authMiddleware,
  customer.removeCartItem
); // DELETE /api/v2/customers/remove-cart-item/:itemId - Remove specific item from cart
router.delete("/clear-cart", authMiddleware, customer.clearCart); // DELETE /api/v2/customers/clear-cart - Remove all items from cart

/**
 * Order Management Routes
 *
 * Order workflow:
 * 1. Customer creates order from cart items
 * 2. Order status: pending -> confirmed -> shipped -> delivered
 * 3. Order can be cancelled by customer before shipping
 *
 * Payment methods supported:
 * - cash_on_delivery
 * - online_payment (future implementation)
 *
 * Orders include:
 * - Order items (products, prices, quantities)
 * - Delivery address
 * - Payment method
 * - Order status and tracking
 * - Assigned delivery partner (when available)
 */
router.post("/create-order", authMiddleware, customer.createOrder); // POST /api/v2/customers/create-order - Create new order from cart
router.get("/get-order/:orderId", authMiddleware, customer.getOrder); // GET /api/v2/customers/get-order/:orderId - Get specific order details
router.get("/get-orders", authMiddleware, customer.getOrders); // GET /api/v2/customers/get-orders - Get all orders for user (supports pagination & status filter)
router.get("/track-order/:orderId", authMiddleware, customer.trackOrder); // GET /api/v2/customers/track-order/:orderId - Track order status and delivery partner info
router.put(
  "/cancel-order-by-customer/:orderId",
  authMiddleware,
  customer.cancelOrderByCustomer
); // PUT /api/v2/customers/cancel-order-by-customer/:orderId - Cancel order (before shipping only)

export default router;
