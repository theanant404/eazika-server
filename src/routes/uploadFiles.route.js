import { Router } from "express";
import * as auth from "../middlewares/auth.middleware.js";
import { uploadFiles } from "../controllers/uploadFiles.controller.js";
// import { uploadImages } from "../middlewares/upload.middleware.js";
import multer from "multer";
const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
});
// Customer order routes
router.post("/", auth.verifyJWT, upload.single("image"), uploadFiles);
router.post("/user", auth.verifyJWT, upload.single("image"), uploadFiles);
// router.post("/product", auth.isShopkeeper, upload.single("image"), uploadFiles);

export default router;
