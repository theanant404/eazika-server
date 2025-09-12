import prisma from '../config/dbConfig.js';
import verifyJWT from './auth.middleware.js';

/**
 * Middleware to ensure the user is authenticated and has the DELIVERY_BOY role.
 */
export const ensureDeliveryBoy = [
  verifyJWT,
  (req, res, next) => {
    if (req.user.role !== 'DELIVERY_BOY') {
      return res.status(403).json({
        success: false,
        error: 'Delivery Boy access required'
      });
    }
    next();
  }
];

/**
 * Middleware to ensure the delivery boy's profile is complete before accessing delivery operations.
 * Checks for vehicleType, vehicleNumber, and at least one document in metadata.docs.
 */
export const requireDeliveryBoyProfileComplete = async (req, res, next) => {
  try {
    const profile = await prisma.deliveryProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!profile) {
      return res.status(400).json({
        success: false,
        error: 'Delivery profile not found'
      });
    }

    const { vehicleType, vehicleNumber, metadata } = profile;
    const docs = metadata?.docs || [];

    if (!vehicleType || !vehicleNumber || docs.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Complete your delivery profile to access this resource',
        action: 'COMPLETE_PROFILE'
      });
    }

    next();
  } catch (error) {
    console.error('Error checking delivery profile completion:', error);
    res.status(500).json({
      success: false,
      error: 'Error verifying delivery profile completion'
    });
  }
};
