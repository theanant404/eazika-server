import { Router } from "express";
import userRouter from "./user.route";
// import shopRouter from "@/routes/shop.route";
// import customerRouter from "@/routes/customer.route";
// import deliveryRouter from "@/routes/delivery.route";
// import adminRouter from "@/routes/admin.route";

const router = Router();

router.use("/users", userRouter);

// router.use("/shops", shopRouter);
// router.use("/customers", customerRouter);
// router.use("/deliveries", deliveryRouter);
// router.use("/admin", adminRouter);

export default router;
