import { Router } from "express";
import {
  browseProducts,
  getProductDetails,
  getShopProducts,
  getCategories,
  getSearchSuggestions
} from "../controllers/productCatalog.controller.js";

const router = Router();

// Public product browsing routes
router.get("/products", browseProducts);
router.get("/products/:id", getProductDetails);
router.get("/shops/:shopId/products", getShopProducts);
router.get("/categories", getCategories);
router.get("/search-suggestions", getSearchSuggestions);

export default router;
