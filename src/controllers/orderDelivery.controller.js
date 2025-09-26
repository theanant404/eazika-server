import prisma from "../config/dbConfig.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse, ApiError } from "../utils/apiHandler.js";

// List available orders for delivery (unassigned, confirmed or ready for pickup)
export const getAvailableOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] },
      deliveryBoyId: null,
    },
    include: {
      customer: { select: { id: true, name: true, phone: true } },
      shop: { select: { id: true, name: true, address: true } },
      orderItems: {
        include: { shopProduct: { include: { globalProduct: true } } },
      },
    },
    take: parseInt(limit),
    skip: parseInt(skip),
    orderBy: { createdAt: "asc" },
  });

  const total = await prisma.order.count({
    where: {
      status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] },
      deliveryBoyId: null,
    },
  });

  res.json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },"Available orders fetched")
  );
});

// Delivery boy claims an order (assigns self)
export const claimOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Ensure order is unassigned and assign to current delivery boy
  const updatedOrder = await prisma.order.updateMany({
    where: {
      id,
      deliveryBoyId: null,
      status: { in: ["CONFIRMED", "READY_FOR_PICKUP"] },
    },
    data: {
      deliveryBoyId: req.user.id,  // Add this line to set the deliveryBoyId directly
      deliveryInfo: {
        deliveryBoyId: req.user.id,
        assignedAt: new Date().toISOString(),
      },
      status: "OUT_FOR_DELIVERY",
      statusHistory: {
        push: {
          status: "OUT_FOR_DELIVERY",
          changedAt: new Date().toISOString(),
          by: req.user.id,
          notes: "Delivery boy claimed order",
        },
      },
    },
  });

  if (updatedOrder.count === 0) {
    throw new ApiError(400, "Order not available for claiming");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      customer: true,
      shop: true,
      orderItems: true,
    },
  });

  res.json(new ApiResponse(200,  order, "Order claimed successfully"));
});

// Update order - picked up
export const markPickedUp = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw new ApiError(404, "Order not found");
  if (order.deliveryInfo?.deliveryBoyId !== req.user.id) {
    throw new ApiError(403, "You are not assigned to this order");
  }
  if (order.status !== "OUT_FOR_DELIVERY")
    throw new ApiError(400, "Order not in OUT_FOR_DELIVERY status");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "OUT_FOR_DELIVERY",
      statusHistory: {
        push: {
          status: "OUT_FOR_DELIVERY",
          changedAt: new Date().toISOString(),
          by: req.user.id,
          notes: "Order picked up by delivery boy",
        },
      },
    },
  });

  res.json(new ApiResponse(200,  updatedOrder,"Order marked as picked up"));
});

// Update order - delivered
export const markDelivered = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await prisma.order.findUnique({ where: { id } });

  if (!order) throw new ApiError(404, "Order not found");
  if (order.deliveryInfo?.deliveryBoyId !== req.user.id) {
    throw new ApiError(403, "You are not assigned to this order");
  }
  if (order.status !== "OUT_FOR_DELIVERY")
    throw new ApiError(400, "Order not in OUT_FOR_DELIVERY status");

  const updatedOrder = await prisma.order.update({
    where: { id },
    data: {
      status: "DELIVERED",
      deliveredAt: new Date(),
      statusHistory: {
        push: {
          status: "DELIVERED",
          changedAt: new Date().toISOString(),
          by: req.user.id,
          notes: "Order delivered",
        },
      },
    },
  });

  // Update delivery boy stats
  await prisma.deliveryProfile.update({
    where: { userId: req.user.id },
    data: { totalDeliveries: { increment: 1 } },
  });

  res.json(new ApiResponse(200,  updatedOrder,"Order marked as delivered"));
});

// List assigned orders for delivery boy
export const getAssignedOrders = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: {
      deliveryBoyId: req.user.id,
      status: "OUT_FOR_DELIVERY",
    },
    include: {
      customer: true,
      shop: true,
      orderItems: true,
    },
    orderBy: { createdAt: "desc" },
    take: parseInt(limit),
    skip: parseInt(skip),
  });

  const total = await prisma.order.count({
    where: {
      deliveryBoyId: req.user.id,
      status: "OUT_FOR_DELIVERY",
    },
  });

  res.json(
    new ApiResponse(200,  {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },"Assigned orders retrieved")
  );
});

// Get delivery history (delivered orders)
export const getDeliveryHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  const orders = await prisma.order.findMany({
    where: {
      deliveryBoyId: req.user.id,
      status: "DELIVERED",
    },
    take: parseInt(limit),
    skip: parseInt(skip),
    orderBy: { createdAt: "desc" },
    include: { customer: true, shop: true, orderItems: true },
  });

  const total = await prisma.order.count({
    where: {
      deliveryBoyId: req.user.id,
      status: "DELIVERED",
    },
  });

  res.json(
    new ApiResponse(200, {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    }, "Delivery history retrieved")
  );
});
