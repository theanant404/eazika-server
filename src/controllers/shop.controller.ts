import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  shopRegistrationSchema,
  updateStockAndPriceSchema,
} from "../validations/shop.validation";
import {
  shopProductSchema,
  shopWithGlobalProductSchema,
} from "../validations/product.validation";
import { Prisma } from "../generated/prisma/client";

/*  ================================ Shop Management Controllers ============================= */
const createShop = asyncHandler(async (req, res) => {
  // write a step to create shop profile for shopkeeper
  // 1. Validate request body using shopRegistrationSchema
  // 2. Check if shop profile already exists for user
  // 3. Create address, documents, and shop profile in a transaction
  // 4. Update user role to 'shopkeeper'
  // 5. Return created shop profile

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = shopRegistrationSchema.parse(req.body);

  const created = await prisma.$transaction(async (tx) => {
    const existing = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
    });
    if (existing)
      throw new ApiError(400, "Shop profile already exists for this user");

    // Create documents
    const createDocument = await tx.shopkeeperDocument.create({
      data: {
        aadharImage: payload.documents.aadharImage,
        electricityBillImage: payload.documents.electricityBillImage,
        businessCertificateImage: payload.documents.businessCertificateImage,
        panImage: payload.documents.panImage || null,
      },
    });
    if (!createDocument)
      throw new ApiError(500, "Failed to create shop documents");

    const createdAddress = await tx.address.create({
      data: {
        userId: req.user!.id,
        name: payload.address.name,
        phone: payload.address.phone,
        line1: payload.address.line1,
        line2: payload.address.line2 || null,
        street: payload.address.street,
        city: payload.address.city,
        state: payload.address.state,
        pinCode: payload.address.pinCode,
        country: payload.address.country,
        geoLocation: payload.address.geolocation || null,
      },
    });

    // Create shopkeeper profile
    const shopkeeper = await tx.shopkeeper.create({
      data: {
        userId: req.user!.id,
        shopName: payload.shopName,
        shopCategory: payload.shopCategory,
        shopImage: payload.shopImages,
        fssaiNumber: payload.fssaiNumber || null,
        gstNumber: payload.gstNumber || null,
        documentId: createDocument.id,
        addressId: createdAddress.id,
      },
    });
    if (!shopkeeper) throw new ApiError(500, "Failed to create shop profile");

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

/* ================================= Product Management Controllers ================================ */
const getShopProducts = asyncHandler(async (req, res) => {
  // write steps to get all products for the shop with pagination
  // 1. Parse pagination params from query
  // 2. Fetch products from DB with pagination
  // 3. Return products with pagination info

  const currentPageRaw = parseInt(
    (req.query["pagination[currentPage]"] as string) ||
    (req.query.currentPage as string) ||
    (req.query.page as string) ||
    "1",
    10
  );
  const itemsPerPageRaw = parseInt(
    (req.query["pagination[itemsPerPage]"] as string) ||
    (req.query.itemsPerPage as string) ||
    (req.query.limit as string) ||
    "10",
    10
  );
  const currentPage = Number.isFinite(currentPageRaw) && currentPageRaw > 0 ? currentPageRaw : 1;
  const itemsPerPage = Number.isFinite(itemsPerPageRaw) && itemsPerPageRaw > 0 ? itemsPerPageRaw : 10;
  const skip = (currentPage - 1) * itemsPerPage;

  const baseWhere = { shopkeeper: { userId: req.user!.id }, isActive: true };

  const [products, totalCount] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: baseWhere,
      include: {
        prices: {
          select: {
            id: true,
            price: true,
            discount: true,
            weight: true,
            unit: true,
            stock: true,
          },
        },
        globalProduct: true,
        productCategories: true,
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.shopProduct.count({
      where: baseWhere,
    }),
  ]);

  const filteredProducts = products.map((p) => {

    return {
      id: p.id,
      isGlobalProduct: p.isGlobalProduct,
      category: p.productCategories.name,
      brand: p.brand,
      name: p.name,
      description: p.description,
      images: p.images,
      pricing: p.prices,
      isActive: p.isActive,
      globalProductId: p.globalProductId,
    };

  });
  // console.log("Filtered shop products:", filteredProducts);

  return res.status(200).json(
    new ApiResponse(200, "Products fetched successfully", {
      products: filteredProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const getGlobalProducts = asyncHandler(async (req, res) => {
  // write steps to get all global products with pagination
  // 1. Parse pagination params from query
  // 2. Fetch global products from DB with pagination
  // 3. Return products with pagination info
  console.log('api successfully hiied!')
  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  const [globalProducts, totalCount] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      include: {
        productCategories: true,
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.globalProduct.count(),
  ]);

  const formattedProducts = globalProducts.map((p) => ({
    id: p.id,
    category: p.productCategories.name,
    brand: p.brand,
    name: p.name,
    description: p.description,
    images: p.images,
    isActive: p.isActive,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Global products fetched successfully", {
      globalProducts: formattedProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const getShopCategories = asyncHandler(async (req, res) => {
  // Fetch distinct shop categories from shopkeeper profiles
  const categories = await prisma.productCategory.findMany({
    select: {
      id: true,
      name: true,
    },
  });

  // const categoryList = categories.map((cat) => ({
  //   id: cat.id,
  //   name: cat.name,
  // }));
  // console.log("Fetched shop categories:", categories);

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Shop categories fetched successfully", categories)
    );
});

const addShopProduct = asyncHandler(async (req, res) => {
  // write steps to add a new product to shop
  // 1. Validate request body using shopProductSchema
  // 2. Create shop product entry in DB
  // 3. Return created product

  const payload = shopProductSchema.parse(req.body);
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const product = await prisma.$transaction(async (tx) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: Number(req.user?.id) },
      select: { id: true },
    });

    if (!shopkeeper)
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

    const category = await tx.productCategory.findUnique({
      where: { id: payload.productCategoryId },
      select: { id: true },
    });
    if (!category) throw new ApiError(404, "Product category not found");

    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: category.id,
        isGlobalProduct: false,
        name: payload.name,
        brand: payload.brand,
        description: payload.description,
        images: payload.images,
        prices: { create: payload.pricing },
      },
      include: { prices: { select: { id: true } } },
    });
    if (!newProduct) throw new ApiError(500, "Failed to add product");

    const priceIds = newProduct.prices.map((price) => price.id);

    return tx.shopProduct.update({
      where: { id: newProduct.id },
      data: { priceIds },
    });
  });

  if (!product) throw new ApiError(500, "Failed to add product");

  return res
    .status(201)
    .json(new ApiResponse(201, "Product added successfully", product));
});
const addShopProductFromGlobleProduct = asyncHandler(async (req, res) => {
  // Accepts { product: {...}, pricing: [...] } in body
  const { product, pricing } = req.body;
  if (!req.user) throw new ApiError(401, "User not authenticated");
  if (!product || !product.id || !Array.isArray(pricing) || pricing.length === 0) {
    throw new ApiError(400, "Invalid payload: product and pricing required");
  }

  const createdProduct = await prisma.$transaction(async (tx) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: Number(req.user?.id) },
      select: { id: true },
    });
    if (!shopkeeper) throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

    // Check global product exists
    const globalProduct = await tx.globalProduct.findUnique({
      where: { id: product.id },
      select: { id: true, productCategoryId: true },
    });
    if (!globalProduct) throw new ApiError(404, "Global product not found");
    console.log('Global product found:', globalProduct);
    // Create shop product with globalProductId and pricing
    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: globalProduct.productCategoryId,
        isGlobalProduct: true,
        globalProductId: globalProduct.id,
        prices: { create: pricing },
      },
      include: { prices: { select: { id: true } } },
    });
    if (!newProduct) throw new ApiError(500, "Failed to add product");

    const priceIds = newProduct.prices.map((price) => price.id);

    // Update shopProduct with priceIds
    return tx.shopProduct.update({
      where: { id: newProduct.id },
      data: { priceIds },
      include: { prices: true },
    });
  });

  if (!createdProduct) throw new ApiError(500, "Failed to add product");

  return res.status(201).json(new ApiResponse(201, "Product added successfully", createdProduct));
});
const addShopGlobalProduct = asyncHandler(async (req, res) => {
  // Accepts { globalProductId, pricing: [...] }
  const { globalProductId, pricing } = req.body;

  if (!req.user) throw new ApiError(401, "User not authenticated");
  if (!globalProductId || !Array.isArray(pricing) || pricing.length === 0) {
    throw new ApiError(400, "Invalid payload: globalProductId and pricing required");
  }

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!shopkeeper)
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

    const globalProduct = await tx.globalProduct.findUnique({
      where: { id: globalProductId },
      select: { id: true, productCategoryId: true, name: true, brand: true, description: true, images: true },
    });
    if (!globalProduct) throw new ApiError(404, "Global product not found");
    console.log('Global product found:', globalProduct);
    // Create shop product and nested prices to get price ids
    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: globalProduct.productCategoryId,
        isGlobalProduct: true,
        globalProductId: globalProduct.id,
        name: globalProduct.name,
        brand: globalProduct.brand,
        description: globalProduct.description,
        images: globalProduct.images,
        prices: { create: pricing.map(({ id, globalProductId: _gp, ...rest }: any) => rest) },
      },
      include: { prices: { select: { id: true } }, globalProduct: true, productCategories: true },
    });
    if (!newProduct) throw new ApiError(500, "Failed to add product");

    const priceIds = newProduct.prices.map((p) => p.id);

    return tx.shopProduct.update({
      where: { id: newProduct.id },
      data: { priceIds },
      include: { prices: true, globalProduct: true, productCategories: true },
    });
  });

  if (!product) throw new ApiError(500, "Failed to add product");

  return res
    .status(201)
    .json(new ApiResponse(201, "Product added successfully", product));
});

