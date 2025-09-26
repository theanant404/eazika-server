import prisma from '../config/dbConfig.js';
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Get shopkeeper profile
export const getProfile = asyncHandler(async (req, res) => {
  const profile = await prisma.shopkeeperProfile.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          profileImage: true,
          createdAt: true
        }
      }
    }
  });

  if (!profile) {
    return res.status(404).json({
      success: false,
      message: 'Shopkeeper profile not found'
    });
  }

  res.json(new ApiResponse(200, profile,"Profile retrieved successfully"));
});

// Update shopkeeper profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { 
    businessName, 
    businessType,
    gstNumber,
    contactPhone,
    contactEmail,
    businessAddress, 
    bankDetails
  } = req.body;

  // Update user table if name/email provided
  if (contactEmail && contactEmail !== req.user.email) {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { email: contactEmail }
    });
  }

  // Update shopkeeper profile
  const updatedProfile = await prisma.shopkeeperProfile.update({
    where: { userId: req.user.id },
    data: {
      businessName: businessName || '',
      kycStatus: businessName ? 'PENDING' : 'NOT_SUBMITTED',
      bankDetails: bankDetails || {},
      metadata: {
        businessType: businessType || '',
        gstNumber: gstNumber || '',
        contactPhone: contactPhone || req.user.phone,
        contactEmail: contactEmail || req.user.email,
        businessAddress: businessAddress || {},
        profileCompleted: !!businessName,
        lastUpdated: new Date().toISOString()
      }
    }
  });

  res.json(new ApiResponse(200, updatedProfile,"Profile updated successfully"));
});

// Update KYC status (for admin use later)
export const updateKycStatus = asyncHandler(async (req, res) => {
  const { status, remarks } = req.body;

  const updatedProfile = await prisma.shopkeeperProfile.update({
    where: { userId: req.user.id },
    data: {
      kycStatus: status,
      metadata: {
        ...req.shopkeeperProfile?.metadata,
        kycRemarks: remarks,
        kycUpdatedAt: new Date().toISOString()
      }
    }
  });

  res.json(new ApiResponse(200,  updatedProfile, "KYC status updated successfully"));
});

// Upload KYC documents
export const uploadKycDocuments = asyncHandler(async (req, res) => {
  const { documents } = req.body;

  const updatedProfile = await prisma.shopkeeperProfile.update({
    where: { userId: req.user.id },
    data: {
      kycDocuments: documents || [],
      kycStatus: 'UNDER_REVIEW',
      metadata: {
        ...req.shopkeeperProfile?.metadata,
        documentsUploadedAt: new Date().toISOString()
      }
    }
  });

  res.json(new ApiResponse(200,  updatedProfile, "KYC documents uploaded successfully"));
});
