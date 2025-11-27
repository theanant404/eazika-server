import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import * as auth from "../middlewares/auth.middleware";

const router = Router();

/**
 * Shop Management Routes
 * Base path: /api/v2/shops/*
 *
 * These routes handle shop creation, updates, product management, and delivery partner invitations.
 * Most routes require 'shopkeeper' role except shop creation which requires any authenticated user.
 *
 * Middleware:
 * - auth.authMiddleware: Verifies JWT token, attaches user to req
 * - auth.isShopkeeper: Verifies user has 'shopkeeper' role
 */

// Shop Profile Management
router.post("/create-shop", auth.authMiddleware, shop.createShop); // POST /api/v2/shops/create-shop - Create new shop (converts user to shopkeeper role)
router.put("/update-shop", auth.isShopkeeper, shop.updateShop); // PUT /api/v2/shops/update-shop - Update shop details (name, category, images, FSSAI, GST)

/**
 * Product Management Routes
 *
 * Shopkeepers can manage their product inventory:
 * - Add new products (global or custom)
 * - Update product details (name, description, images, prices)
 * - Update stock levels
 *
 * Products can be either:
 * 1. Global products: Linked to platform-wide product catalog
 * 2. Custom products: Shop-specific products with custom details
 */
router.post("/add-shop-product", auth.isShopkeeper, shop.addShopProduct); // POST /api/v2/shops/add-shop-product - Add product to shop inventory
router.put(
  "/update-shop-product/:productId",
  auth.isShopkeeper,
  shop.updateShopProduct
); // PUT /api/v2/shops/update-shop-product/:productId - Update product details
router.put(
  "/update-shop-product-stock/:productId",
  auth.isShopkeeper,
  shop.updateShopProductStock
); // PUT /api/v2/shops/update-shop-product-stock/:productId - Update product stock quantity

/**
 * Delivery Partner Management
 *
 * Shopkeepers can invite users to become delivery partners for their shop.
 * - Search for users by phone number
 * - Send invitation to user to become delivery partner
 * - Invited users must accept and complete delivery profile with KYC documents
 */
router.get("/get-user:phone", auth.isShopkeeper, shop.getUserByPhone); // GET /api/v2/shops/get-user:phone?phone=xxx - Find user by phone to invite as delivery partner
router.patch(
  "/send-invite-to-delivery",
  auth.isShopkeeper,
  shop.sendInviteToDeliveryPartner
); // PATCH /api/v2/shops/send-invite-to-delivery - Send delivery partner invitation to user

export default router;
