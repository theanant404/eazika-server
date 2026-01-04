import { Router } from "express";
import * as adminController from "../controllers/admin.controller";

const router = Router();

// --------- Dashboard Stats ---------
router.get("/stats", adminController.getDashboardStats);
router.get("/map/live-data", adminController.getLiveMapData);
router.get("/map/active-locations", adminController.getActiveLocations);

// --------- Admin User Management Routes ---------
router.get("/users/get-all-users", adminController.getAllUsers);

// --------- Shop Management Routes ---------
router.get("/shops/get-all", adminController.getAllShops);
router.get("/shops/get-pending-verification", adminController.getShopsPendingVerification);
router.get("/shops/get-all-addresses", adminController.getAllShopAddresses);
router.get("/shops/:shopId/analytics", adminController.getShopAnalyticsById);
router.get("/shops/get-all-shops-details", adminController.getShopsDetails);
router.patch("/shops/:shopId/verify", adminController.verifyShop);
router.patch("/shops/:shopId/status", adminController.toggleShopStatus);
// router.get("/shops/get-all-shops-details", adminController.getShopsDetails);
// --------- Rider Management Routes ---------
router.get("/riders/get-all", adminController.getAllRiders);
router.get("/riders/:riderId/analytics", adminController.getRiderDeliveryAnalytics);
router.get("/riders/:riderId/order-history", adminController.getRiderOrderHistory);


// --------- Order Management Routes ---------
router.get("/orders/get-all", adminController.getAllOrders);
router.get("/orders/delivered/analytics", adminController.getDeliveredAnalytics);

// --------- Product Category Management Routes ---------
router.get("/products/get-categories", adminController.getAllProductCategories);
router.post("/products/create-category", adminController.createProductCategory);
router.put("/products/update-category/:id", adminController.updateProductCategory);

router.post("/products/add-global", adminController.createGlobalProduct);

router.post(
  "/products/add-global-in-bluk",
  adminController.createGlobalProductsBulk
);

router.post(
  "/products/upload-from-json",
  adminController.uploadProductsFromJson
);

// Global Products Management
router.get("/products/get-all-global-product", adminController.getAllGlobalProducts);
router.get("/products/global/:id", adminController.getGlobalProductById);
router.patch("/products/update-global-product/:id", adminController.updateGlobalProduct);
router.patch("/products/toggle-global-product-status/:productId", adminController.toggleGlobalProductStatus);

// Shop Products Management
router.get("/products/shop", adminController.getAllShopProducts);
router.patch("/products/shop/:id/status", adminController.toggleShopProductStatus);

// --------- Search Tracking Analytics Routes ---------
router.get("/search-tracking/analytics", adminController.getSearchTrackingAnalytics);
router.get("/search-tracking/list", adminController.getSearchTrackingList);
router.delete("/search-tracking/:id", adminController.deleteSearchTracking);
router.delete("/search-tracking", adminController.deleteAllSearchTracking);

export default router;