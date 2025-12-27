import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import { isShopkeeper, authMiddleware, isShopkeeperOrAdmin } from "../middlewares/auth.middleware";

const router = Router();

// ========= Shop Management Routes ==========
router.post("/create-shop", authMiddleware, shop.createShop);
router.put("/update-shop", isShopkeeper, shop.updateShop);

// ========== Product Management Routes ==========
const product = Router();
router.get("/get-all-categories", shop.getShopCategories);
router.get("/get-all-global-product", shop.getGlobalProducts);
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

// ========== Other Shop Routes ==========
const order = Router();
router.use("/orders", isShopkeeper, order);
order.get("/get-current-orders", shop.getCurrentOrders);
order.get("/order/:orderId", shop.getOrderById);
order.put("/order/status/:orderId", shop.updateOrderStatus);
// order.get("/get-order-history", shop.getOrderHistory);

// order.get("/get-user:phone", shop.getUserByPhone);
// router.patch("/send-invite-to-delivery", shop.sendInviteToDeliveryPartner);

// ========== Rider Management Routes ==========
router.get("/get-riders", isShopkeeper, shop.getShopRiders);
router.patch("/approve-rider", isShopkeeper, shop.approveRider);
router.delete("/reject-rider", isShopkeeper, shop.rejectRider);

export default router;