const updateShopProduct = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { productId } = req.params;
  const {
    name,
    brand,
    description,
    images,
    priceIds,
    isActive,
    pricing,
    productCategoryId,
  } = req.body;
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

  const incoming = product || {};
  if (name || incoming.name) updateData.name = name || incoming.name;
  if (brand || incoming.brand) updateData.brand = brand || incoming.brand;
  if (description !== undefined || incoming.description !== undefined)
    updateData.description = description ?? incoming.description;
  const incomingImages = images || incoming.images;
  if (incomingImages && Array.isArray(incomingImages) && incomingImages.length > 0)
    updateData.images = incomingImages;
  const categoryIdNum = Number.parseInt((productCategoryId ?? "").toString(), 10);
  if (Number.isInteger(categoryIdNum) && categoryIdNum > 0)
    updateData.productCategoryId = categoryIdNum;

  if (isActive !== undefined) updateData.isActive = isActive;

  const updatedProduct = await prisma.$transaction(async (tx) => {
    // Update basic product fields
    const updated = await tx.shopProduct.update({
      where: { id: product.id },
      data: updateData,
    });

    const providedPricing = Array.isArray(pricing) ? pricing : null;
    const collectedPriceIds: number[] = [];

    if (providedPricing) {
      // Fetch existing price rows to decide which to delete after upserts
      const existingPrices = await tx.productPrice.findMany({
        where: {
          shopProductId: updated.id,
          shopProduct: { shopkeeper: { userId: req.user!.id } },
        },
        select: { id: true },
      });

      for (const item of providedPricing) {
        const idNum = Number.parseInt((item?.id ?? "").toString(), 10);
        const pricePayload = {
          price: Number(item.price ?? 0),
          discount: Number(item.discount ?? 0),
          weight: Number(item.weight ?? 0),
          unit: item.unit,
          stock: Number(item.stock ?? 0),
        };

        if (Number.isInteger(idNum) && idNum > 0) {
          const updatedPrice = await tx.productPrice.update({
            where: {
              id: idNum,
              shopProduct: { shopkeeper: { userId: req.user!.id } },
            },
            data: pricePayload,
          });
          collectedPriceIds.push(updatedPrice.id);
        } else {
          const createdPrice = await tx.productPrice.create({
            data: {
              ...pricePayload,
              shopProductId: updated.id,
            },
          });
          collectedPriceIds.push(createdPrice.id);
        }
      }

      // Remove price rows that are no longer present in the incoming list
      const incomingSet = new Set(collectedPriceIds);
      const toDelete = existingPrices
        .map((p) => p.id)
        .filter((id) => !incomingSet.has(id));

      if (toDelete.length > 0) {
        await tx.productPrice.deleteMany({
          where: {
            id: { in: toDelete },
            shopProduct: { shopkeeper: { userId: req.user!.id } },
          },
        });
      }
    }

    // If priceIds was provided explicitly, merge/override
    if (Array.isArray(priceIds) && priceIds.length > 0) {
      collectedPriceIds.push(
        ...priceIds
          .filter((id: any) => Number.isInteger(Number(id)))
          .map((id: any) => Number(id))
      );
    }

    const finalPriceIds = collectedPriceIds.length > 0
      ? Array.from(new Set(collectedPriceIds))
      : updated.priceIds;

    return tx.shopProduct.update({
      where: { id: updated.id },
      data: { priceIds: finalPriceIds },
      include: { prices: true, globalProduct: false },
    });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Product updated successfully", updatedProduct));
});

