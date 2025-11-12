import dotenv from "dotenv";
dotenv.config();

const _env = {
  cors_origin: process.env.CORS_ORIGIN?.includes(",")
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.CORS_ORIGIN,
  port: Number(process.env.PORT),
  node_env: String(process.env.NODE_ENV).toLowerCase(),
  client_url: process.env.CLIENT_URL,
  isNodeEnvDevelopment:
    String(process.env.NODE_ENV).toLowerCase() === "development",

  // jwt
  jwt_access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET!,
  jwt_refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET!,
  jwt_access_token_expires_in: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  jwt_refresh_token_expires_in: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,

  // google credentials
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,

  // smtp (email)
  smtp_host: process.env.SMTP_HOST,
  smtp_port: Number(process.env.SMTP_PORT),
  smtp_user: process.env.SMTP_USER,
  smtp_pass: process.env.SMTP_PASS,
};

const env = Object.freeze(_env);
export default env;
