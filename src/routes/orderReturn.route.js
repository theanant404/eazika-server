import { Router } from "express";
import {
  requestReturn,
  processReturn,
  markRefunded,
  getReturnStatus
} from "../controllers/orderReturn.controller.js";
import { validateReturnRequest } from "../validations/return.validation.js";
import { ensureCustomer } from "../middlewares/customer.middleware.js";
import { ensureShopkeeper } from "../middlewares/shopkeeper.middleware.js";

const router = Router();

router.post("/", ensureCustomer, validateReturnRequest, requestReturn);
router.get("/:orderItemId", getReturnStatus);
router.patch("/:id/process", ensureShopkeeper, processReturn);
router.patch("/:id/mark-refunded", ensureShopkeeper, markRefunded);

export default router;
