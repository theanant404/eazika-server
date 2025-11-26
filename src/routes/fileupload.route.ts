import { Router } from "express";
import { isShopkeeperOrAdmin } from "../middlewares/auth.middleware";
import {
  uploadProdectImages,
  uploadProfilePicture,
} from "../controllers/fileupload.controller";

const router = Router();

router.post("/profile-picture", uploadProfilePicture);
router.post("/product-images", isShopkeeperOrAdmin, uploadProdectImages);

export default router;
