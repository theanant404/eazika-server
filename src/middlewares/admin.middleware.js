import auth from './auth.middleware.js';

/**
 * Ensure the requester is authenticated AND has ADMIN role.
 */
export const ensureAdmin = [
  auth,
  (req, res, next) => {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }
    next();
  }
];
