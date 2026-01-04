import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { createOrderSchema } from "../validations/product.validation";
import { Prisma } from "../generated/prisma/client";

/* ================================= Customer Products Controllers ============================ */

// Get all product categories
const getProductCategories = asyncHandler(async (_req, res) => {
  const categories = await prisma.productCategory.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Product categories fetched", categories));
});

// Get products by filter (supports "all" or numeric category id via filter, plus legacy modes)
const getProductsByFilter = asyncHandler(async (req, res) => {
  const rawFilter = (req.query.filter as string) || "all";
  console.log(rawFilter)
  const filter = rawFilter.toLowerCase();
  const page = parseInt((req.query.page as string) || "1");
  const limit = parseInt((req.query.limit as string) || "10");
  const skip = (page - 1) * limit;

  let whereClause: any = { isActive: true };
  let appliedFilter = filter;

  // If filter is a numeric value, treat it as category id (quick path)
  const numericFilter = Number(rawFilter);
  if (!Number.isNaN(numericFilter) && rawFilter !== "all") {
    whereClause.productCategoryId = numericFilter;
    appliedFilter = "category";
  }

  // Apply filter logic
  if (appliedFilter === filter) {
    switch (filter) {
      case "all":
        // Return all products (no additional filter)
        break;

      case "category": {
        const categoryId = req.query.categoryId as string;
        if (!categoryId || Number.isNaN(Number(categoryId))) {
          throw new ApiError(400, "Valid categoryId is required for category filter");
        }
        whereClause.productCategoryId = Number(categoryId);
        break;
      }

      default:
        // For this requirement, only "all" and numeric/category are supported.
        throw new ApiError(400, "Invalid filter. Use 'all' or provide a category id");
    }
  }

  // Fetch products
  const [products, totalCount] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: whereClause,
      include: {
        prices: {
          select: {
            id: true,
            price: true,
            discount: true,
            weight: true,
            unit: true,
          },
        },
        globalProduct: {
          include: {
            productPrices: {
              select: {
                id: true,
                price: true,
                discount: true,
                weight: true,
                unit: true,
              },
            },
          },
        },
        productCategories: true,
        ratings: {
          select: { rating: true },
        },
        shopkeeper: {
          select: { id: true, shopName: true },
        },
      },
      skip,
      take: limit,
      orderBy:
        filter === "newest"
          ? { createdAt: "desc" }
          : filter === "toprated"
            ? undefined // Will sort after
            : { id: "asc" },
    }),
    prisma.shopProduct.count({ where: whereClause }),
  ]);

  // Format products
  const formattedProducts = products.map((p) => {
    const isGlobal = p.isGlobalProduct;
    const prices =
      p.prices?.length
        ? p.prices
        : isGlobal && p.globalProduct?.productPrices?.length
          ? p.globalProduct.productPrices
          : [];

    const avgRating =
      p.ratings.length > 0
        ? p.ratings.reduce((sum, r) => sum + r.rating, 0) / p.ratings.length
        : 0;

    return {
      id: p.id,
      isGlobalProduct: p.isGlobalProduct,
      category: p.productCategories.name,
      brand: isGlobal ? p.globalProduct?.brand : p.brand,
      name: isGlobal ? p.globalProduct?.name : p.name,
      description: isGlobal ? p.globalProduct?.description : p.description,
      images: isGlobal ? p.globalProduct?.images : p.images,
      prices: prices,
      shop: {
        id: p.shopkeeper.id,
        name: p.shopkeeper.shopName,
      },
      rating: {
        average: parseFloat(avgRating.toFixed(2)),
        count: p.ratings.length,
      },
    };
  });

  // Sort by rating if toprated filter
  if (filter === "toprated") {
    formattedProducts.sort(
      (a, b) => b.rating.average - a.rating.average
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products: formattedProducts,
      filter: appliedFilter,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  );
});

