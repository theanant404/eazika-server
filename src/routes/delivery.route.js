import { Router } from 'express';
import {
  getAvailableOrders,
  claimOrder,
  markPickedUp,
  markDelivered,
  getAssignedOrders,
  getDeliveryHistory
} from '../controllers/orderDelivery.controller.js';
import { ensureDeliveryBoy, requireDeliveryBoyProfileComplete } from '../middlewares/deliveryBoy.middleware.js';

const router = Router();

router.use(ensureDeliveryBoy);
//router.use(requireDeliveryBoyProfileComplete);

// List available delivery orders (unassigned)
router.get('/orders/available', getAvailableOrders);

// Claim an available order
router.patch('/orders/:id/claim', claimOrder);

// Mark order as picked up
router.patch('/orders/:id/pickedup', markPickedUp);

// Mark order as delivered
router.patch('/orders/:id/delivered', markDelivered);

// List assigned delivery orders in-progress
router.get('/orders/assigned', getAssignedOrders);

// List delivery history (completed)
router.get('/orders/history', getDeliveryHistory);

export default router;
