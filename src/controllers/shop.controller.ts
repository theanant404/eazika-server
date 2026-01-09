import { asyncHandler } from "../utils/asyncHandler";
import prisma from "../config/db.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import {
  shopRegistrationSchema,
  updateStockAndPriceSchema,
  shopScheduleSchema,
  shopScheduleUpdateSchema,
  minOrderSchema,
  minOrderUpdateSchema,
  deliveryRatesSchema,
  deliveryRatesUpdateSchema,
} from "../validations/shop.validation";
import {
  shopProductSchema,
  shopWithGlobalProductSchema,
} from "../validations/product.validation";
import { Prisma } from "../generated/prisma/client";
import type { OrderStatus } from "../generated/prisma/client";

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
const getShopStatus = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { status: true, isActive: true },
  });
  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, "Shop status fetched successfully", {
      status: shopkeeper.status,
      isActive: shopkeeper.isActive,
    }));
});
const updateShopkeeperAddress = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const {
    name,
    phone,
    line1,
    line2,
    street,
    city,
    state,
    pinCode,
    country,
    geoLocation,
  } = req.body;
  // console.log(name, phone, line1, line2, street, city, state, pinCode, country, geoLocation);
  // Find shopkeeper profile to ensure user is a shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true, addressId: true },
  });
  console.log(shopkeeper)
  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  if (!shopkeeper.addressId) {
    throw new ApiError(404, "No address found for this shopkeeper");
  }

  // Prepare update data - only include provided fields
  const updateData: any = {};

  if (name !== undefined) updateData.name = name;
  if (phone !== undefined) updateData.phone = phone;
  if (line1 !== undefined) updateData.line1 = line1;
  if (line2 !== undefined) updateData.line2 = line2;
  if (street !== undefined) updateData.street = street;
  if (city !== undefined) updateData.city = city;
  if (state !== undefined) updateData.state = state;
  if (pinCode !== undefined) updateData.pinCode = pinCode;
  if (country !== undefined) updateData.country = country;
  if (geoLocation !== undefined) updateData.geoLocation = geoLocation;

  // Update address
  const updatedAddress = await prisma.address.update({
    where: { id: shopkeeper.addressId },
    data: updateData,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Address updated successfully", updatedAddress));
});

const getShopGeoLocation = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { addressId: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  if (!shopkeeper.addressId) {
    throw new ApiError(404, "No address found for this shopkeeper");
  }

  const address = await prisma.address.findUnique({
    where: { id: shopkeeper.addressId },
    select: { geoLocation: true, line1: true, city: true, state: true, pinCode: true },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  return res.status(200).json(
    new ApiResponse(200, "Shop geo location fetched successfully", {
      geoLocation: address.geoLocation ?? null,
      address: `${address.line1}, ${address.city}, ${address.state}, ${address.pinCode}`,
    })
  );
});

const getShopkeeperAddress = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { addressId: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  if (!shopkeeper.addressId) {
    throw new ApiError(404, "No address found for this shopkeeper");
  }

  const address = await prisma.address.findUnique({
    where: { id: shopkeeper.addressId },
  });

  if (!address) {
    throw new ApiError(404, "Address not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Address fetched successfully", address));
});

const getShopDetails = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    include: {
      user: {
        select: { id: true, name: true, phone: true, image: true },
      },
      address: true,
      schedule: true,
      minOrder: true,
      deliveryRate: true,
    },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Shop profile not found");
  }

  const payload = {
    id: shopkeeper.id,
    name: shopkeeper.shopName,
    category: shopkeeper.shopCategory,
    images: shopkeeper.shopImage,
    coverPhoto: shopkeeper.shopImage?.[0] || null,
    phone: shopkeeper.user.phone,
    ownerName: shopkeeper.user.name,
    address: shopkeeper.address,
    schedule: shopkeeper.schedule,
    minimumOrderValue: shopkeeper.minOrder?.minimumValue ?? null,
    deliveryRates: shopkeeper.deliveryRate?.rates ?? null,
    isActive: shopkeeper.isActive,
    createdAt: shopkeeper.createdAt,
    updatedAt: shopkeeper.updatedAt,
  };

  return res
    .status(200)
    .json(new ApiResponse(200, "Shop details fetched successfully", payload));
});

