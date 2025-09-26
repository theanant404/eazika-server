import { Router } from 'express';
import {
  getAdminDashboard,
  listUsers,
  getUserDetails,
  updateUserStatus,
  updateUserRole,
  listShops,
  getShopDetails,
  approveShop,
  rejectShop,
  listOrders,
  getOrderDetails,
  listReturns,
  listReviews,
  getAnalytics
} from '../controllers/admin.controller.js';
import { ensureAdmin } from '../middlewares/admin.middleware.js';

const router = Router();

router.use(ensureAdmin);

// Dashboard
router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAnalytics);

// User management
router.get('/users', listUsers);
router.get('/users/:id', getUserDetails);
router.patch('/users/:id/status', updateUserStatus);
router.patch('/users/:id/role', updateUserRole);

// Shop management
router.get('/shops', listShops);
router.get('/shops/:id', getShopDetails);
router.patch('/shops/:id/approve', approveShop);
router.patch('/shops/:id/reject', rejectShop);

// Order management
router.get('/orders', listOrders);
router.get('/orders/:id', getOrderDetails);

// Return management
router.get('/returns', listReturns);

// Review management
router.get('/reviews', listReviews);

export default router;
