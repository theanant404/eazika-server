import { Router } from "express";
import userRouter from "./auth.route.js";
import customerRouter from "./customer.route.js";
import addressRouter from "./address.route.js";
import shopkeeperRouter from "./shopkeeper.route.js";
import shopRouter from "./shop.route.js";
import productCatalogRouter from "./productCatalog.route.js";
import cartRouter from "./cart.route.js";
import orderRouter from "./order.route.js";
import deliveryBoyRouter from './deliveryBoy.route.js';
import deliveryRouter from './delivery.route.js';

const router = Router();

router.use("/user", userRouter);
router.use("/customer", customerRouter);
router.use("/addresses", addressRouter);
router.use("/shopkeeper", shopkeeperRouter);
router.use("/shop", shopRouter);
router.use("/catalog", productCatalogRouter);
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use('/deliveryBoy', deliveryBoyRouter);
router.use('/delivery', deliveryRouter);

export default router;