const getProducts = asyncHandler(async (req, res) => {
  // 1. Pagination Setup
  const pagination =
    (req.query.pagination as {
      currentPage?: string;
      itemsPerPage?: string;
    }) || {};
  const currentPage = parseInt(
    pagination.currentPage || (req.query.page as string) || "1"
  );
  const itemsPerPage = parseInt(
    pagination.itemsPerPage || (req.query.limit as string) || "10"
  );
  const skip = (currentPage - 1) * itemsPerPage;

  // 2. City Filtering (ADDED)
  const rawCity = req.query.city as string;
  const city = rawCity ? rawCity.trim() : undefined;

  // const whereClause: any = { isActive: true };

  // if (city) {
  //   console.log("Filtering by city:", city);
  //   whereClause.shopkeeper = {
  //     user: {
  //       address: {
  //         some: {
  //           city: {
  //             equals: city,
  //             mode: "insensitive", // Case-insensitive match
  //           },
  //           isDeleted: false,
  //         },
  //       },
  //     },
  //   };
  // } else {
  //   console.log("No city provided in query params");
  // }

  // console.log("whereClause:", JSON.stringify(whereClause, null, 2));

  const products = await prisma.shopProduct.findMany({
    where: {
      shopkeeper: {
        address: {
          city: city ? { equals: city, mode: "insensitive" } : undefined,
          state: city ? undefined : undefined,
          isDeleted: false,
        },
      },
      isActive: true,
    },

    include: {
      prices: {
        select: {
          id: true,
          price: true,
          discount: true,
          weight: true,
          unit: true,
        },
      },
      globalProduct: {
        include: {
          productPrices: {
            select: {
              id: true,
              price: true,
              discount: true,
              weight: true,
              unit: true,
            },
          },
        },
      },
      productCategories: true,
      shopkeeper: true, // Included for verification if needed
    },
    skip,
    take: itemsPerPage,
  });

  const filteredProducts = products.map((p) => {
    const isGlobal = p.isGlobalProduct;
    // Use shop-specific prices if available, otherwise fallback to global product prices
    const prices =
      p.prices?.length
        ? p.prices
        : isGlobal && p.globalProduct?.productPrices?.length
          ? p.globalProduct.productPrices
          : [];

    return {
      id: p.id,
      isGlobalProduct: p.isGlobalProduct,
      category: p.productCategories.name,
      brand: isGlobal ? p.globalProduct?.brand : p.brand,
      name: isGlobal ? p.globalProduct?.name : p.name,
      description: isGlobal ? p.globalProduct?.description : p.description,
      images: isGlobal ? p.globalProduct?.images : p.images,
      prices: prices,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products: filteredProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        total: filteredProducts.length,
        pages: Math.ceil(filteredProducts.length / itemsPerPage),
      },
    })
  );
});

/**
 * Get list of cities where Eazika is active (ADDED)
 */
const getAvailableCities = asyncHandler(async (req, res) => {
  console.log("Fetching available cities for Eazika service");
  const locations = await prisma.address.findMany({
    where: {
      isDeleted: false,
      user: {
        shopkeeper: {
          isActive: true,
        },
      },
    },
    select: {
      city: true,
    },
    distinct: ["city"],
  });

  const cities = locations.map((loc) => loc.city);

  return res
    .status(200)
    .json(new ApiResponse(200, "Available cities fetched", cities));
});

