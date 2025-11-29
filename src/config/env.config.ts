import dotenv from "dotenv";
dotenv.config();

const _env = {
  cors_origin: process.env.CORS_ORIGIN?.includes(",")
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.CORS_ORIGIN,
  port: Number(process.env.PORT),
  node_env: String(process.env.NODE_ENV).toLowerCase(),
  clientUrl: process.env.CLIENT_URL,
  isNodeEnvDevelopment:
    String(process.env.NODE_ENV).toLowerCase() === "development",

  // jwt
  jwtSecret: String(process.env.JWT_SECRET!),
  jwtAccessTokenExpiresIn: parseInt(process.env.JWT_ACCESS_TOKEN_EXPIRES_IN!),
  jwtRefreshTokenExpiresIn: parseInt(process.env.JWT_REFRESH_TOKEN_EXPIRES_IN!),

  // redis
  redisUsername: process.env.REDIS_USERNAME,
  redisPassword: process.env.REDIS_PASSWORD,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT,

  // SMS provider (MSG91)
  smsApiKey: process.env.SMS_API_KEY,
  smsTemplateId: process.env.SMS_TEMPLATE_ID,
  smsOtpExpiresAt: parseInt(process.env.SMS_OTP_EXPIRES_AT || "300", 10), // in seconds

  // google credentials
  // googleClientId: process.env.GOOGLE_CLIENT_ID,
  // googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  gcsBucketName: process.env.GCS_BUCKET_NAME!,

  // smtp (email)
  smtpHost: process.env.SMTP_HOST,
  smtpPort: Number(process.env.SMTP_PORT),
  smtpUser: process.env.SMTP_USER,
  smtpPassword: process.env.SMTP_PASSWORD,

  // push notification
  vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
  vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
  vapidSubject: process.env.VAPID_SUBJECT!,
};

const env = Object.freeze(_env);
export default env;
