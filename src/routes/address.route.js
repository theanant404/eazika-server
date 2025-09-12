import { Router } from "express";
import { 
  getAddresses, 
  addAddress, 
  updateAddress, 
  deleteAddress,
  setDefaultAddress 
} from "../controllers/address.controller.js";
import { 
  addressCreateMiddleware,
  addressUpdateMiddleware,
  addressAccessMiddleware
} from "../middlewares/address.middleware.js";
import { ensureCustomer } from "../middlewares/customer.middleware.js";

const router = Router();

// Get all addresses - only customer auth needed
router.get("/", ensureCustomer, getAddresses);

// Add new address - full validation
router.post("/", ...addressCreateMiddleware, addAddress);

// Update address - ownership + validation
router.put("/:id", ...addressUpdateMiddleware, updateAddress);

// Delete address - ownership check
router.delete("/:id", ...addressAccessMiddleware, deleteAddress);

// Set default address - ownership check
router.patch("/:id/default", ...addressAccessMiddleware, setDefaultAddress);

export default router;