const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  // console.log("Fetching product with ID:", productId);

  if (!productId) {
    throw new ApiError(400, "productId is required");
  }

  // Fetch product by ID
  const product = await prisma.shopProduct.findFirst({
    where: { id: parseInt(productId), isActive: true },
    include: {
      prices: {
        select: {
          id: true,
          price: true,
          discount: true,
          weight: true,
          unit: true,
        },
      },
      globalProduct: true,
      productCategories: true,
      shopkeeper: {
        include: {
          minOrder: true,
          deliveryRate: true,
          schedule: true,
          address: true,
        },
      },
      ratings: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
              address: {
                where: { isDeleted: false },
                take: 1,
                select: {
                  name: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!product || !product.isActive) {
    throw new ApiError(404, "Product not found or inactive");
  }

  const isGlobal = product.isGlobalProduct;
  let totalRating = 0;
  const ratings = product.ratings || [];

  // Format ratings with user details and address fallback
  const formattedRatings = ratings.map((r) => {
    totalRating += r.rating;
    const userName =
      r.user.name || r.user.address?.[0]?.name || "Anonymous User";

    return {
      id: r.id,
      userId: r.user.id,
      userName: userName,
      userImage: r.user.image,
      review: r.review,
      rating: r.rating,
      createdAt: r.createdAt,
    };
  });

  const productData = {
    id: product.id,
    isGlobalProduct: product.isGlobalProduct,
    category: product.productCategories.name,
    brand: isGlobal ? product.globalProduct?.brand : product.brand,
    name: isGlobal ? product.globalProduct?.name : product.name,
    description: isGlobal
      ? product.globalProduct?.description
      : product.description,
    images: isGlobal ? product.globalProduct?.images : product.images,
    prices: product.prices,
    shop: {
      id: product.shopkeeper.id,
      name: product.shopkeeper.shopName,
      category: product.shopkeeper.shopCategory,
      image: product.shopkeeper.shopImage,
      minimumOrderValue: product.shopkeeper.minOrder?.minimumValue || null,
      deliveryRates: product.shopkeeper.deliveryRate?.rates || null,
      schedule: product.shopkeeper.schedule
        ? {
          isOnlineDelivery: product.shopkeeper.schedule.isOnlineDelivery,
          weeklySlots: product.shopkeeper.schedule.weeklySlots,
        }
        : null,
      address: product.shopkeeper.address
        ? {
          latitude: product.shopkeeper.address.geoLocation?.split(",")[0],
          longitude: product.shopkeeper.address.geoLocation?.split(",")[1],
          fullAddress: product.shopkeeper.address.line1,
          city: product.shopkeeper.address.city,
          state: product.shopkeeper.address.state,
          pincode: product.shopkeeper.address.pinCode,
        }
        : null,
    },
    rating: {
      ratings: formattedRatings,
      rate: ratings.length > 0 ? totalRating / ratings.length : 0,
      count: ratings.length,
    },
  };

  return res.status(200).json(
    new ApiResponse(200, "Product fetched successfully", {
      product: productData,
    })
  );
});

/* ================================= Customer Cart Controllers ============================ */

const addToCart = asyncHandler(async (req, res) => {
  const { productId, priceId, quantity } = req.body;
  const productIdNum = Number(productId);
  const priceIdNum = Number(priceId);
  const quantityNum = Number(quantity);
  // console.log("productId:", productId, "priceId:", priceId, "quantity:", quantity);

  // Validate inputs
  if (!productIdNum || !priceIdNum || quantityNum <= 0)
    throw new ApiError(400, "productId, priceId and quantity are required");

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const item = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const product = await tx.shopProduct.findFirst({
        where: {
          id: productIdNum,
          isActive: true,
        },
        include: {
          prices: { where: { id: priceIdNum } },
        },
      });

      if (!product) throw new ApiError(404, "Product not found or inactive");

      // Check existing item
      const existingItem = await tx.cartItem.findFirst({
        where: {
          userId: req.user!.id,
          shopProductId: productIdNum,
          productPriceId: priceIdNum,
        },
      });

      if (existingItem) {
        return tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: existingItem.quantity + quantityNum },
          include: { productPrice: true, shopProduct: true },
        });
      }

      return tx.cartItem.create({
        data: {
          userId: req.user?.id!,
          shopProductId: productIdNum,
          productPriceId: priceIdNum,
          quantity: quantityNum,
        },
        include: {
          productPrice: true,
          shopProduct: true,
        },
      });
    }
  );
  if (!item) throw new ApiError(500, "Failed to add item to cart");

  return res
    .status(201)
    .json(new ApiResponse(201, "Item added to cart successfully", item));
});

