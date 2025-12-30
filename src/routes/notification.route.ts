import { Router } from "express";
import * as push from "../controllers/notification.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// All notification routes require authentication
router.use(authMiddleware);

router.post("/push/vapid-public-key", push.getVapidPublicKey);
router.post("/push/subscribe", push.subscribePushNotification);
router.post("/push/send/user/:userId", push.sendNotificationbyUserId);
router.post("/push/send/all", push.sendNotificationToAll);
router.get("/all", push.getNotifications);

router.patch("/mark-read/:id/read", push.markNotificationRead);

export default router;
