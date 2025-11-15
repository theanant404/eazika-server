import { Router } from "express";
import * as delivery from "../controllers/delivery.controller.js";
import * as auth from "../middlewares/auth.middleware.js";

const router = Router();

/* -------- Delivery Partner Routes -------- */
router.post(
  "/create-delivery-profile",
  auth.authMiddleware,
  delivery.createDeliveryProfile
);
router.put(
  "/update-delivery-profile",
  auth.isDeliveryBoy,
  delivery.updateDeliveryProfile
);

// track orders assigned to delivery partner

router.get(
  "/get-assigned-orders",
  auth.isDeliveryBoy,
  delivery.getAssignedOrders
);

export default router;
