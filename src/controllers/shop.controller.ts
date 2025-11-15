import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";

/**
 * Create shop profile for shopkeeper
 * Request body: {
 *   shopName (required),
 *   shopCategory (required),
 *   shopImages (array, required),
 *   fssaiNumber (optional),
 *   gstNumber (optional),
 *   bankDetail: {
 *     accountHolderName, accountNumber, ifscCode, bankName, branchName, bankPassbookImage (optional)
 *   },
 *   document: {
 *     aadharImage, electricityBillImage, businessCertificateImage, panImage (optional)
 *   }
 * }
 * Steps:
 * 1. Validate all required fields
 * 2. Check uniqueness of FSSAI and GST numbers
 * 3. Create bank details record
 * 4. Create shopkeeper documents record
 * 5. Create shopkeeper profile
 * 6. Update user role to shopkeeper
 */
const createShop = asyncHandler(async (req, res) => {
  const {
    shopName,
    shopCategory,
    shopImages,
    fssaiNumber,
    gstNumber,
    bankDetail,
    document,
  } = req.body;

  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Validate required fields
  if (!shopName || !shopCategory || !shopImages || !Array.isArray(shopImages) || shopImages.length === 0) {
    throw new ApiError(400, "shopName, shopCategory, and shopImages are required");
  }

  if (!bankDetail || !bankDetail.accountHolderName || !bankDetail.accountNumber || !bankDetail.ifscCode || !bankDetail.bankName || !bankDetail.branchName) {
    throw new ApiError(400, "Complete bank details are required");
  }

  if (!document || !document.aadharImage || !document.electricityBillImage || !document.businessCertificateImage) {
    throw new ApiError(400, "Required documents are missing");
  }

  // Check if shopkeeper profile already exists
  const existingShopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (existingShopkeeper) {
    throw new ApiError(400, "Shop profile already exists for this user");
  }

  // Check FSSAI uniqueness if provided
  if (fssaiNumber) {
    const fssaiExists = await prisma.shopkeeper.findUnique({
      where: { fssaiNumber },
    });
    if (fssaiExists) {
      throw new ApiError(400, "FSSAI number already registered");
    }
  }

  // Check GST uniqueness if provided
  if (gstNumber) {
    const gstExists = await prisma.shopkeeper.findUnique({
      where: { gstNumber },
    });
    if (gstExists) {
      throw new ApiError(400, "GST number already registered");
    }
  }

  // Create bank details
  const createdBankDetail = await prisma.bankDetail.create({
    data: {
      accountHolderName: bankDetail.accountHolderName,
      accountNumber: bankDetail.accountNumber,
      ifscCode: bankDetail.ifscCode,
      bankName: bankDetail.bankName,
      branchName: bankDetail.branchName,
      bankPassbookImage: bankDetail.bankPassbookImage || null,
    },
  });

  // Create shopkeeper documents
  const createdDocument = await prisma.shopkeeperDocument.create({
    data: {
      aadharImage: document.aadharImage,
      electricityBillImage: document.electricityBillImage,
      businessCertificateImage: document.businessCertificateImage,
      panImage: document.panImage || null,
    },
  });

  // Create shopkeeper profile
  const shopkeeper = await prisma.shopkeeper.create({
    data: {
      userId: req.user.id,
      shopName,
      shopCategory,
      shopImage: shopImages,
      fssaiNumber: fssaiNumber || null,
      gstNumber: gstNumber || null,
      documentId: createdDocument.id,
      bankDetailId: createdBankDetail.id,
    },
    include: {
      user: true,
      document: true,
      bankDetail: true,
    },
  });

  // Update user role
  await prisma.user.update({
    where: { id: req.user.id },
    data: { role: "shopkeeper" },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Shop created successfully", shopkeeper));
});

/**
 * Update shop profile
 * Request body: {
 *   shopName (optional),
 *   shopImages (optional),
 *   fssaiNumber (optional),
 *   gstNumber (optional),
 *   isActive (optional)
 * }
 * - Only shopkeeper can update their profile
 * - Validate uniqueness if FSSAI or GST is changed
 */
const updateShop = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { shopName, shopImages, fssaiNumber, gstNumber, isActive } = req.body;

  // Find shopkeeper profile
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Only shopkeeper allowed");
  }

  // Prepare update data
  const updateData: any = {};

  if (shopName) updateData.shopName = shopName;
  if (shopImages && Array.isArray(shopImages) && shopImages.length > 0) updateData.shopImage = shopImages;

  // Validate FSSAI if provided
  if (fssaiNumber !== undefined) {
    if (fssaiNumber && fssaiNumber !== shopkeeper.fssaiNumber) {
      const fssaiExists = await prisma.shopkeeper.findUnique({
        where: { fssaiNumber },
      });
      if (fssaiExists) {
        throw new ApiError(400, "FSSAI number already registered");
      }
    }
    updateData.fssaiNumber = fssaiNumber;
  }

  // Validate GST if provided
  if (gstNumber !== undefined) {
    if (gstNumber && gstNumber !== shopkeeper.gstNumber) {
      const gstExists = await prisma.shopkeeper.findUnique({
        where: { gstNumber },
      });
      if (gstExists) {
        throw new ApiError(400, "GST number already registered");
      }
    }
    updateData.gstNumber = gstNumber;
  }

  // Update isActive
  if (isActive !== undefined) {
    updateData.isActive = isActive;
    if (!isActive) {
      updateData.deactivatedAt = new Date();
    }
  }

  // Update shopkeeper
  const updatedShopkeeper = await prisma.shopkeeper.update({
    where: { id: shopkeeper.id },
    data: updateData,
    include: {
      user: true,
      document: true,
      bankDetail: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Shop updated successfully", updatedShopkeeper));
});

/**
 * Add product to shop
 * Request body: {
 *   productCategoryId (required),
 *   globalProductId (optional),
 *   name (required if not global product),
 *   description (optional),
 *   images (array, required if not global product),
 *   priceIds (array, required),
 *   stock (optional, defaults to 0),
 *   isGlobalProduct (optional, defaults to false)
 * }
 * Steps:
 * 1. Verify shopkeeper exists
 * 2. Validate product category exists
 * 3. Validate all price IDs exist
 * 4. If not global product, validate name and images
 * 5. Create shop product
 */
const addShopProduct = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const {
    productCategoryId,
    globalProductId,
    name,
    description,
    images,
    priceIds,
    stock,
    isGlobalProduct,
  } = req.body;

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Validate required fields
  if (!productCategoryId || !priceIds || !Array.isArray(priceIds) || priceIds.length === 0) {
    throw new ApiError(400, "productCategoryId and priceIds are required");
  }

  // Verify product category exists
  const category = await prisma.productCategory.findUnique({
    where: { id: productCategoryId },
  });

  if (!category) {
    throw new ApiError(404, "Product category not found");
  }

  // Validate all price IDs exist
  const prices = await prisma.productPrice.findMany({
    where: { id: { in: priceIds } },
  });

  if (prices.length !== priceIds.length) {
    throw new ApiError(400, "Some product prices not found");
  }

  // If not global product, name and images are required
  if (!isGlobalProduct) {
    if (!name || !images || !Array.isArray(images) || images.length === 0) {
      throw new ApiError(400, "Product name and images are required for custom products");
    }
  }

  // If global product, verify it exists
  if (isGlobalProduct && globalProductId) {
    const globalProduct = await prisma.globalProduct.findUnique({
      where: { id: globalProductId },
    });

    if (!globalProduct) {
      throw new ApiError(404, "Global product not found");
    }
  }

  // Create shop product
  const shopProduct = await prisma.shopProduct.create({
    data: {
      shopkeeperId: shopkeeper.id,
      productCategoryId,
      globalProductId: isGlobalProduct ? globalProductId : null,
      name: name || null,
      description: description || null,
      images: images || [],
      priceIds,
      stock: stock || 0,
      isGlobalProduct: isGlobalProduct || false,
    },
    include: {
      prices: true,
      globalProduct: true,
      productCategories: true,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Product added successfully", shopProduct));
});

/**
 * Update shop product details
 * Request params: productId
 * Request body: {
 *   name (optional),
 *   description (optional),
 *   images (optional),
 *   priceIds (optional),
 *   isActive (optional)
 * }
 * - Only shopkeeper can update their products
 * - Validate price IDs if provided
 */
const updateShopProduct = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  const { name, description, images, priceIds, isActive } = req.body;

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");
  }

  // Find product
  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  // Prepare update data
  const updateData: any = {};

  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (images && Array.isArray(images) && images.length > 0) updateData.images = images;

  // Validate and update priceIds if provided
  if (priceIds && Array.isArray(priceIds) && priceIds.length > 0) {
    const prices = await prisma.productPrice.findMany({
      where: { id: { in: priceIds } },
    });

    if (prices.length !== priceIds.length) {
      throw new ApiError(400, "Some product prices not found");
    }

    updateData.priceIds = priceIds;
  }

  if (isActive !== undefined) updateData.isActive = isActive;

  // Update product
  const updatedProduct = await prisma.shopProduct.update({
    where: { id: product.id },
    data: updateData,
    include: {
      prices: true,
      globalProduct: true,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Product updated successfully", updatedProduct));
});

/**
 * Update product stock
 * Request params: productId
 * Request body: { stock }
 * - Sets the product stock to the exact number provided
 * - Only shopkeeper can update stock
 * - Stock cannot be negative
 */
const updateShopProductStock = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  const { stock } = req.body;

  if (!productId || stock === undefined) {
    throw new ApiError(400, "productId and stock are required");
  }

  if (stock < 0) {
    throw new ApiError(400, "Stock cannot be negative");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Find product
  const product = await prisma.shopProduct.findUnique({
    where: { id: parseInt(productId) },
  });

  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  // Update product stock with new value
  const updatedProduct = await prisma.shopProduct.update({
    where: { id: product.id },
    data: { stock },
  });

  return res.status(200).json(
    new ApiResponse(200, "Stock updated successfully", {
      productId: updatedProduct.id,
      previousStock: product.stock,
      newStock: updatedProduct.stock,
    })
  );
});

/**
 * Get user by phone number
 * Query params: phone
 * - Find user by phone for delivery partner invitations
 * - Return basic user info
 */
const getUserByPhone = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { phone } = req.query;

  if (!phone || typeof phone !== "string") {
    throw new ApiError(400, "phone is required");
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { phone },
    select: {
      id: true,
      name: true,
      phone: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "User fetched successfully", user));
});

