import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Create product review
export const createProductReview = asyncHandler(async (req, res) => {
  const { shopProductId, orderId, rating, review } = req.body;

  // Verify customer owns this order and order is delivered
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: {
        where: { shopProductId },
        include: { shopProduct: true }
      }
    }
  });

  if (!order || order.customerId !== req.user.id) {
    throw new ApiError(404, "Order not found");
  }

  if (order.status !== 'DELIVERED') {
    throw new ApiError(400, "Can only review delivered orders");
  }

  // Verify product was in this order
  if (order.orderItems.length === 0) {
    throw new ApiError(400, "Product not found in this order");
  }

  // Check if customer already reviewed this product
  const existingReview = await prisma.productReview.findUnique({
    where: {
      customerId_shopProductId: {
        customerId: req.user.id,
        shopProductId
      }
    }
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  // Create review in transaction to update aggregated ratings
  const result = await prisma.$transaction(async (tx) => {
    // Create review
    const newReview = await tx.productReview.create({
      data: {
        customerId: req.user.id,
        shopProductId,
        orderId,
        rating,
        review: review || null
      },
      include: {
        customer: {
          select: { id: true, name: true }
        }
      }
    });

    // Update product aggregated ratings
    const reviewStats = await tx.productReview.aggregate({
      where: { shopProductId, isHidden: false },
      _avg: { rating: true },
      _count: { id: true }
    });

    await tx.shopProduct.update({
      where: { id: shopProductId },
      data: {
        avgRating: reviewStats._avg.rating || 0,
        totalReviews: reviewStats._count.id
      }
    });

    // Update shop aggregated ratings
    const shopId = order.orderItems[0].shopProduct.shopId;
    const shopReviewStats = await tx.productReview.aggregate({
      where: {
        shopProduct: { shopId },
        isHidden: false
      },
      _avg: { rating: true },
      _count: { id: true }
    });

    await tx.shop.update({
      where: { id: shopId },
      data: {
        avgRating: shopReviewStats._avg.rating || 0,
        totalReviews: shopReviewStats._count.id
      }
    });

    return newReview;
  });

  res.json(new ApiResponse(201, "Review created successfully", result));
});

// Get product reviews
export const getProductReviews = asyncHandler(async (req, res) => {
  const { shopProductId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;

  const where = {
    shopProductId,
    isHidden: false
  };

  if (rating) {
    where.rating = parseInt(rating);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true }
        }
      },
      take: parseInt(limit),
      skip,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.productReview.count({ where })
  ]);

  res.json(new ApiResponse(200, "Reviews retrieved successfully", {
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get shop reviews (aggregated from all products)
export const getShopReviews = asyncHandler(async (req, res) => {
  const { shopId } = req.params;
  const { page = 1, limit = 10, rating } = req.query;

  const where = {
    shopProduct: { shopId },
    isHidden: false
  };

  if (rating) {
    where.rating = parseInt(rating);
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true }
        },
        shopProduct: {
          select: { id: true, globalProduct: { select: { name: true } } }
        }
      },
      take: parseInt(limit),
      skip,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.productReview.count({ where })
  ]);

  res.json(new ApiResponse(200, "Shop reviews retrieved successfully", {
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Get customer's reviews
export const getCustomerReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [reviews, total] = await Promise.all([
    prisma.productReview.findMany({
      where: { customerId: req.user.id },
      include: {
        shopProduct: {
          include: {
            globalProduct: {
              select: { name: true, images: true }
            },
            shop: {
              select: { name: true }
            }
          }
        }
      },
      take: parseInt(limit),
      skip,
      orderBy: { createdAt: 'desc' }
    }),
    prisma.productReview.count({ where: { customerId: req.user.id } })
  ]);

  res.json(new ApiResponse(200, "Your reviews retrieved successfully", {
    reviews,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  }));
});

// Admin: Hide/Show review (moderation)
export const moderateReview = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { isHidden, reason } = req.body;

  const review = await prisma.productReview.findUnique({
    where: { id },
    include: { shopProduct: true }
  });

  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Update review and recalculate ratings in transaction
  const result = await prisma.$transaction(async (tx) => {
    const updatedReview = await tx.productReview.update({
      where: { id },
      data: { isHidden: Boolean(isHidden) }
    });

    // Recalculate product ratings
    const reviewStats = await tx.productReview.aggregate({
      where: { shopProductId: review.shopProductId, isHidden: false },
      _avg: { rating: true },
      _count: { id: true }
    });

    await tx.shopProduct.update({
      where: { id: review.shopProductId },
      data: {
        avgRating: reviewStats._avg.rating || 0,
        totalReviews: reviewStats._count.id
      }
    });

    // Recalculate shop ratings
    const shopReviewStats = await tx.productReview.aggregate({
      where: {
        shopProduct: { shopId: review.shopProduct.shopId },
        isHidden: false
      },
      _avg: { rating: true },
      _count: { id: true }
    });

    await tx.shop.update({
      where: { id: review.shopProduct.shopId },
      data: {
        avgRating: shopReviewStats._avg.rating || 0,
        totalReviews: shopReviewStats._count.id
      }
    });

    return updatedReview;
  });

  res.json(new ApiResponse(200, `Review ${isHidden ? 'hidden' : 'shown'}`, result));
});
