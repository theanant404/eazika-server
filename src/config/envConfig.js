/* eslint-disable */
import dotenv from "dotenv";
dotenv.config();

const _env = {
  cors_origin: process.env.CORS_ORIGIN?.includes(",")
    ? process.env.CORS_ORIGIN.split(",")
    : process.env.CORS_ORIGIN || "http://localhost:3000",
  port: Number(process.env.PORT) || 5000,
  node_env: process.env.NODE_ENV === "production",
};

const env = Object.freeze(_env);
export default env;
