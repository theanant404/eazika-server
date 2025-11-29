import zod from "zod";

export const SubscriptionSchema = zod.object({
  endpoint: zod.string(),
  expirationTime: zod.number().nullable().optional(),
  keys: zod.object({
    p256dh: zod.string(),
    auth: zod.string(),
  }),
  userDevice: zod.string().optional(),
});
