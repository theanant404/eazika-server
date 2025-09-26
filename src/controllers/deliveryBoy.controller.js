import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

export const getProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.deliveryProfile.findUnique({
    where: { userId: req.user.id },
    include: { user: { select: { id: true, name: true, phone: true, email: true } } },
  });
  if (!profile) throw new ApiError(404, 'Profile not found');
  res.json(new ApiResponse(200,  profile, 'Delivery Boy profile retrieved'));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { vehicleType, vehicleNumber, deliveryRadius, isAvailable, docs } = req.body;
  const profile = await prisma.deliveryProfile.update({
    where: { userId: req.user.id },
    data: {
      vehicleType,
      vehicleNumber,
      deliveryRadius: deliveryRadius || 5,
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      metadata: {
        ...((docs && { docs }) || {}),
        profileCompleted: true,
        lastUpdated: new Date().toISOString(),
      },
    },
  });
  res.json(new ApiResponse(200, profile, 'Delivery Boy profile updated'));
});

export const toggleAvailability = asyncHandler(async (req, res) => {
  const profile = await prisma.deliveryProfile.findUnique({ where: { userId: req.user.id } });
  if (!profile) throw new ApiError(404, 'Profile not found');
  const updated = await prisma.deliveryProfile.update({
    where: { userId: req.user.id },
    data: { isAvailable: !profile.isAvailable },
  });
  res.json(new ApiResponse(200, `Availability set to ${updated.isAvailable}`, updated));
});