const updateStockAndPrice = asyncHandler(async (req, res) => {
  // write steps to update stock and price of a product
  // 1. Validate request body using updateStockAndPriceSchema
  // 2. Check if product belongs to shopkeeper
  // 3. Update stock and price in DB
  // 4. Return updated pricing info

  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { prices } = req.body as { prices?: any };

  // Bulk update path when prices array is provided
  if (Array.isArray(prices)) {
    if (prices.length === 0)
      throw new ApiError(400, "prices array is empty");

    const updates = await prisma.$transaction(async (tx) => {
      const results = [] as any[];
      for (const item of prices) {
        const idNum = Number.parseInt((item?.id ?? "").toString(), 10);
        if (!Number.isInteger(idNum) || idNum <= 0) {
          throw new ApiError(400, "Invalid price id in prices array");
        }

        const updated = await tx.productPrice.update({
          where: {
            id: idNum,
            shopProduct: { shopkeeper: { userId: req.user?.id } },
          },
          data: {
            stock: Number(item.stock ?? 0),
            price: Number(item.price ?? 0),
            discount: Number(item.discount ?? 0),
            weight: Number(item.weight ?? 0),
            unit: item.unit,
          },
        });
        results.push(updated);
      }
      return results;
    });

    return res.status(200).json(
      new ApiResponse(200, "Product prices updated successfully", {
        prices: updates,
      })
    );
  }

  // Single update path (existing behaviour)
  if (!req.body || Object.keys(req.body).length === 0) {
    throw new ApiError(400, "Request body is empty");
  }

  const priceIdNum = Number.parseInt((req.params.priceId ?? "").toString(), 10);
  if (!Number.isInteger(priceIdNum) || priceIdNum <= 0) {
    throw new ApiError(400, "Invalid priceId");
  }

  const payload = updateStockAndPriceSchema.parse(req.body);

  const pricing = await prisma.productPrice.update({
    where: {
      id: priceIdNum,
      shopProduct: { shopkeeper: { userId: req.user.id } },
    },
    data: {
      stock: Number(payload.stock),
      price: Number(payload.price),
      discount: Number(payload.discount),
      weight: Number(payload.weight),
      unit: payload.unit,
    },
  });

  return res.status(200).json(
    new ApiResponse(200, "Product stock and price updated successfully", {
      pricing,
    })
  );
});