const getCart = asyncHandler(async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user?.id },
    include: {
      shopProduct: {
        include: {
          globalProduct: true,
          shopkeeper: {
            include: {
              address: true,
              schedule: true,
              minOrder: true,
              deliveryRate: true,
            },
          },
        },
      },
      productPrice: true,
    },
  });

  const items = cartItems.map((i) => {
    const isGlobal = i.shopProduct.isGlobalProduct;
    const shopkeeper = i.shopProduct.shopkeeper;

    return {
      id: i.id,
      userId: i.userId,
      productId: i.shopProductId,
      priceId: i.productPriceId,
      quantity: i.quantity,
      product: {
        name: isGlobal ? i.shopProduct.globalProduct?.name : i.shopProduct.name,
        description: isGlobal
          ? i.shopProduct.globalProduct?.description
          : i.shopProduct.description,
        image: isGlobal
          ? i.shopProduct.globalProduct?.images[0]
          : i.shopProduct.images[0],
        price: i.productPrice!.price,
      },
      shop: {
        id: shopkeeper.id,
        name: shopkeeper.shopName,
        category: shopkeeper.shopCategory,
        image: shopkeeper.shopImage,
        address: shopkeeper.address
          ? {
            id: shopkeeper.address.id,
            line1: shopkeeper.address.line1,
            line2: shopkeeper.address.line2,
            city: shopkeeper.address.city,
            state: shopkeeper.address.state,
            pinCode: shopkeeper.address.pinCode,
            geoLocation: shopkeeper.address.geoLocation,
          }
          : null,
        schedule: shopkeeper.schedule
          ? {
            id: shopkeeper.schedule.id,
            isOnlineDelivery: shopkeeper.schedule.isOnlineDelivery,
            weeklySlots: shopkeeper.schedule.weeklySlots,
          }
          : null,
        minOrder: shopkeeper.minOrder
          ? {
            id: shopkeeper.minOrder.id,
            minimumValue: shopkeeper.minOrder.minimumValue,
          }
          : null,
        deliveryRates: shopkeeper.deliveryRate
          ? {
            id: shopkeeper.deliveryRate.id,
            rates: shopkeeper.deliveryRate.rates,
          }
          : null,
      },
    };
  });
  // console.log("Fetched cart items:", items);
  return res
    .status(200)
    .json(new ApiResponse(200, "Cart fetched successfully", { items }));
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const itemIdNum = Number(itemId);
  const quantityNum = Number(quantity);

  if (!itemIdNum) throw new ApiError(400, "itemId is required");
  if (quantityNum <= 0)
    throw new ApiError(400, "quantity must be a positive integer");

  const existing = await prisma.cartItem.findFirst({
    where: { id: itemIdNum, userId: req.user?.id },
  });

  if (!existing) throw new ApiError(404, "Cart item not found");

  const cartItem = await prisma.cartItem.update({
    where: { id: existing.id },
    data: { quantity: quantityNum },
  });

  if (!cartItem) throw new ApiError(500, "Failed to update cart item");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart item updated successfully", cartItem));
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;

  if (!itemId) throw new ApiError(400, "itemId is required");

  const deletedItem = await prisma.cartItem.deleteMany({
    where: { id: parseInt(itemId), userId: req.user?.id },
  });
  if (deletedItem.count === 0)
    throw new ApiError(404, "Cart item not found or doesn't belong to user");

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart item removed successfully"));
});

