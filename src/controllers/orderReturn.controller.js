import prisma from '../config/dbConfig.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse, ApiError } from '../utils/apiHandler.js';

// Customer requests a return
export const requestReturn = asyncHandler(async (req, res) => {
  const { orderItemId, reason } = req.body;

  const orderItem = await prisma.orderItem.findUnique({
    where: { id: orderItemId },
    include: { order: true }
  });
  if (!orderItem || orderItem.order.customerId !== req.user.id)
    throw new ApiError(404, "Order item not found");

  // Check if already has an active return
  const existing = await prisma.returnRequest.findFirst({
    where: { orderItemId, status: { in: ["REQUESTED", "APPROVED", "PICKED_UP", "RECEIVED"] } }
  });
  if (existing)
    throw new ApiError(400, "Return already requested or in progress");

  // Eligibility: delivered, isReturnable, within days
  if (orderItem.order.status !== 'DELIVERED')
    throw new ApiError(400, "Can only return delivered orders");

  if (orderItem.snapshot?.isReturnable === false)
    throw new ApiError(400, "Item is not returnable");

  const deliveredAt = new Date(orderItem.order.deliveredAt);
  const now = new Date();
  const maxDays = orderItem.snapshot?.returnPeriodDays || 7;
  if ((now - deliveredAt) / (1000 * 3600 * 24) > maxDays)
    throw new ApiError(400, `Return period expired (${maxDays} days)`);

  const ret = await prisma.returnRequest.create({
    data: {
      orderItemId,
      reason,
      status: "REQUESTED",
      metadata: {
        history: [
          {
            status: "REQUESTED",
            changedAt: now.toISOString(),
            by: req.user.id,
            note: reason
          }
        ]
      }
    }
  });
  res.json(new ApiResponse(201, "Return requested", ret));
});

// Shopkeeper approves or rejects
export const processReturn = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, note } = req.body; // action: "APPROVED" or "REJECTED"

  const ret = await prisma.returnRequest.findUnique({
    where: { id },
    include: {
      orderItem: { include: { shopProduct: true } }
    }
  });
  if (!ret)
    throw new ApiError(404, "Return request not found");
  // Shopkeeper permission check (adjust if multi-admin)
  if (req.user.role !== "SHOPKEEPER" || ret.orderItem.shopProduct.shopId !== req.user.shopkeeperProfile.shopId)
    throw new ApiError(403, "Not allowed");

  let newStatus;
  if (action === "APPROVED") newStatus = "APPROVED";
  else if (action === "REJECTED") newStatus = "REJECTED";
  else throw new ApiError(400, "Action must be APPROVED or REJECTED");

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      status: newStatus,
      metadata: {
        ...ret.metadata,
        history: [
          ...(ret.metadata?.history || []),
          {
            status: newStatus,
            changedAt: new Date().toISOString(),
            by: req.user.id,
            note
          }
        ]
      }
    }
  });
  res.json(new ApiResponse(200, `Return ${action.toLowerCase()}`, updated));
});

// Mark as refunded (shopkeeper)
export const markRefunded = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ret = await prisma.returnRequest.findUnique({ where: { id } });
  if (!ret || ret.status !== "RECEIVED")
    throw new ApiError(400, "Not eligible for refund");
  if (req.user.role !== "SHOPKEEPER")
    throw new ApiError(403, "Not allowed");

  const updated = await prisma.returnRequest.update({
    where: { id },
    data: {
      status: "REFUNDED",
      metadata: {
        ...ret.metadata,
        history: [
          ...(ret.metadata?.history || []),
          {
            status: "REFUNDED",
            changedAt: new Date().toISOString(),
            by: req.user.id,
            note: "Refund issued"
          }
        ]
      }
    }
  });
  res.json(new ApiResponse(200, "Refunded", updated));
});

// Status/history endpoint
export const getReturnStatus = asyncHandler(async (req, res) => {
  const { orderItemId } = req.params;
  const returns = await prisma.returnRequest.findMany({
    where: { orderItemId },
    orderBy: { createdAt: 'desc' }
  });
  res.json(new ApiResponse(200, "Return history", returns));
});