/* ===================================== Order Management Controllers ================================ */

const getCurrentOrders = asyncHandler(async (req, res) => {
  // write steps to get current orders for the shop
  // 1. Parse pagination params from query
  // 2. Fetch orders from DB with pagination
  // 3. Return orders with pagination info

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const pagination =
    (req.query.pagination as {
      currentPage: string;
      itemsPerPage: string;
    }) || {};
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;

  const allOrders = await prisma.order.findMany({
    where: {
      orderItems: {
        some: { product: { shopkeeper: { userId: req.user.id } } },
      },
      status: { in: ["pending", "confirmed", "shipped"] },
    },
    include: {
      orderItems: true,
      user: { select: { id: true, name: true, phone: true } },
      address: true,
    },
    skip,
    take: itemsPerPage,
    orderBy: { createdAt: "desc" },
  });

  const formattedOrders = allOrders.map((o) => {
    return {
      id: o.id,
      customerName: o.user.name,
      createdAt: o.createdAt,
      address: `${o.address.line1}, ${o.address.city}, ${o.address.state}, ${o.address.pinCode}`,
      itemCount: o.orderItems.length,
      paymentMethod: o.paymentMethod,
      status: o.status,
      totalAmount: o.totalAmount,
    };
  });

  return res.status(200).json(
    new ApiResponse(200, "Current orders fetched successfully", {
      orders: formattedOrders,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: formattedOrders.length,
        totalPages: Math.ceil(formattedOrders.length / itemsPerPage),
      },
    })
  );
});