const clearCart = asyncHandler(async (req, res) => {
  await prisma.cartItem.deleteMany({
    where: { userId: req.user?.id },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Cart cleared successfully"));
});

/* ================================= Customer Order Controllers ============================ */

const createOrder = asyncHandler(async (req, res) => {
  const { addressId, orderItems, paymentMethod } = createOrderSchema.parse(
    req.body
  );

  // Generate a 4-digit delivery OTP for the order
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000);

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const address = await tx.address.findFirst({
        where: { id: addressId, userId: req.user!.id },
      });

      if (!address)
        throw new ApiError(404, "Address not found or doesn't belong to user");

      const product = await tx.shopProduct.findMany({
        where: {
          id: { in: orderItems.map((i) => Number(i.productId)) },
          isActive: true,
        },
        include: {
          prices: {
            where: { id: { in: orderItems.map((i) => Number(i.priceId)) } },
          },
        },
      });

      if (product.length === 0)
        throw new ApiError(400, "No valid products found for the order items");

      const items: any[] = [];
      let totalAmount = 0;

      // Create a map for quick lookup
      const productMap = new Map();
      const priceMap = new Map();

      product.forEach((p) => {
        productMap.set(p.id, p);
        p.prices.forEach((pr) => priceMap.set(pr.id, pr));
      });

      for (const item of orderItems) {
        const pId = Number(item.productId);
        const prId = Number(item.priceId);

        const prod = productMap.get(pId);
        const priceDetails = priceMap.get(prId);

        if (!prod || !priceDetails) {
          throw new ApiError(400, `Invalid product or price for item ${pId}`);
        }

        // Verify the price belongs to the product (though the query structure implicitly enforces this relation in Prisma mostly, explicit check is safer)
        // Since our query fetches products and includes constrained prices, we just need to ensure the price exists in our map.
        // But strictly, we should ensure priceDetails.shopProductId === prod.id if that relation exists on price, or just trust the nested fetch.
        // The previous query `include: { prices: ... }` ensures `priceDetails` is associated with `prod`.

        const amount = priceDetails.price;
        totalAmount += amount * item.quantity;

        items.push({
          productId: pId,
          priceId: prId,
          quantity: item.quantity,
          price: priceDetails.price,
          weight: priceDetails.weight,
          unit: priceDetails.unit,
        });
      }

      // console.log("Total Items Amount:", totalAmount);
      return await tx.order.create({
        data: {
          userId: req.user!.id,
          addressId: address.id,
          paymentMethod: paymentMethod,
          totalAmount,
          totalProducts: items.length,
          deliveryOtp,
          orderItems: { createMany: { data: items } },
        },
      });
    }
  );

  return res
    .status(201)
    .json(new ApiResponse(201, "Order created successfully", order));
});

const getOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
            },
          },
          priceDetails: true,
        },
      },
      address: true,
      deliveryBoy: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Order fetched successfully", order));
});

const getOrders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: {
        include: {
          // productPrice: true,
          // shopProduct: true,
        },
      },
      address: true,
      deliveryBoy: {
        include: {
          user: true,
        },
      },
    },
  });

  const totalCount = await prisma.order.count({
    where: { userId: req.user.id },
  });

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", {
      orders,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
      },
    })
  );
});

const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
    include: {
      address: true,
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
            },
          },
          priceDetails: true,
        },
      },
      deliveryBoy: {
        include: {
          user: true,
        },
      },

    },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  const totalQuantity = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const trackingData = {
    orderId: order.id,
    status: order.status,
    totalAmount: order.totalAmount,
    totalProducts: order.totalProducts,
    totalQuantity,
    paymentMethod: order.paymentMethod,
    deliveryOtp: order.deliveryOtp,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    address: order.address
      ? {
        id: order.address.id,
        name: order.address.name,
        phone: order.address.phone,
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        state: order.address.state,
        pinCode: order.address.pinCode,
        geoLocation: {
          raw: order.address.geoLocation,
          latitude: order.address.geoLocation?.split(",")[0] || null,
          longitude: order.address.geoLocation?.split(",")[1] || null,
        },
      }
      : null,
    items: order.orderItems.map((item) => {
      const product = item.product;
      const isGlobal = product?.isGlobalProduct;

      return {
        id: item.id,
        productId: item.productId,
        priceId: item.priceId,
        quantity: item.quantity,
        unit: item.unit,
        weight: item.weight,
        price: item.price,
        product: product
          ? {
            id: product.id,
            name: isGlobal ? product.globalProduct?.name : product.name,
            brand: isGlobal ? product.globalProduct?.brand : product.brand,
            images: isGlobal ? product.globalProduct?.images : product.images,
            category: product.productCategories?.name,
          }
          : null,
        priceDetails: item.priceDetails
          ? {
            id: item.priceDetails.id,
            price: item.priceDetails.price,
            discount: item.priceDetails.discount,
            weight: item.priceDetails.weight,
            unit: item.priceDetails.unit,
          }
          : null,
      };
    }),
    deliveryBoy: order.deliveryBoy
      ? {
        id: order.deliveryBoy.id,
        name: order.deliveryBoy.user.name,
        phone: order.deliveryBoy.user.phone,
        vehicleNo: order.deliveryBoy.vehicleNo,
        currentLat: order.deliveryBoy.currentLat,
        currentLng: order.deliveryBoy.currentLng,
      }
      : null,
  };
  // console.log(trackingData)

  return res
    .status(200)
    .json(new ApiResponse(200, "Order tracked successfully", trackingData));
});

