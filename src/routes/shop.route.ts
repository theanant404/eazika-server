import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import * as auth from "../middlewares/auth.middleware";

const router = Router();

// shop routes
router.post("/create-shop", auth.authMiddleware, shop.createShop);
router.put("/update-shop", auth.isShopkeeper, shop.updateShop);

// product routes
router.post("/add-shop-product", auth.isShopkeeper, shop.addShopProduct);
router.put(
  "/update-shop-product/:productId",
  auth.isShopkeeper,
  shop.updateShopProduct
);
router.put(
  "/update-shop-product-stock/:productId",
  auth.isShopkeeper,
  shop.updateShopProductStock
);

// Manage Delivery Partners
router.get("/get-user:phone", auth.isShopkeeper, shop.getUserByPhone);
router.patch(
  "/send-invite-to-delivery",
  auth.isShopkeeper,
  shop.sendInviteToDeliveryPartner
);

export default router;
