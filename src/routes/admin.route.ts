import { Router } from "express";
import * as adminController from "../controllers/admin.controller";

const router = Router();

// --------- Dashboard Stats ---------
router.get("/stats", adminController.getDashboardStats);

// --------- Admin User Management Routes ---------
router.get("/users/get-all-users", adminController.getAllUsers);

// --------- Shop Management Routes ---------
router.get("/shops/get-all", adminController.getAllShops);
router.patch("/shops/:shopId/verify", adminController.verifyShop);

// --------- Product Category Management Routes ---------
router.get("/products/get-categories", adminController.getAllProductCategories);
router.post("/products/create-category", adminController.createProductCategory);
router.post("/products/add-global", adminController.createGlobalProduct);
router.post(
  "/products/add-global-in-bluk",
  adminController.createGlobalProductsBulk
);

export default router;