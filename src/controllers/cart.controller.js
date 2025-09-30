import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Get customer's cart
export const getCart = asyncHandler(async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { customerId: req.user.id },
    include: {
      shopProduct: {
        include: {
          globalProduct: true,
          shop: {
            select: {
              id: true,
              name: true,
              address: true
            }
          }
        }
      }
    },
    orderBy: { addedAt: 'desc' }
  });

  // Calculate cart totals
  let subtotal = 0;
  let totalItems = 0;
  const shopGroups = {};

  cartItems.forEach(item => {
    const itemTotal = parseFloat(item.shopProduct.price) * item.quantity;
    subtotal += itemTotal;
    totalItems += item.quantity;

    // Group by shop for delivery calculation
    const shopId = item.shopProduct.shopId;
    if (!shopGroups[shopId]) {
      shopGroups[shopId] = {
        shop: item.shopProduct.shop,
        items: [],
        subtotal: 0
      };
    }
    shopGroups[shopId].items.push(item);
    shopGroups[shopId].subtotal += itemTotal;
  });

  const cartSummary = {
    items: cartItems,
    shopGroups: Object.values(shopGroups),
    summary: {
      totalItems,
      subtotal,
      estimatedDelivery: Object.keys(shopGroups).length * 20, // ₹20 per shop
      estimatedTotal: subtotal + (Object.keys(shopGroups).length * 20)
    }
  };

  res.json(new ApiResponse(200, cartSummary, "Cart retrieved successfully"));
});

// Add product to cart
export const addToCart = asyncHandler(async (req, res) => {
  const { shopProductId, quantity } = req.body;

  // Check if item already exists in cart
  const existingCartItem = await prisma.cartItem.findUnique({
    where: {
      customerId_shopProductId: {
        customerId: req.user.id,
        shopProductId
      }
    }
  });

  if (existingCartItem) {
    // Update quantity if item already in cart
    const newQuantity = existingCartItem.quantity + quantity;
    
    // Validate new quantity against stock
    if (req.product.stockQuantity < newQuantity) {
      throw new ApiError(400, `Only ${req.product.stockQuantity} items available in stock`);
    }

    const updatedCartItem = await prisma.cartItem.update({
      where: {
        customerId_shopProductId: {
          customerId: req.user.id,
          shopProductId
        }
      },
      data: { quantity: newQuantity },
      include: {
        shopProduct: {
          include: {
            globalProduct: true,
            shop: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.json(new ApiResponse(200, updatedCartItem,"Cart updated successfully"));
  } else {
    // Add new item to cart
    const cartItem = await prisma.cartItem.create({
      data: {
        customerId: req.user.id,
        shopProductId,
        quantity
      },
      include: {
        shopProduct: {
          include: {
            globalProduct: true,
            shop: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    res.json(new ApiResponse(201, cartItem, "Product added to cart successfully"));
  }
});

// Update cart item quantity
export const updateCartItem = asyncHandler(async (req, res) => {
  const { quantity } = req.body;
  const cartItem = req.cartItem;

  // Validate quantity against stock
  if (cartItem.shopProduct.stockQuantity < quantity) {
    throw new ApiError(400, `Only ${cartItem.shopProduct.stockQuantity} items available in stock`);
  }

  const updatedCartItem = await prisma.cartItem.update({
    where: { id: cartItem.id },
    data: { quantity },
    include: {
      shopProduct: {
        include: {
          globalProduct: true,
          shop: {
            select: {
              id: true,
              name: true
            }
          }
        }
      }
    }
  });

  res.json(new ApiResponse(200, updatedCartItem, "Cart item updated successfully"));
});

// Remove item from cart
export const removeFromCart = asyncHandler(async (req, res) => {
  const { id } = req.params;

  await prisma.cartItem.delete({
    where: { id }
  });

  res.json(new ApiResponse(200, "Item removed from cart successfully"));
});

// Clear entire cart
export const clearCart = asyncHandler(async (req, res) => {
  await prisma.cartItem.deleteMany({
    where: { customerId: req.user.id }
  });

  res.json(new ApiResponse(200, "Cart cleared successfully"));
});
