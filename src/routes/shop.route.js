import { Router } from "express";
import {
  getShops,
  getShop,
  createShop,
  updateShop,
  deleteShop,
  toggleShopStatus
} from "../controllers/shop.controller.js";
import {
  getGlobalProducts,
  getShopProducts,
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

// Shop routes
router.get("/shops", ...shopManagementMiddleware, getShops);
router.get("/shops/:id", ...shopOwnershipMiddleware, getShop);
router.post("/shops", ...shopManagementMiddleware, validateShop, createShop);
router.put("/shops/:id", ...shopOwnershipMiddleware, validateShop, updateShop);
router.delete("/shops/:id", ...shopOwnershipMiddleware, deleteShop);
router.patch("/shops/:id/toggle-status", ...shopOwnershipMiddleware, toggleShopStatus);

// Product catalog routes
router.get("/products/global", ...shopManagementMiddleware, getGlobalProducts);
router.get("/products/categories", ...shopManagementMiddleware, getProductCategories);

// Shop product routes
router.get("/shops/:shopId/products", ...shopManagementMiddleware, getShopProducts);
router.post("/shops/:shopId/products", ...shopManagementMiddleware, validateShopProduct, addProductToShop);
router.put("/products/:id", ...productOwnershipMiddleware, updateShopProduct);
router.delete("/products/:id", ...productOwnershipMiddleware, removeProductFromShop);
router.patch("/products/:id/toggle", ...productOwnershipMiddleware, toggleProductAvailability);

export default router;
