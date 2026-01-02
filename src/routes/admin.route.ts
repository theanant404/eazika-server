import { Router } from "express";
import * as adminController from "../controllers/admin.controller";

const router = Router();

// --------- Dashboard Stats ---------
router.get("/stats", adminController.getDashboardStats);
router.get("/map/live-data", adminController.getLiveMapData);

// --------- Admin User Management Routes ---------
router.get("/users/get-all-users", adminController.getAllUsers);

// --------- Shop Management Routes ---------
router.get("/shops/get-all", adminController.getAllShops);
router.get("/shops/get-pending-verification", adminController.getShopsPendingVerification);
router.get("/shops/get-all-addresses", adminController.getAllShopAddresses);
router.patch("/shops/:shopId/verify", adminController.verifyShop);
router.patch("/shops/:shopId/status", adminController.toggleShopStatus);

// --------- Rider Management Routes ---------
router.get("/riders/get-all", adminController.getAllRiders);

// --------- Order Management Routes ---------
router.get("/orders/get-all", adminController.getAllOrders);

// --------- Product Category Management Routes ---------
router.get("/products/get-categories", adminController.getAllProductCategories);
router.post("/products/create-category", adminController.createProductCategory);
router.put("/products/update-category/:id", adminController.updateProductCategory);

router.post("/products/add-global", adminController.createGlobalProduct);

router.post(
  "/products/add-global-in-bluk",
  adminController.createGlobalProductsBulk
);

// Global Products Management
router.get("/products/get-all-global-product", adminController.getAllGlobalProducts);
router.get("/products/global/:id", adminController.getGlobalProductById);
router.patch("/products/update-global-product/:id", adminController.updateGlobalProduct);
router.patch("/products/toggle-global-product-status/:productId", adminController.toggleGlobalProductStatus);

// Shop Products Management
router.get("/products/shop", adminController.getAllShopProducts);
router.patch("/products/shop/:id/status", adminController.toggleShopProductStatus);

export default router;