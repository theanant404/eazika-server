import { Router } from "express";
import userRouter from "./user.route";
import shopRouter from "./shop.route";
import customerRouter from "./customer.route";
import deliveryRouter from "./delivery.route";

// import adminRouter from "@/routes/admin.route";

import * as auth from "../middlewares/auth.middleware.js";

const router = Router();

router.use("/users", userRouter);
router.use("/shops", shopRouter);
router.use("/customers", auth.authMiddleware, customerRouter);
router.use("/delivery", deliveryRouter);

// router.use("/admin", adminRouter);

export default router;
