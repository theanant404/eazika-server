import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import { isShopkeeper, authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// ========= Shop Management Routes ==========
router.get("/get-shop-status", authMiddleware, shop.getShopStatus);
router.post("/create-shop", authMiddleware, shop.createShop);
router.put("/update-shop", isShopkeeper, shop.updateShop);
router.put("/update-shop-address", isShopkeeper, shop.updateShopkeeperAddress);
router.get("/get-shop-address", isShopkeeper, shop.getShopkeeperAddress);
router.get("/shop-geo-location", isShopkeeper, shop.getShopGeoLocation);
router.get("/profile", isShopkeeper, shop.getShopDetails);
router.get("/analytics", isShopkeeper, shop.getShopAnalytics);
// Shop schedule routes
router.post("/schedule", isShopkeeper, shop.upsertShopSchedule);
router.get("/schedule", isShopkeeper, shop.getShopSchedule);
// Minimum order value routes
router.post("/min-order", isShopkeeper, shop.upsertMinOrderValue);
router.get("/min-order/", isShopkeeper, shop.getMinOrderValue);
// Delivery rates routes
router.post("/delivery-rates", isShopkeeper, shop.upsertDeliveryRates);
router.get("/delivery-rates", isShopkeeper, shop.getDeliveryRates);

// ========== Product Management Routes ==========
const product = Router();
router.get("/get-all-categories", shop.getShopCategories);
router.get("/get-all-global-product", shop.getGlobalProducts);
router.get("/products/search-shop-products", shop.searchShopProducts);
router.get("/products/search-global-products", shop.searchGlobalProducts);
router.use("/products", isShopkeeper, product); // all product routes require shopkeeper authentication
product.get("/get-all-categories", shop.getShopCategories);
product.post("/add-shop-product", shop.addShopProduct);
product.get("/get-all-categories", shop.getShopCategories);
product.get("/get-all-global-product", shop.getGlobalProducts);
// product.post("/add-shop-product-from-global-catalog", shop.addShopProductFromGlobleProduct);
product.get("/get-all-product", shop.getShopProducts);
product.get("/get-all-global-product", shop.getGlobalProducts);
product.post("/add-shop-product-from-global-catalog", shop.addShopGlobalProduct);
product.put(
  "/update-shop-product-stock-and-price",
  shop.updateStockAndPrice
);
// product.delete("/delete-shop-product/:productId", shop.deleteShopProduct);
product.put("/update-shop-product/:productId", shop.updateShopProduct);
// Toggle product active status (expects { productId, isActive })
product.patch("/update-product-status", shop.updateShopProductStatus);
// Alternate: by param
product.patch("/update-shop-product-activity/:productId/status", shop.updateShopProductStatus);

// ========== Other Shop Routes ==========
const order = Router();
router.use("/orders", isShopkeeper, order);
order.get("/get-current-orders", shop.getCurrentOrders);
order.get("/get-orders", shop.getOrders);
order.get("/order/:orderId", shop.getOrderById);
order.put("/order/status/:orderId", shop.updateOrderStatus);
// order.get("/get-order-history", shop.getOrderHistory);

// order.get("/get-user:phone", shop.getUserByPhone);
// router.patch("/send-invite-to-delivery", shop.sendInviteToDeliveryPartner);

// ========== Rider Management Routes ==========
router.get("/get-riders", isShopkeeper, shop.getShopRiders);
router.patch("/toggle-rider-status", isShopkeeper, shop.approveRider);
router.delete("/reject-rider/:riderId", isShopkeeper, shop.rejectRider);
router.patch("/suspend-rider", isShopkeeper, shop.suspendRider);
router.get("/riders/analytics", isShopkeeper, shop.getRiderAnalytics);
router.get("/riders/:riderId/analytics", isShopkeeper, shop.getRiderDetailedAnalytics);

export default router;
