import webpush, { PushSubscription } from "web-push";
import env from "../config/env.config";
import prisma from "../config/db.config";
const { vapidPublicKey, vapidPrivateKey, vapidSubject } = env;

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

type PayloadType = {
  title?: string;
  body?: string;
  url?: string;
  data?: any;
};

const sendPushNotification = async (
  userIdOrPhone: string,
  payload: PayloadType = {}
) => {
  const subscription = await prisma.pushNotification.findFirst({
    where: { userId: Number(userIdOrPhone), phone: userIdOrPhone },
    select: { id: true, endpoint: true, p256dhKey: true, authKey: true },
  });

  if (!subscription) throw new Error("Subscription not found for the user");

  const authEndpoint: PushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  };
  const seedPayload = {
    title: payload?.title || "Eazika Notification",
    body: payload?.body || "Something for you from Eazika",
    url: payload?.url || "/",
    data: payload?.data || {},
  };

  const pushResult = await webpush.sendNotification(
    authEndpoint,
    JSON.stringify(seedPayload)
  );

  await prisma.pushNotificationHistory.create({
    data: {
      pushNotificationId: subscription.id,
      title: seedPayload.title,
      body: seedPayload.body,
      url: seedPayload.url,
      data: JSON.stringify(seedPayload.data),
    },
  });

  return pushResult;
};

const sendPushNotificationToAllSubscribers = async (
  payload: PayloadType = {}
) => {
  const subscriptions = await prisma.pushNotification.findMany({
    select: { id: true, endpoint: true, p256dhKey: true, authKey: true },
  });

  const seedPayload = {
    title: payload?.title || "Eazika Notification",
    body: payload?.body || "Something for you from Eazika",
    url: payload?.url || "/",
    data: payload?.data || {},
  };

  const sendResults = await Promise.all(
    subscriptions.map(async (subscription) => {
      const authEndpoint: PushSubscription = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dhKey,
          auth: subscription.authKey,
        },
      };
      const pushResult = await webpush.sendNotification(
        authEndpoint,
        JSON.stringify(seedPayload)
      );
      return pushResult;
    })
  );

  await prisma.pushNotificationHistory.createMany({
    data: subscriptions.map((subscription) => ({
      pushNotificationId: subscription.id,
      title: seedPayload.title,
      body: seedPayload.body,
      url: seedPayload.url,
      data: JSON.stringify(seedPayload.data),
    })),
  });

  return sendResults;
};

export { webpush, sendPushNotification, sendPushNotificationToAllSubscribers };
