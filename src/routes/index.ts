import { Router } from "express";
import userRouter from "./user.route";
import shopRouter from "./shop.route";
import customerRouter from "./customer.route";
import deliveryRouter from "./delivery.route";
import fileuploadRouter from "./fileupload.route";
import adminRouter from "./admin.route";

const router = Router();

router.use("/users", userRouter);
router.use("/shops", shopRouter);
router.use("/customers", customerRouter);
router.use("/delivery", deliveryRouter);
router.use("/uploads", fileuploadRouter);

// Admin Routes
router.use("/admin", adminRouter);

export default router;