const upsertShopSchedule = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = shopScheduleSchema.parse(req.body);

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  const schedule = await prisma.shopSchedule.upsert({
    where: { shopkeeperId: shopkeeper.id },
    create: {
      shopkeeperId: shopkeeper.id,
      isOnlineDelivery: payload.isOnlineDelivery,
      weeklySlots: payload.weeklySlots,
    },
    update: {
      isOnlineDelivery: payload.isOnlineDelivery,
      weeklySlots: payload.weeklySlots,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Shop schedule saved successfully", schedule));
});


const getShopSchedule = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  const schedule = await prisma.shopSchedule.findUnique({
    where: { shopkeeperId: shopkeeper.id },
    include: {
      shopkeeper: {
        select: {
          id: true,
          shopName: true,
          shopCategory: true,
          isActive: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new ApiError(404, "Shop schedule not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Shop schedule fetched successfully", schedule));
});

const upsertMinOrderValue = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = minOrderSchema.parse(req.body);

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  const record = await prisma.shopMinOrder.upsert({
    where: { shopkeeperId: shopkeeper.id },
    create: {
      shopkeeperId: shopkeeper.id,
      minimumValue: payload.minimumOrderValue,
    },
    update: {
      minimumValue: payload.minimumOrderValue,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Minimum order value saved successfully", record));
});


const getMinOrderValue = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  const record = await prisma.shopMinOrder.findUnique({
    where: { shopkeeperId: shopkeeper.id },
    include: {
      shopkeeper: {
        select: { id: true, shopName: true, shopCategory: true, isActive: true },
      },
    },
  });

  if (!record) {
    throw new ApiError(404, "Minimum order value not set for this shop");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Minimum order value fetched successfully", record));
});

const upsertDeliveryRates = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const payload = deliveryRatesSchema.parse(req.body);

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }

  const record = await prisma.shopDeliveryRate.upsert({
    where: { shopkeeperId: shopkeeper.id },
    create: {
      shopkeeperId: shopkeeper.id,
      rates: payload.rates,
    },
    update: {
      rates: payload.rates,
    },
  });

  return res
    .status(201)
    .json(new ApiResponse(201, "Delivery rates saved successfully", record));
});

