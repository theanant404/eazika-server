import { Router } from "express";
import * as shop from "../controllers/shop.controller.js";
import { isShopkeeper, authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// ========= Shop Management Routes ==========
router.post("/create-shop", authMiddleware, shop.createShop); // POST /api/v2/shops/create-shop - Create new shop (converts user to shopkeeper role)
router.put("/update-shop", isShopkeeper, shop.updateShop); // PUT /api/v2/shops/update-shop - Update shop details (name, category, images, FSSAI, GST)

// ========== Product Management Routes ==========
router.get("/products", isShopkeeper, shop.getShopProducts);
router.get("/products/get-global", isShopkeeper, shop.getGlobalProducts);
router.post("/products/add-shop-product", isShopkeeper, shop.addShopProduct);
router.post(
  "/products/add-shop-global-product",
  isShopkeeper,
  shop.addShopGlobalProduct
);

router.put(
  "/update-shop-product/:productId",
  isShopkeeper,
  shop.updateShopProduct
);
router.put(
  "/update-shop-product-stock/:productId",
  isShopkeeper,
  shop.updateShopProductStock
);
router.get("/get-user:phone", isShopkeeper, shop.getUserByPhone);
router.patch(
  "/send-invite-to-delivery",
  isShopkeeper,
  shop.sendInviteToDeliveryPartner
);

export default router;
