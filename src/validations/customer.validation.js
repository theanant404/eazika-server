
import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  profileImage: z.string().url().optional()
});

export const validateUpdateProfile = (req, res, next) => {
  try {
    updateProfileSchema.parse(req.body);
    return next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.errors[0].message
    });
  }
};
