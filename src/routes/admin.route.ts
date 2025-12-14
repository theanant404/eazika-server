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
router.patch("/shops/:shopId/verify", adminController.verifyShop);

// --------- Rider Management Routes ---------
router.get("/riders/get-all", adminController.getAllRiders);

// --------- Order Management Routes ---------
router.get("/orders/get-all", adminController.getAllOrders);

// --------- Product Category Management Routes ---------
router.get("/products/get-categories", adminController.getAllProductCategories);
router.post("/products/create-category", adminController.createProductCategory);
router.post("/products/add-global", adminController.createGlobalProduct);
router.post(
  "/products/add-global-in-bluk",
  adminController.createGlobalProductsBulk
);

export default router;