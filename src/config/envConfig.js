/* eslint-disable */
import dotenv from "dotenv";
dotenv.config();

const _env = {
  cors_origin: process.env.CORS_ORIGIN?.includes(",")
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.CORS_ORIGIN || "http://localhost:3000",
  port: Number(process.env.PORT) || 5000,
  node_env: process.env.NODE_ENV,
  isNodeEnvDevelopment: process.env.NODE_ENV.toLowerCase() === "development",

  // jwt
  jwt_access_token_secret: process.env.JWT_ACCESS_TOKEN_SECRET,
  jwt_refresh_token_secret: process.env.JWT_REFRESH_TOKEN_SECRET,
  jwt_access_token_expires_in: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN,
  jwt_refresh_token_expires_in: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN,

  // google credentials
  google_client_id: process.env.GOOGLE_CLIENT_ID,
  google_client_secret: process.env.GOOGLE_CLIENT_SECRET,
};

const env = Object.freeze(_env);
export default env;
