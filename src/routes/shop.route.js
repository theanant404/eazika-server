import { Router } from "express";
import {
  // Existing shop routes
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  toggleShopStatus,
  
  // New dashboard and analytics routes
  getDashboardStats,
  getLowStockProducts,
  getShopOrders,
  updateOrderStatus,
  getShopProducts,
  updateProductStock
} from "../controllers/shop.controller.js";

import {
  // Product catalog routes (if these exist in product.controller.js)
  getGlobalProducts,
  addProductToShop,
  updateShopProduct,
  removeProductFromShop,
  toggleProductAvailability,
  getProductCategories
} from "../controllers/product.controller.js";

import {
  shopManagementMiddleware,
  shopOwnershipMiddleware,
  productOwnershipMiddleware
} from "../middlewares/shop.middleware.js";

import { validateShop, validateShopProduct } from "../validations/shop.validation.js";

const router = Router();

// ==================== DASHBOARD ROUTES ====================
// Dashboard statistics for shopkeeper homepage
router.get("/dashboard/stats", ...shopManagementMiddleware, getDashboardStats);

// Low stock products with customizable threshold
router.get("/products/low-stock", ...shopManagementMiddleware, getLowStockProducts);

// ==================== SHOP MANAGEMENT ROUTES ====================
// Basic shop CRUD operations
router.get("/shops", ...shopManagementMiddleware, getShops);
router.get("/shops/:id", ...shopOwnershipMiddleware, getShop);
router.post("/shops", ...shopManagementMiddleware, validateShop, createShop);
router.put("/shops/:id", ...shopOwnershipMiddleware, validateShop, updateShop);
router.delete("/shops/:id", ...shopOwnershipMiddleware, deleteShop);
router.patch("/shops/:id/toggle-status", ...shopOwnershipMiddleware, toggleShopStatus);

// ==================== ORDER MANAGEMENT ROUTES ====================
// Get orders for shopkeeper (with filtering by status)
router.get("/orders", ...shopManagementMiddleware, getShopOrders);

// Get orders for specific shop
router.get("/shops/:shopId/orders", ...shopOwnershipMiddleware, (req, res, next) => {
  req.query.shopId = req.params.shopId;
  next();
}, getShopOrders);

// Update order status (confirm, ready for pickup, delivered, etc.)
router.patch("/orders/:orderId/status", ...shopManagementMiddleware, updateOrderStatus);

// ==================== PRODUCT MANAGEMENT ROUTES ====================
// Get all products across shopkeeper's shops (with filtering and search)
router.get("/products", ...shopManagementMiddleware, getShopProducts);

// Get products for specific shop
router.get("/shops/:shopId/products", ...shopOwnershipMiddleware, (req, res, next) => {
  req.query.shopId = req.params.shopId;
  next();
}, getShopProducts);

// Update product stock quantity
router.patch("/products/:productId/stock", ...shopManagementMiddleware, updateProductStock);

// ==================== PRODUCT CATALOG ROUTES ====================
// Global product catalog for adding to shop
router.get("/products/global", ...shopManagementMiddleware, getGlobalProducts);
router.get("/products/categories", ...shopManagementMiddleware, getProductCategories);

// ==================== SHOP PRODUCT CRUD ROUTES ====================
// Add product from global catalog to shop
router.post("/shops/:shopId/products", ...shopOwnershipMiddleware, validateShopProduct, addProductToShop);

// Update shop-specific product details (price, discount, etc.)
router.put("/products/:id", ...productOwnershipMiddleware, updateShopProduct);

// Remove product from shop
router.delete("/products/:id", ...productOwnershipMiddleware, removeProductFromShop);

// Toggle product availability in shop
router.patch("/products/:id/toggle", ...productOwnershipMiddleware, toggleProductAvailability);

export default router;
