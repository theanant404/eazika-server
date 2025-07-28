/* eslint-disable */
import dotenv from "dotenv";
dotenv.config();

const _env = {
  cors_origin: process.env.CORS_ORIGIN?.includes(",")
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.CORS_ORIGIN || "http://localhost:3000",
  port: Number(process.env.PORT) || 5000,
  node_env: process.env.NODE_ENV === "production",
  jwt_access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET || "default-access-secret",
  jwt_refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET || "default-refresh-secret",
  jwt_access_token_expires_in: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || "15m",
  jwt_refresh_token_expires_in: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || "7d",
};

const env = Object.freeze(_env);
export default env;