const cancelOrderByCustomer = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { reason } = req.body;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const order = await prisma.order.findUnique({
    where: { id: parseInt(orderId) },
  });

  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (order.userId !== req.user.id) {
    throw new ApiError(403, "Unauthorized: Order doesn't belong to user");
  }

  if (order.status !== "pending" && order.status !== "confirmed") {
    throw new ApiError(400, `Cannot cancel order with status: ${order.status}`);
  }

  const cancelledOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "cancelled",
      cancelBy: "user",
      cancelReason: reason || "Customer cancelled the order",
    },
    include: {
      orderItems: {
        include: {
          // productPrice: true,
          // shopProduct: true,
        },
      },
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Order cancelled successfully", cancelledOrder));
});

// Check if user is eligible to rate a product
const checkRatingEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id;

  if (!productId || Number.isNaN(Number(productId))) {
    throw new ApiError(400, "Valid productId is required");
  }

  // Check if user has purchased and received this product
  const purchasedProduct = await prisma.orderItem.findFirst({
    where: {
      productId: Number(productId),
      order: {
        userId: userId,
        status: "delivered", // Only delivered orders are eligible for rating
      },
    },
    select: {
      id: true,
      order: {
        select: {
          id: true,
          deliveredAt: true,
        },
      },
    },
  });

  const isEligible = purchasedProduct !== null;

  // Check if user has already rated this product
  const existingRating = await prisma.productRating.findFirst({
    where: {
      userId: userId,
      shopProductId: Number(productId),
    },
  });

  const hasReviewed = existingRating !== null;

  return res.status(200).json(
    new ApiResponse(200, "Rating eligibility checked", {
      eligible: isEligible,
      hasReviewed: hasReviewed,
      productId: Number(productId),
      message: !isEligible
        ? "You must purchase and receive this product before rating"
        : hasReviewed
          ? "You have already reviewed this product"
          : "You can rate this product",
      ...(isEligible && {
        orderId: purchasedProduct?.order?.id,
        deliveredAt: purchasedProduct?.order?.deliveredAt,
      }),
    })
  );
});

// Add product rating
const addProductRating = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user?.id;
  const { rating, review, } = req.body;
  // console.log("Adding rating:", { productId, rating, review });
  if (!productId || Number.isNaN(Number(productId))) {
    throw new ApiError(400, "Valid productId is required");
  }

  if (!rating || rating < 1 || rating > 5) {
    throw new ApiError(400, "Rating must be between 1 and 5");
  }

  // Verify user has purchased and received this product
  const purchasedProduct = await prisma.orderItem.findFirst({
    where: {
      productId: Number(productId),
      order: {
        userId: userId,
        status: "delivered",
      },
    },
  });

  if (!purchasedProduct) {
    throw new ApiError(
      403,
      "You must purchase and receive this product before rating"
    );
  }

  // Check if user already rated this product
  const existingRating = await prisma.productRating.findFirst({
    where: {
      userId: userId,
      shopProductId: Number(productId),
    },
  });

  if (existingRating) {
    throw new ApiError(400, "You have already rated this product");
  }

  // Create rating
  const productRating = await prisma.productRating.create({
    data: {
      userId: userId!,
      shopProductId: Number(productId),
      rating: Number(rating),
      review: review || null,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return res.status(201).json(
    new ApiResponse(201, "Product rating added successfully", productRating)
  );
});

export {
  getProductCategories,
  getProducts,
  getProductsByFilter,
  getProductById,
  getAvailableCities,
  addToCart,
  getCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  createOrder,
  getOrder,
  getOrders,
  trackOrder,
  cancelOrderByCustomer,
  checkRatingEligibility,
  addProductRating,
};
