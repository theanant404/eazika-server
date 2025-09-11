import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  toggleAvailability
} from '../controllers/deliveryBoy.controller.js';
import {
  ensureDeliveryBoy,
  requireDeliveryBoyProfileComplete
} from '../middlewares/deliveryBoy.middleware.js';
import { validateDeliveryBoyProfile } from '../validations/deliveryBoy.validation.js';

const router = Router();

// Get delivery boy profile - only role verification needed
router.get('/profile', ensureDeliveryBoy, getProfile);

// Update profile - role verification + validate input schema
router.put('/profile', ensureDeliveryBoy, validateDeliveryBoyProfile, updateProfile);

// Toggle availability - role verification + require profile completion
router.patch('/availability', ensureDeliveryBoy, requireDeliveryBoyProfileComplete, toggleAvailability);

export default router;