const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  if (!orderId) {
    throw new ApiError(400, "orderId is required");
  }

  // Find order
  const order = await prisma.order.findUnique({
    where: {
      id: parseInt(orderId),
      orderItems: {
        some: { product: { shopkeeper: { userId: req.user!.id } } },
      },
    },

    include: {
      address: true,
      deliveryBoy: {
        include: { user: { select: { id: true, name: true, phone: true } } },
      },
      orderItems: {
        include: {
          product: {
            include: {
              globalProduct: true,
              productCategories: true,
              shopkeeper: {
                include: {
                  deliveryBoys: {
                    include: {
                      user: { select: { id: true, name: true, phone: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }
  const orderItems = {
    id: order.id,
    customerName: order.address.name,
    customerPhone: order.address.phone,
    address: `${order.address.line1}, ${order.address.city}, ${order.address.state}, ${order.address.pinCode}`,
    status: order.status,
    totalAmount: order.totalAmount,
    itemCount: order.orderItems.length,
    paymentMethod: order.paymentMethod,
    createdAt: order.createdAt,
    orderItems: order.orderItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
      image: item.product.isGlobalProduct
        ? item.product.globalProduct?.images[0]
        : item.product.images[0],
      name: item.product.isGlobalProduct
        ? item.product.globalProduct?.name
        : item.product.name,
      price: item.price,
      weight: item.weight,
      unit: item.unit,
    })),
    driver: order.deliveryBoy && {
      id: order.deliveryBoy.user.id,
      name: order.deliveryBoy.user.name,
      phone: order.deliveryBoy.user.phone,
    },
    driverList:
      order.orderItems.length > 0 && order.status !== "delivered"
        ? order.orderItems[0].product.shopkeeper.deliveryBoys.map((db) => ({
          id: db.user.id,
          name: db.user.name,
          phone: db.user.phone,
        }))
        : [],
  };

  return res.status(200).json(
    new ApiResponse(200, "Order fetched successfully", {
      order: orderItems,
    })
  );
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { status, riderId } = req.body;

  if (!orderId) throw new ApiError(400, "orderId is required");

  if (!["shipped", "confirmed", "cancelled"].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }

  const order = await prisma.$transaction(async (tx) => {
    if (riderId && status === "shipped") {
      const deliveryBoy = await tx.deliveryBoy.findFirst({
        where: {
          userId: riderId,
          shopkeeper: { userId: req.user!.id },
        },
      });
      if (!deliveryBoy)
        throw new ApiError(404, "Delivery partner not found for this shop");

      return await tx.order.update({
        where: {
          id: parseInt(orderId),
          orderItems: {
            some: { product: { shopkeeper: { userId: req.user!.id } } },
          },
        },
        data: {
          status,
          assignedDeliveryBoyId: deliveryBoy.id,
          // deliveryBoy: { connect: { id: deliveryBoy.id } },
        },
      });
    } else if (status !== "shipped") {
      return await tx.order.update({
        where: {
          id: parseInt(orderId),
          orderItems: {
            some: { product: { shopkeeper: { userId: req.user!.id } } },
          },
        },
        data: { status },
      });
    }
  });
  if (!order) throw new ApiError(500, "Failed to update order status");

  return res.json(
    new ApiResponse(200, "Order status updated successfully", { order })
  );
});

/* ================================= Shop Controllers for Riders ================================ */
const getShopRiders = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const status = req.query.status as string; // 'pending' | 'verified' | 'all'

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });
  if (!shopkeeper) throw new ApiError(404, "Shopkeeper profile not found");

  const whereClause: any = { shopkeeperId: shopkeeper.id };
  if (status === "pending") whereClause.isVerified = false;
  if (status === "verified") whereClause.isVerified = true;

  const riders = await prisma.deliveryBoy.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, phone: true, image: true } },
    },
  });

  return res.status(200).json(new ApiResponse(200, "Riders fetched", riders));
});

const approveRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId } = req.body;

  // Verify shopkeeper owns this rider request
  const rider = await prisma.deliveryBoy.findFirst({
    where: {
      id: riderId,
      shopkeeper: { userId: req.user.id },
    },
  });
  if (!rider) throw new ApiError(404, "Rider request not found");

  const updated = await prisma.deliveryBoy.update({
    where: { id: riderId },
    data: { isVerified: true },
  });

  return res.status(200).json(new ApiResponse(200, "Rider approved", updated));
});

const rejectRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId } = req.body;

  // Verify shopkeeper owns this rider request
  const rider = await prisma.deliveryBoy.findFirst({
    where: {
      id: riderId,
      shopkeeper: { userId: req.user.id },
    },
  });
  if (!rider) throw new ApiError(404, "Rider request not found");

  // Delete the profile so they can re-apply or just to remove from list
  // Also revert user role if needed?
  // If we delete DeliveryBoy, user role stays "delivery_boy". We should probably revert it to "user".

  await prisma.$transaction(async (tx) => {
    await tx.deliveryBoy.delete({ where: { id: riderId } });
    await tx.user.update({
      where: { id: rider.userId },
      data: { role: "user" },
    });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Rider rejected and removed"));
});

/* ====================================== Others Shop Controllers ===================================== */
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

const getShopAnalytics = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  const range = (req.query.range as string) || "7d";

  // Date Filter Logic
  let dateFilter: any = {};
  const today = new Date();
  if (range === "7d") {
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    dateFilter = { createdAt: { gte: lastWeek } };
  } else if (range === "30d") {
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    dateFilter = { createdAt: { gte: lastMonth } };
  }

  // Base Query for Shop Orders
  const shopOrdersClause = {
    orderItems: { some: { product: { shopkeeperId: shopkeeper.id } } },
    ...dateFilter,
  };

  // Aggregation
  const [totalOrders, deliveredOrders, cancelledOrders, revenueAgg] =
    await prisma.$transaction([
      prisma.order.count({ where: shopOrdersClause }),
      prisma.order.count({
        where: { ...shopOrdersClause, status: "delivered" },
      }),
      prisma.order.count({
        where: { ...shopOrdersClause, status: "cancelled" },
      }),
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...shopOrdersClause, status: "delivered" },
      }),
    ]);

  const activeOrders = totalOrders - deliveredOrders - cancelledOrders;
  const customers = await prisma.order.findMany({
    where: shopOrdersClause,
    distinct: ["userId"],
    select: { userId: true },
  });

  const analyticsData = {
    metrics: {
      revenue: (revenueAgg._sum.totalAmount || 0).toString(),
      orders: totalOrders.toString(),
      customers: customers.length.toString(),
      aov:
        totalOrders > 0
          ? ((revenueAgg._sum.totalAmount || 0) / totalOrders).toFixed(2)
          : "0",
    },
    orderStats: {
      // Extra metadata for our internal use if needed
      active: activeOrders,
      delivered: deliveredOrders,
      cancelled: cancelledOrders,
    },
    // Mock charts for now to match interface
    revenueChart: [],
    ordersChart: [],
    products: [],
  };

  return res
    .status(200)
    .json(new ApiResponse(200, "Analytics fetched", analyticsData));
});

/* ********************************************* Exports Controllers ********************************************* */

// Shop Management Controllers
export { createShop, updateShop };

// Product Management Controllers
export {
  getShopCategories,
  getShopProducts,
  getGlobalProducts,
  addShopGlobalProduct,
  addShopProduct,
  updateShopProduct,
  updateStockAndPrice,
  addShopProductFromGlobleProduct
};
// Order Management Controllers
export { getCurrentOrders, getOrderById, updateOrderStatus };

// Shop Controllers for Riders
export { getShopRiders, approveRider, rejectRider };

// other controllers
// export { getUserByPhone, sendInviteToDeliveryPartner, getShopAnalytics };
