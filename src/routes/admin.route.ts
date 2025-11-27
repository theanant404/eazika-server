import { Router } from "express";
import * as adminController from "../controllers/admin.controller";

const router = Router();

//          --------- Admin User Management Routes ---------
router.get("/users/get-all-users", adminController.getAllUsers);

//           --------- Product Category Management Routes ---------
router.get("/products/get-categories", adminController.getAllProductCategories);
router.post("/products/create-category", adminController.createProductCategory);
router.post("/products/add-global", adminController.createGlobalProduct);
router.post(
  "/products/add-global-in-bluk",
  adminController.createGlobalProductsBulk
);

export default router;