const getDeliveryRates = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
    select: { id: true },
  });

  if (!shopkeeper) {
    throw new ApiError(404, "Unauthorized, only shopkeepers allowed");
  }
  const record = await prisma.shopDeliveryRate.findUnique({
    where: { shopkeeperId: shopkeeper.id },
    include: {
      shopkeeper: {
        select: { id: true, shopName: true, shopCategory: true, isActive: true },
      },
    },
  });

  if (!record) {
    throw new ApiError(404, "Delivery rates not set for this shop");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "Delivery rates fetched successfully", record));
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

  // Return all products (active and inactive) for this shopkeeper
  const baseWhere = { shopkeeper: { userId: req.user!.id } };

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
    const isGlobal = !!p.isGlobalProduct;
    // If product is global, read canonical data from GlobalProduct
    const source: any = isGlobal && p.globalProduct ? p.globalProduct : p;

    return {
      id: p.id,
      // flags
      isGlobalProduct: isGlobal,
      is_globle_product: isGlobal, // requested alias
      isActive: p.isActive,
      isGlobalProductActive: isGlobal ? p.globalProduct?.isActive : undefined,
      is_globle_product_active: isGlobal ? p.globalProduct?.isActive : undefined, // requested alias

      // core product info (global source when applicable)
      category: p.productCategories?.name || null,
      brand: source?.brand || null,
      name: source?.name || null,
      description: source?.description || null,
      images: source?.images || [],

      // pricing always from shop product
      pricing: p.prices,

      // relations/ids
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
  const query = req.query as {
    currentPage?: string;
    itemsPerPage?: string;
    page?: string;
    limit?: string;
    "pagination[currentPage]"?: string;
    "pagination[itemsPerPage]"?: string;
  };

  const parsePage = (value?: string, fallback = 1) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const currentPage =
    parsePage(query["pagination[currentPage]"]) ||
    parsePage(query.currentPage) ||
    parsePage(query.page);
  const itemsPerPage =
    parsePage(query["pagination[itemsPerPage]"], 10) ||
    parsePage(query.itemsPerPage, 10) ||
    parsePage(query.limit, 10);

  const skip = (currentPage - 1) * itemsPerPage;

  const [globalProducts, totalCount] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      include: { productCategories: true },
      skip,
      take: itemsPerPage,
    }),
    prisma.globalProduct.count(),
  ]);

  const formattedProducts = globalProducts.map((p) => ({
    id: p.id,
    category: p.productCategories?.name ?? null,
    brand: p.brand,
    name: p.name,
    description: p.description,
    images: p.images,
    isActive: p.isActive,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Global products fetched successfully", {
      products: formattedProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const searchGlobalProducts = asyncHandler(async (req, res) => {
  const searchQuery = (req.query.search as string || "").trim().toLowerCase();

  const query = req.query as {
    currentPage?: string;
    itemsPerPage?: string;
    page?: string;
    limit?: string;
    "pagination[currentPage]"?: string;
    "pagination[itemsPerPage]"?: string;
  };

  const parsePage = (value?: string, fallback = 1) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const currentPage =
    parsePage(query["pagination[currentPage]"]) ||
    parsePage(query.currentPage) ||
    parsePage(query.page);
  const itemsPerPage =
    parsePage(query["pagination[itemsPerPage]"], 10) ||
    parsePage(query.itemsPerPage, 10) ||
    parsePage(query.limit, 10);

  const skip = (currentPage - 1) * itemsPerPage;

  if (!searchQuery) {
    return res.status(400).json(
      new ApiResponse(400, "Search query is required", {
        products: [],
        pagination: {
          currentPage,
          itemsPerPage,
          totalItems: 0,
          totalPages: 0,
        },
      })
    );
  }

  // Search in product name and category
  const [globalProducts, totalCount] = await prisma.$transaction([
    prisma.globalProduct.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
          { brand: { contains: searchQuery, mode: "insensitive" } },
          { productCategories: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
      include: { productCategories: true },
      skip,
      take: itemsPerPage,
    }),
    prisma.globalProduct.count({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
          { brand: { contains: searchQuery, mode: "insensitive" } },
          { productCategories: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
    }),
  ]);

  const formattedProducts = globalProducts.map((p) => ({
    id: p.id,
    category: p.productCategories?.name ?? null,
    brand: p.brand,
    name: p.name,
    description: p.description,
    images: p.images,
    isActive: p.isActive,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Global products search results", {
      products: formattedProducts,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const searchShopProducts = asyncHandler(async (req, res) => {
  const searchQuery = (req.query.search as string || "").trim().toLowerCase();

  const query = req.query as {
    currentPage?: string;
    itemsPerPage?: string;
    page?: string;
    limit?: string;
    "pagination[currentPage]"?: string;
    "pagination[itemsPerPage]"?: string;
  };

  const parsePage = (value?: string, fallback = 1) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  };

  const currentPage =
    parsePage(query["pagination[currentPage]"]) ||
    parsePage(query.currentPage) ||
    parsePage(query.page);
  const itemsPerPage =
    parsePage(query["pagination[itemsPerPage]"], 10) ||
    parsePage(query.itemsPerPage, 10) ||
    parsePage(query.limit, 10);

  const skip = (currentPage - 1) * itemsPerPage;

  if (!searchQuery) {
    return res.status(400).json(
      new ApiResponse(400, "Search query is required", {
        products: [],
        pagination: {
          currentPage,
          itemsPerPage,
          totalItems: 0,
          totalPages: 0,
        },
      })
    );
  }

  // Search in product name, category, brand, and description
  const [shopProducts, totalCount] = await prisma.$transaction([
    prisma.shopProduct.findMany({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
          { brand: { contains: searchQuery, mode: "insensitive" } },
          { productCategories: { name: { contains: searchQuery, mode: "insensitive" } } },
          { globalProduct: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
      include: {
        prices: true,
        productCategories: true,
        ratings: true,
        globalProduct: true,
      },
      skip,
      take: itemsPerPage,
    }),
    prisma.shopProduct.count({
      where: {
        OR: [
          { name: { contains: searchQuery, mode: "insensitive" } },
          { description: { contains: searchQuery, mode: "insensitive" } },
          { brand: { contains: searchQuery, mode: "insensitive" } },
          { productCategories: { name: { contains: searchQuery, mode: "insensitive" } } },
          { globalProduct: { name: { contains: searchQuery, mode: "insensitive" } } },
        ],
      },
    }),
  ]);

  const formattedProducts = shopProducts.map((p) => ({
    id: p.id,
    shopkeeperId: p.shopkeeperId,
    category: p.productCategories?.name ?? null,
    brand: p.brand,
    name: p.name,
    description: p.description,
    images: p.images,
    stock: p.stock,
    isActive: p.isActive,
    isGlobalProduct: p.isGlobalProduct,
    globalProductId: p.globalProductId,
    prices: p.prices,
    rating: {
      average:
        p.ratings.length > 0
          ? p.ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / p.ratings.length
          : 0,
      count: p.ratings.length,
    },
  }));

  return res.status(200).json(
    new ApiResponse(200, "Shop products search results", {
      products: formattedProducts,
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
const updateShopProductStatus = asyncHandler(async (req, res) => {
  // Toggle `isActive` on a shop product owned by the authenticated shopkeeper
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const paramProductId = req.params.productId;
  const bodyProductId = req.body?.productId;
  const productIdNum = Number.parseInt((paramProductId ?? bodyProductId ?? "").toString(), 10);
  const isActive = req.body?.isActive;

  if (!Number.isInteger(productIdNum) || productIdNum <= 0) {
    throw new ApiError(400, "Valid productId is required");
  }
  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive (boolean) is required");
  }

  // Ensure requester is a shopkeeper
  const shopkeeper = await prisma.shopkeeper.findUnique({ where: { userId: req.user.id } });
  if (!shopkeeper) throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");

  // Verify product ownership
  const product = await prisma.shopProduct.findUnique({ where: { id: productIdNum } });
  if (!product || product.shopkeeperId !== shopkeeper.id) {
    throw new ApiError(404, "Product not found or unauthorized");
  }

  const updated = await prisma.shopProduct.update({
    where: { id: product.id },
    data: {
      isActive,
    },
    include: { prices: true, globalProduct: true, productCategories: true },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Product status updated successfully", updated));
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

  // Check if globalProductId exists
  if (!globalProductId) {
    throw new ApiError(400, "globalProductId is required");
  }

  // Check if pricing array is present and not empty
  if (!Array.isArray(pricing) || pricing.length === 0) {
    throw new ApiError(400, "pricing array is required and cannot be empty");
  }

  const product = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Find shopkeeper
    const shopkeeper = await tx.shopkeeper.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!shopkeeper) {
      throw new ApiError(404, "Unauthorized access, only shopkeepers allowed");
    }

    // Check if global product exists
    const globalProduct = await tx.globalProduct.findUnique({
      where: { id: globalProductId },
      select: { id: true, productCategoryId: true },
    });
    if (!globalProduct) {
      throw new ApiError(404, "Global product not found");
    }

    // Create shop product with only globalProductId and productCategoryId
    const newProduct = await tx.shopProduct.create({
      data: {
        shopkeeperId: shopkeeper.id,
        productCategoryId: globalProduct.productCategoryId,
        isGlobalProduct: true,
        globalProductId: globalProduct.id,
      },
      select: { id: true },
    });
    if (!newProduct) {
      throw new ApiError(500, "Failed to create shop product");
    }

    // Store all prices in productPrice table
    const priceIds: number[] = [];
    for (const priceData of pricing) {
      const createdPrice = await tx.productPrice.create({
        data: {
          price: Number(priceData.price),
          discount: Number(priceData.discount || 0),
          weight: Number(priceData.weight),
          unit: priceData.unit,
          stock: Number(priceData.stock || 0),
          shopProductId: newProduct.id,
        },
        select: { id: true },
      });
      priceIds.push(createdPrice.id);
    }

    // Update shopProduct with priceIds
    return tx.shopProduct.update({
      where: { id: newProduct.id },
      data: { priceIds },
      include: {
        prices: true,
        globalProduct: true,
        productCategories: true
      },
    });
  });

  if (!product) {
    throw new ApiError(500, "Failed to add product");
  }

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

  // Prepare update data (restrict for global products)
  const updateData: any = {};
  const isGlobal = !!product.isGlobalProduct;

  const incoming = (product as any) || {};
  if (!isGlobal) {
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
  }

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
      currentPage?: string;
      itemsPerPage?: string;
    }) || {};
  // const statusFilter = req.query.status as string
  const statusFilter: OrderStatus[] = ["pending", "confirmed", "shipped"] as const;

  // console.log("Status filter:", statusFilter);
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;
  const baseWhere: any = {
    orderItems: {
      some: { product: { shopkeeper: { userId: req.user.id } } },
    },
  };
  if (statusFilter && Array.isArray(statusFilter) && statusFilter.length > 0) {
    baseWhere.status = { in: statusFilter };
  }

  const [orders, totalCount] = await prisma.$transaction([
    prisma.order.findMany({
      where: baseWhere,
      include: {
        address: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    }),
    prisma.order.count({
      where: baseWhere,
    }),
  ]);

  const formattedOrders = orders.map((order) => ({
    id: order.id,
    customerName: order.address.name,
    phoneNumber: order.address.phone,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", {
      orders: formattedOrders,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
      },
    })
  );
});

const getOrders = asyncHandler(async (req, res) => {
  // write steps to get current orders for the shop
  // 1. Parse pagination params from query
  // 2. Fetch orders from DB with pagination
  // 3. Return orders with pagination info

  if (!req.user) throw new ApiError(401, "User not authenticated");

  const pagination =
    (req.query.pagination as {
      currentPage?: string;
      itemsPerPage?: string;
    }) || {};

  // Get filter from query parameter, default to "all"
  const filterParam = (req.query.status as string || "all").toLowerCase();

  // Define all possible order statuses
  const allStatuses: OrderStatus[] = ["pending", "confirmed", "shipped", "cancelled", "delivered"];

  // Build statusFilter based on filter parameter
  let statusFilter: OrderStatus[] = allStatuses;
  if (filterParam !== "all" && filterParam.length > 0) {
    // If specific status provided, validate and use only that
    if (allStatuses.includes(filterParam as OrderStatus)) {
      statusFilter = [filterParam as OrderStatus];
    }
  }

  // console.log("Status filter:", statusFilter);
  const currentPage = parseInt(pagination.currentPage || "1");
  const itemsPerPage = parseInt(pagination.itemsPerPage || "10");
  const skip = (currentPage - 1) * itemsPerPage;
  const baseWhere: any = {
    orderItems: {
      some: { product: { shopkeeper: { userId: req.user.id } } },
    },
  };
  if (statusFilter && Array.isArray(statusFilter) && statusFilter.length > 0) {
    baseWhere.status = { in: statusFilter };
  }

  const [orders, totalCount] = await prisma.$transaction([
    prisma.order.findMany({
      where: baseWhere,
      include: {
        address: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: itemsPerPage,
    }),
    prisma.order.count({
      where: baseWhere,
    }),
  ]);

  const formattedOrders = orders.map((order) => ({
    id: order.id,
    customerName: order.address.name,
    status: order.status,
    totalAmount: order.totalAmount,
    createdAt: order.createdAt,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Orders fetched successfully", {
      orders: formattedOrders,
      pagination: {
        currentPage,
        itemsPerPage,
        totalItems: totalCount,
        totalPages: Math.ceil(totalCount / itemsPerPage),
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
                    where: { isVerified: true, status: 'approved', isAvailable: true },
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
    userId: order.userId,
    customerName: order.address.name,
    customerPhone: order.address.phone,
    address: `${order.address.line1}, ${order.address.city}, ${order.address.state}, ${order.address.pinCode}`,
    geoLocation: order.address.geoLocation ?? null,
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
          riderAssignedAt: new Date(),
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

  // Fetch all riders with all registration info
  const riders = await prisma.deliveryBoy.findMany({
    where: whereClause,
    include: {
      user: { select: { id: true, name: true, phone: true, image: true, email: true, createdAt: true, updatedAt: true, role: true } },
      // Add more includes if you have more info in deliveryBoy model (e.g., address, documents, etc.)
    },
  });
  console.log(`Fetched ${riders.length} riders for shopkeeper ${shopkeeper.id}`);
  // For each rider, fetch order stats
  const riderStats = await Promise.all(
    riders.map(async (rider) => {
      // Orders where this deliveryBoy is assigned
      const [
        totalAccepted,
        totalDelivered,
        totalCancelled,
        assignedOrdersCount
      ] = await prisma.$transaction([
        prisma.order.count({ where: { assignedDeliveryBoyId: rider.id } }),
        prisma.order.count({ where: { assignedDeliveryBoyId: rider.id, status: "delivered" } }),
        prisma.order.count({ where: { assignedDeliveryBoyId: rider.id, status: "cancelled" } }),
        prisma.order.count({ where: { assignedDeliveryBoyId: rider.id, status: { notIn: ["delivered", "cancelled"] } } }),
      ]);

      // Rider is busy if they have assigned orders (not delivered or cancelled)
      const isBusy = assignedOrdersCount > 0;

      // Merge all info
      return {
        ...rider,
        user: rider.user,
        totalOrdersAccepted: totalAccepted || 0,
        totalOrdersDelivered: totalDelivered || 0,
        totalOrdersCancelled: totalCancelled || 0,
        isBusy,
        assignedOrdersCount,
      };
    })
  );

  // Count total busy riders
  const totalBusyRiders = riderStats.filter(rider => rider.isBusy).length;

  // console.log("Rider stats:", riderStats);
  return res.status(200).json(new ApiResponse(200, "Riders fetched", {
    riders: riderStats,
    totalBusyRiders,
  }));
});

const approveRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId, status } = req.body;

  if (!["approved", "suspended", "rejected",].includes(status)) {
    throw new ApiError(400, "Invalid status value");
  }
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
    data: {
      isVerified: status === "approved" ? true : false,
      status: status
    }
  });

  return res.status(200).json(new ApiResponse(200, "Rider approved", updated));
});

const rejectRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId } = req.params;

  // Verify shopkeeper owns this rider request
  const rider = await prisma.deliveryBoy.findFirst({
    where: {
      id: Number(riderId),
      shopkeeper: { userId: req.user.id },
    },
  });
  if (!rider) throw new ApiError(404, "Rider request not found");

  // Delete the profile so they can re-apply or just to remove from list
  // Also revert user role if needed?
  // If we delete DeliveryBoy, user role stays "delivery_boy". We should probably revert it to "user".

  await prisma.$transaction(async (tx) => {
    await tx.deliveryBoy.delete({ where: { id: Number(riderId) } });
    await tx.user.update({
      where: { id: rider.userId },
      data: { role: "user" },
    });
  });

  return res
    .status(200)
    .json(new ApiResponse(200, "Rider rejected and removed"));
});
const suspendRider = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { riderId } = req.body;

  // Verify shopkeeper owns this rider
  const rider = await prisma.deliveryBoy.findFirst({
    where: {
      id: riderId,
      shopkeeper: { userId: req.user.id },
    },
  });
  if (!rider) throw new ApiError(404, "Rider not found");

  const updated = await prisma.deliveryBoy.update({
    where: { id: riderId },
    data: { status: "suspended", isAvailable: false },
  });

  return res.status(200).json(new ApiResponse(200, "Rider suspended", updated));
});

const getRiderAnalytics = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");
  const range = ((req.query.range as string) || "all").toLowerCase();

  const buildDateFilter = () => {
    const now = new Date();
    switch (range) {
      case "7d":
      case "past7days": {
        const gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "30d":
      case "lastmonth":
      case "1m": {
        const gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "3m":
      case "last3months": {
        const gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "all":
      default:
        return {};
    }
  };

  const dateFilter = buildDateFilter();

  const [totalRiders, availableRiders, busyRiders, deliveredOrders] =
    await prisma.$transaction([
      prisma.deliveryBoy.count({ where: { shopkeeperId: shopkeeper.id } }),
      prisma.deliveryBoy.count({
        where: { shopkeeperId: shopkeeper.id, isAvailable: true },
      }),
      prisma.deliveryBoy.count({
        where: { shopkeeperId: shopkeeper.id, isAvailable: false },
      }),
      prisma.order.count({
        where: {
          status: "delivered",
          orderItems: { some: { product: { shopkeeperId: shopkeeper.id } } },
          ...dateFilter,
        },
      }),
    ]);

  return res.status(200).json(
    new ApiResponse(200, "Rider analytics fetched", {
      range,
      metrics: {
        totalRiders,
        availableRiders,
        busyRiders,
        deliveredOrders,
      },
    })
  );
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

  const range = ((req.query.range as string) || "all").toLowerCase();

  // Date filter helper for requested window
  const buildDateFilter = () => {
    const now = new Date();
    switch (range) {
      case "7d":
      case "past7days": {
        const gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "30d":
      case "lastmonth":
      case "1m": {
        const gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "3m":
      case "last3months": {
        const gte = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return { createdAt: { gte } };
      }
      case "all":
      default:
        return {};
    }
  };

  const dateFilter = buildDateFilter();

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
      activeOrders: activeOrders.toString(),
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

/**
 * Get Detailed Analytics for a Specific Rider
 * Includes: total orders, delivered, cancelled, ratings, order history, daily stats, documents, contact details, avg delivery time
 */
const getRiderDetailedAnalytics = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  const { riderId } = req.params;
  const riderIdNum = Number(riderId);

  if (!riderIdNum) throw new ApiError(400, "Valid riderId is required");

  // Verify shopkeeper and that rider belongs to them
  const shopkeeper = await prisma.shopkeeper.findUnique({
    where: { userId: req.user.id },
  });

  if (!shopkeeper) throw new ApiError(404, "Shop not found");

  const rider = await prisma.deliveryBoy.findUnique({
    where: { id: riderIdNum },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          image: true,
        },
      },
    },
  });

  if (!rider) throw new ApiError(404, "Rider not found");
  if (rider.shopkeeperId !== shopkeeper.id)
    throw new ApiError(403, "Rider does not belong to your shop");

  // Fetch all orders assigned to this rider
  const allOrders = await prisma.order.findMany({
    where: { assignedDeliveryBoyId: riderIdNum },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          image: true,
        },
      },
      address: true,
      orderItems: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate metrics
  const totalOrders = allOrders.length;
  const ordersAccepted = allOrders.filter((o) => o.status !== "pending").length;
  const deliveredOrders = allOrders.filter((o) => o.status === "delivered");
  const cancelledOrders = allOrders.filter((o) => o.status === "cancelled");

  // Get ratings for the rider
  const riderRatings = await prisma.order.findMany({
    where: {
      assignedDeliveryBoyId: riderIdNum,
      status: "delivered",
      // riderRating: { not: null },
    },
    // select: {
    //   riderRating: true,
    // },
  });

  // const avgRating =
  //   riderRatings.length > 0
  //     ? riderRatings.reduce((sum, r) => sum + (r.riderRating || 0), 0) /
  //       riderRatings.length
  //     : 0;
  const avgRating = 0;
  // Calculate average delivery time (in hours)
  const ordersWithDeliveryTime = allOrders.filter(
    (o) => o.riderAssignedAt && o.deliveredAt
  );

  const avgDeliveryTimeMs =
    ordersWithDeliveryTime.length > 0
      ? ordersWithDeliveryTime.reduce((sum, o) => {
        const diff =
          new Date(o.deliveredAt!).getTime() -
          new Date(o.riderAssignedAt!).getTime();
        return sum + diff;
      }, 0) / ordersWithDeliveryTime.length
      : 0;

  const avgDeliveryTimeHours = Math.round(avgDeliveryTimeMs / (1000 * 60 * 60) * 100) / 100;

  // Daily order stats for graph (last 30 days starting from today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dailyStats: {
    [key: string]: { completed: number; cancelled: number; orderValue: number };
  } = {};

  // Initialize daily stats for the last 30 days starting from today
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i); // Go backwards from today
    const dateStr = date.toISOString().split("T")[0];
    dailyStats[dateStr] = { completed: 0, cancelled: 0, orderValue: 0 };
  }

  // Populate delivered orders into daily stats
  // Use updatedAt if deliveredAt is not available
  deliveredOrders.forEach((order) => {
    const dateToUse = order.deliveredAt || order.updatedAt;
    const deliveredDate = new Date(dateToUse);
    deliveredDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const dateStr = deliveredDate.toISOString().split("T")[0];

    // Check if date is within our 30-day window
    if (dailyStats[dateStr]) {
      dailyStats[dateStr].completed += 1;
      dailyStats[dateStr].orderValue += order.totalAmount;
    }
  });

  // Populate cancelled orders into daily stats
  cancelledOrders.forEach((order) => {
    const cancelledDate = new Date(order.updatedAt);
    cancelledDate.setHours(0, 0, 0, 0); // Normalize to start of day
    const dateStr = cancelledDate.toISOString().split("T")[0];

    // Check if date is within our 30-day window
    if (dailyStats[dateStr]) {
      dailyStats[dateStr].cancelled += 1;
    }
  });

  // Format daily stats as array, sorted by date
  const dailyStatsArray = Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      ...stats,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Document details
  const documentDetails = {
    aadharNumber: rider.aadharNumber,
    panNumber: rider.panNumber,
    licenseNumber: rider.licenseNumber,
    licenseImages: rider.licenseImage,
    vehicleNo: rider.vehicleNo,
    vehicleName: rider.vehicleName,
    vehicleOwnerName: rider.vehicleOwnerName,
  };

  // Order history (detailed)
  const orderHistory = allOrders.map((order) => ({
    id: order.id,
    orderNo: `ORD-${order.id}`,
    status: order.status,
    totalAmount: order.totalAmount,
    totalProducts: order.totalProducts,
    paymentMethod: order.paymentMethod,
    customerName: order.user?.name || "N/A",
    customerPhone: order.user?.phone || "N/A",
    deliveryAddress: order.address
      ? `${order.address.line1}, ${order.address.city}`
      : "N/A",
    createdAt: order.createdAt,
    riderAssignedAt: order.riderAssignedAt,
    deliveredAt: order.deliveredAt,
    // riderRating: order.riderRating,
    itemCount: order.orderItems.length,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Rider detailed analytics fetched", {
      riderInfo: {
        id: rider.id,
        name: rider.user.name,
        phone: rider.user.phone,
        email: rider.user.email,
        avatar: rider.avatar,
        userImage: rider.user.image,
        vehicleNo: rider.vehicleNo,
        isAvailable: rider.isAvailable,
      },
      documentDetails,
      contactDetails: {
        name: rider.user.name,
        phone: rider.user.phone,
        email: rider.user.email,
        image: rider.user.image,
      },
      metrics: {
        totalOrders,
        ordersAccepted,
        deliveredCount: deliveredOrders.length,
        cancelledCount: cancelledOrders.length,
        averageRating: parseFloat(avgRating.toFixed(2)),
        ratingCount: riderRatings.length,
        averageDeliveryTimeHours: avgDeliveryTimeHours,
      },
      earnings: {
        totalEarnings: deliveredOrders.reduce((sum, o) => sum + o.totalAmount, 0),
        deliveredOrderValue: deliveredOrders.reduce(
          (sum, o) => sum + o.totalAmount,
          0
        ),
      },
      graphData: {
        daily: dailyStatsArray,
      },
      orderHistory: {
        count: orderHistory.length,
        orders: orderHistory,
      },
    })
  );
});

/* ********************************************* Exports Controllers ********************************************* */

// Shop Management Controllers
export {
  createShop,
  updateShop,
  updateShopkeeperAddress,
  getShopGeoLocation,
  getShopkeeperAddress,
  getShopDetails,
  upsertShopSchedule,
  getShopSchedule,
  upsertMinOrderValue,
  getMinOrderValue,
  upsertDeliveryRates,
  getDeliveryRates,
  getShopStatus
};

// Product Management Controllers
export {
  getShopCategories,
  getShopProducts,
  getGlobalProducts,
  searchGlobalProducts,
  searchShopProducts,
  addShopGlobalProduct,
  addShopProduct,
  updateShopProductStatus,
  updateShopProduct,
  updateStockAndPrice,
  addShopProductFromGlobleProduct,
  suspendRider,

};
// Order Management Controllers
export { getCurrentOrders, getOrderById, updateOrderStatus, getOrders };

// Shop Controllers for Riders
export { getShopRiders, approveRider, rejectRider, getRiderAnalytics, getRiderDetailedAnalytics };

// other controllers
// export { getUserByPhone, sendInviteToDeliveryPartner };
export { getShopAnalytics };
