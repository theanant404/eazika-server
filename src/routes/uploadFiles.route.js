import { Router } from "express";
import * as auth from "../middlewares/auth.middleware.js";
import { uploadFiles } from "../controllers/uploadFiles.controller.js";

const router = Router();

// Customer order routes
router.post("/", uploadFiles);
router.post("/user", auth.verifyJWT, uploadFiles);
router.post("/product", auth.isShopkpeer, uploadFiles);

export default router;
