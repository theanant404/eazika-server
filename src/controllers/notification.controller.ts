import {
  sendPushNotification,
  sendPushNotificationToAllSubscribers,
} from "../notification/push-notification";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse, ApiError } from "../utils/apiHandler";
import env from "../config/env.config";
import prisma from "../config/db.config";
import { SubscriptionSchema } from "../validations/notification.valodation";

const { vapidPublicKey } = env;

const getVapidPublicKey = asyncHandler(async (_, res) => {
  res.send({ publicKey: vapidPublicKey });
});

const subscribePushNotification = asyncHandler(async (req, res) => {
  const subscription = SubscriptionSchema.parse(req.body.subscription);

  const subscribe = await prisma.$transaction(async (tx) => {
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

  const pushResult = await sendPushNotification(userId);
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

export {
  getVapidPublicKey,
  subscribePushNotification,
  sendNotificationbyUserId,
  sendNotificationToAll,
};
