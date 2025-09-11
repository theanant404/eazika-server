import { Router } from "express";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} from "../controllers/cart.controller.js";
import {
  customerOrderMiddleware,
  cartMiddleware,
  cartItemOwnershipMiddleware
} from "../middlewares/order.middleware.js";
import { validateAddToCart, validateUpdateCart } from "../validations/order.validation.js";

const router = Router();

// Cart routes
router.get("/", ...customerOrderMiddleware, getCart);
router.post("/add", ...cartMiddleware, validateAddToCart, addToCart);
router.put("/:id", ...cartItemOwnershipMiddleware, validateUpdateCart, updateCartItem);
router.delete("/:id", ...cartItemOwnershipMiddleware, removeFromCart);
router.delete("/", ...customerOrderMiddleware, clearCart);

export default router;
