import {
  sendPushNotification,
  sendPushNotificationToAllSubscribers,
} from "../notification/push-notification";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandler";
import env from "../config/env.config";
import prisma from "../config/db.config";
import { SubscriptionSchema } from "../validations/notification.valodation";
import { Prisma } from "../generated/prisma/client";

const { vapidPublicKey } = env;

const getVapidPublicKey = asyncHandler(async (_, res) => {
  res.send({ publicKey: vapidPublicKey });
});

const subscribePushNotification = asyncHandler(async (req, res) => {
  const subscription = SubscriptionSchema.parse(req.body);
  console.log("Received subscription:", subscription);
  const subscribe = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existingSubscription = await tx.pushNotification.findFirst({
      where: { endpoint: subscription.endpoint },
    });
    if (existingSubscription && existingSubscription.userId == req.user!.id) {
      return null;
    }
    return await tx.pushNotification.create({
      data: {
        userId: req.user!.id,
        phone: req.user!.phone,
        endpoint: subscription.endpoint,
        authKey: subscription.keys.auth,
        p256dhKey: subscription.keys.p256dh,
        expirationTime: subscription.expirationTime
          ? new Date(subscription.expirationTime)
          : null,
        userDevice: subscription.userDevice || "Unknown Device",
      },
    });
  });
  if (subscribe === null) {
    return res
      .status(200)
      .json(new ApiResponse(200, "Subscription already exists"));
  }

  return res.json(new ApiResponse(201, "Subscription saved successfully"));
});

const sendNotificationbyUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  if (!userId) throw new ApiError(400, "User ID is required");
  const payload = req.body;
  const pushResult = await sendPushNotification(userId, payload);
  console.log("Push Result:", pushResult);
  if (![200, 201].includes(pushResult.statusCode))
    throw new ApiError(500, "Failed to send notification");

  return res.json(new ApiResponse(200, "Notification sent successfully"));
});

const sendNotificationToAll = asyncHandler(async (req, res) => {
  if (req.user!.role !== "admin")
    throw new ApiError(403, "You are not authorized");

  const pushResults = await sendPushNotificationToAllSubscribers({
    title: "Hello Subscribers",
    body: "This is a test notification to all subscribers.",
    url: "/welcome",
    data: { info: "Additional data can go here" },
  });

  const failedSends = pushResults.filter(
    (result) => ![200, 201].includes(result.statusCode)
  );

  if (failedSends.length > 0)
    throw new ApiError(500, "Failed to send notification to some subscribers");

  return res.json(
    new ApiResponse(200, "Notifications sent successfully to all subscribers")
  );
});

const getNotifications = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");

  // Fetch history for notifications tied to this user's subscriptions
  const histories = await prisma.pushNotificationHistory.findMany({
    where: {
      pushNotification: { userId: req.user.id },
    },
    orderBy: { createdAt: "desc" },
    include: {
      pushNotification: {
        select: {
          id: true,
          userId: true,
          phone: true,
          user: { select: { id: true, name: true, phone: true, role: true } },
        },
      },
    },
  });

  const items = histories.map((h) => ({
    id: h.id,
    title: h.title,
    body: h.body,
    url: h.url,
    data: h.data,
    isRead: h.isRead,
    createdAt: h.createdAt,
    sender: h.pushNotification?.user
      ? {
        id: h.pushNotification.user.id,
        name: h.pushNotification.user.name,
        phone: h.pushNotification.user.phone,
        role: h.pushNotification.user.role,
      }
      : null,
  }));

  return res.status(200).json(
    new ApiResponse(200, "Notifications fetched successfully", items)
  );
});

export {
  getVapidPublicKey,
  subscribePushNotification,
  sendNotificationbyUserId,
  sendNotificationToAll,
  getNotifications,
  markNotificationRead,
};

const markNotificationRead = asyncHandler(async (req, res) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  const { id } = req.params;
  if (!id) throw new ApiError(400, "Notification id is required");

  // Only allow marking as read if notification belongs to this user
  const notification = await prisma.pushNotificationHistory.findUnique({
    where: { id: Number(id) },
    include: { pushNotification: true },
  });
  if (!notification || notification.pushNotification.userId !== req.user.id) {
    throw new ApiError(404, "Notification not found or not yours");
  }

  await prisma.pushNotificationHistory.update({
    where: { id: Number(id) },
    data: { isRead: true },
  });

  return res.status(200).json(new ApiResponse(200, "Notification marked as read"));
});
