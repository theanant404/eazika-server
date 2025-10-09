import { Router } from "express";
import userRouter from "./auth.route.js";
import customerRouter from "./customer.route.js";
import addressRouter from "./address.route.js";
import shopkeeperRouter from "./shopkeeper.route.js";
import shopRouter from "./shop.route.js";
import productCatalogRouter from "./productCatalog.route.js";
import cartRouter from "./cart.route.js";
import orderRouter from "./order.route.js";
import deliveryBoyRouter from "./deliveryBoy.route.js";
import deliveryRouter from "./delivery.route.js";
import orderReturnRouter from "./orderReturn.route.js";
import productReviewRouter from "./productReview.route.js";
import adminRouter from "./admin.route.js";
import uploadFilesRouter from "./uploadFiles.route.js";

const router = Router();

router.use("/user", userRouter);
router.use("/customer", customerRouter);
router.use("/addresses", addressRouter);
router.use("/shopkeeper", shopkeeperRouter);
router.use("/shop", shopRouter);
router.use("/catalog", productCatalogRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use("/deliveryBoy", deliveryBoyRouter);
router.use("/delivery", deliveryRouter);
router.use("/returns", orderReturnRouter);
router.use("/reviews", productReviewRouter);
router.use("/admin", adminRouter);
router.use("/upload-files", uploadFilesRouter);

export default router;
