import { Router } from "express";
import { isShopkeeperOrAdmin } from "../middlewares/auth.middleware";
import {
  uploadProdectImages,
  uploadProfilePicture,
} from "../controllers/fileupload.controller";
import {
  getMultipleSignedUrls,
  getSignedUrl,
} from "../controllers/upload-image.controller";

const router = Router();

router.post("/profile-picture", uploadProfilePicture);
router.post("/product-images", isShopkeeperOrAdmin, uploadProdectImages);
// added routes for signed URLs
router.post("/avatar", getSignedUrl);
router.post("/product", getMultipleSignedUrls);

export default router;
