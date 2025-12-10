import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import { isShopkeeper, authMiddleware } from "../middlewares/auth.middleware";

const router = Router();
const product = Router();

// ========= Shop Management Routes ==========
router.post("/create-shop", authMiddleware, shop.createShop);
router.put("/update-shop", isShopkeeper, shop.updateShop);

// ========== Product Management Routes ==========
router.use("/products", isShopkeeper, product); // all product routes require shopkeeper authentication
product.get("/get-all-categories", shop.getShopCategories);
product.post("/add-shop-product", shop.addShopProduct);
product.get("/get-all-product", shop.getShopProducts);
product.get("/get-all-global-product", shop.getGlobalProducts);
// product.post("/add-shop-global-product", shop.addShopGlobalProduct);
product.put(
  "/update-shop-product-stock-and-price/:priceId",
  shop.updateStockAndPrice
);
product.delete("/delete-shop-product/:productId", shop.deleteShopProduct);
product.put("/update-shop-product/:productId", shop.updateShopProduct);

// ========== Other Shop Routes ==========
router.get("/get-user:phone", isShopkeeper, shop.getUserByPhone);
router.patch(
  "/send-invite-to-delivery",
  isShopkeeper,
  shop.sendInviteToDeliveryPartner
);

export default router;