/**
 * Send invite to delivery partner
 * Request body: {
 *   userId (required),
 *   message (optional)
 * }
 * Steps:
 * 1. Verify user exists
 * 2. Check user is not already delivery partner for this shop
 * 3. Create notification for user
 * 4. Return success
 */
const sendInviteToDeliveryPartner = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { userId, message } = req.body;

  if (!userId) {
    throw new ApiError(400, "userId is required");
  }

  // Find shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  // Verify target user exists
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!targetUser) {
    throw new ApiError(404, "User not found");
  }

  // Check if user is already delivery partner for this shop
  const existingDeliveryBoy = await prisma.deliveryBoy.findFirst({
    where: {
      userId,
      shopkeeperId: shopkeeper.id,
    },
  });

  if (existingDeliveryBoy) {
    throw new ApiError(400, "User is already a delivery partner for this shop");
  }

  // Create notification for user
  // await prisma.notification.create({
  //   data: {
  //     userId,
  //     title: "Delivery Partner Invitation",
  //     message:
  //       message || `${shopkeeper.shopName} has invited you to be a delivery partner`,
  //     isRead: false,
  //   },
  // });

  // return res.status(200).json(
  //   new ApiResponse(200, "Invitation sent successfully", {
  //     invitedUserId: userId,
  //     shopName: shopkeeper.shopName,
  //     sentAt: new Date(),
  //   })
  // );
});

export {
  createShop,
  updateShop,
  addShopProduct,
  updateShopProduct,
  updateShopProductStock,
  getUserByPhone,
  sendInviteToDeliveryPartner,
};