import prisma from '../config/dbConfig.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from '../utils/apiHandler.js';

// Get all customer addresses
export const getAddresses = asyncHandler(async (req, res) => {
  const addresses = await prisma.address.findMany({
    where: { userId: req.user.id },
    orderBy: [
      { isDefault: 'desc' }, // Default address first
      { createdAt: 'desc' }   // Then newest first
    ]
  });

  res.json(new ApiResponse(200, "Addresses retrieved successfully", addresses));
});

// Add new address (Zod validation handled in middleware)
export const addAddress = asyncHandler(async (req, res) => {
  const { label, line1, line2, city, state, pincode, geoLocation, isDefault } = req.body;

  // If setting as default, remove default from other addresses
  if (isDefault) {
    await prisma.address.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false }
    });
  }

  const newAddress = await prisma.address.create({
    data: {
      userId: req.user.id,
      label: label?.trim() || null,
      line1: line1.trim(),
      line2: line2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      geoLocation: geoLocation || {},
      isDefault: isDefault || false
    }
  });

  res.json(new ApiResponse(201, "Address added successfully", newAddress));
});

// Update address (ownership validation handled in middleware)
export const updateAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { label, line1, line2, city, state, pincode, geoLocation, isDefault } = req.body;

  // If setting as default, remove default from others
  if (isDefault) {
    await prisma.address.updateMany({
      where: { 
        userId: req.user.id,
        id: { not: id }
      },
      data: { isDefault: false }
    });
  }

  const updatedAddress = await prisma.address.update({
    where: { id },
    data: {
      label: label?.trim() || null,
      line1: line1.trim(),
      line2: line2?.trim() || null,
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      geoLocation: geoLocation || {},
      isDefault: isDefault || false
    }
  });

  res.json(new ApiResponse(200, "Address updated successfully", updatedAddress));
});

// Delete address (ownership validation handled in middleware)
export const deleteAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  await prisma.address.delete({ where: { id } });
  
  res.json(new ApiResponse(200, "Address deleted successfully"));
});

// Set default address (ownership validation handled in middleware)
export const setDefaultAddress = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Remove default from all user addresses
  await prisma.address.updateMany({
    where: { userId: req.user.id },
    data: { isDefault: false }
  });

  // Set current address as default
  const updatedAddress = await prisma.address.update({
    where: { id },
    data: { isDefault: true }
  });

  res.json(new ApiResponse(200, "Default address updated", updatedAddress));
});
