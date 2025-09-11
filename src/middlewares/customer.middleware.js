import prisma from '../config/dbConfig.js';
import auth from './auth.middleware.js';

// Ensure user is customer
export const ensureCustomer = [
  auth,
  (req, res, next) => {
    if (req.user.role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        error: 'Customer access required'
      });
    }
    next();
  }
];

// Check if customer profile is complete
export const requireCompleteProfile = [
  ...ensureCustomer,
  async (req, res, next) => {
    try {
      const profile = await prisma.customerProfile.findUnique({
        where: { userId: req.user.id },
        include: {
          user: {
            select: { name: true, email: true }
          }
        }
      });

      if (!profile) {
        return res.status(400).json({
          success: false,
          error: 'Please complete your customer profile first'
        });
      }

      req.customerProfile = profile;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to validate customer profile'
      });
    }
  }
];
