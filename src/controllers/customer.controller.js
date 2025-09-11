import prisma from '../config/dbConfig.js';
import { asyncHandler } from "../utils/asyncHandler.js";

// Get customer profile
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.customerProfile.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
          profileImage: true,
          createdAt: true
        }
      }
    }
  });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Customer profile not found'
    });
  }

  res.json({
    success: true,
    data: profile
  });
});

// Update customer profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, email, profileImage } = req.body;

  // Update user table
  const updatedUser = await prisma.user.update({
    where: { id: req.user.id },
    data: {
      ...(name && { name }),
      ...(email && { email }),
      ...(profileImage && { profileImage })
    }
  });

  // Update customer profile metadata with last updated time
  const updatedProfile = await prisma.customerProfile.update({
    where: { userId: req.user.id },
    data: {
      metadata: {
        lastUpdated: new Date().toISOString()
      }
    }
  });

  res.json({
    success: true,
    message: 'Profile updated successfully',
    data: {
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        profileImage: updatedUser.profileImage
      }
    }
  });
});
