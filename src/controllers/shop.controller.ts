import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { shopRegistrationSchema } from "../validations/shop.validation";

const createShop = asyncHandler(async (req, res) => {
  // write a step to create shop profile for shopkeeper
  // 1. Validate request body using shopRegistrationSchema
  // 2. Check if shop profile already exists for the user
  // 3. Create bank details and documents entries
  // 4. Create shopkeeper profile
  // 5. Update user role to shopkeeper
  // 6. Return created shop profile

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = shopRegistrationSchema.parse(req.body);

  // Create shopkeeper, bank details and documents in a single transaction to minimize DB calls
  const created = await prisma.$transaction(async (tx) => {
    // Check existing profile inside the transaction to avoid race conditions
    const existing = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
    });
    if (existing)
      throw new ApiError(400, "Shop profile already exists for this user");

    // Create bank details
    const createBankDetail = await tx.bankDetail.create({
      data: {
        accountHolderName: payload.bankDetail.accountHolderName,
        accountNumber: payload.bankDetail.accountNumber,
        ifscCode: payload.bankDetail.ifscCode,
        bankName: payload.bankDetail.bankName,
        branchName: payload.bankDetail.branchName,
        bankPassbookImage: payload.bankDetail.bankPassbookImage || null,
      },
    });
    if (!createBankDetail)
      throw new ApiError(500, "Failed to create bank details");

    // Create documents
    const createDocument = await tx.shopkeeperDocument.create({
      data: {
        aadharImage: payload.document.aadharImage,
        electricityBillImage: payload.document.electricityBillImage,
        businessCertificateImage: payload.document.businessCertificateImage,
        panImage: payload.document.panImage || null,
      },
    });
    if (!createDocument)
      throw new ApiError(500, "Failed to create shop documents");

    // Create shopkeeper profile
    const shopkeeper = await tx.shopkeeper.create({
      data: {
        userId: req.user!.id,
        shopName: payload.shopName,
        shopCategory: payload.shopCategory,
        shopImage: payload.shopImages,
        fssaiNumber: payload.fssaiNumber || null,
        gstNumber: payload.gstNumber || null,
        bankDetailId: createBankDetail.id,
        documentId: createDocument.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
          },
        },
        bankDetail: { select: { id: true } },
        document: { select: { id: true } },
      },
    });

    // Update user role in same transaction
    await tx.user.update({
      where: { id: req.user!.id },
      data: { role: "shopkeeper" },
    });

    return shopkeeper;
  });

  if (!created) throw new ApiError(500, "Failed to create shop profile");

  return res
    .status(201)
    .json(new ApiResponse(201, "Shop created successfully", created));
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
  if (shopImages && Array.isArray(shopImages) && shopImages.length > 0)
    updateData.shopImage = shopImages;

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
  if (
    !productCategoryId ||
    !priceIds ||
    !Array.isArray(priceIds) ||
    priceIds.length === 0
  ) {
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
      throw new ApiError(
        400,
        "Product name and images are required for custom products"
      );
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
  if (images && Array.isArray(images) && images.length > 0)
    updateData.images = images;

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
