import jwt from "jsonwebtoken";
import { env } from "../config/index.js";

async function generateAccessToken(id, role) {
  return jwt.sign(
    {
      id: id,
      role: role,
      iat: Math.floor(Date.now() / 1000) - 30, // issued at time
    },
    env.jwt_access_token_secret,
    { expiresIn: env.jwt_access_token_expires_in }
  );
}
async function generateRefreshToken(id, role) {
  return jwt.sign(
    {
      id: id,
      role: role,
      iat: Math.floor(Date.now() / 1000) - 30, // issued at time
    },
    env.jwt_refresh_token_secret,
    { expiresIn: env.jwt_refresh_token_expires_in }
  );
}

async function decodedAccessToken(token) {
  return jwt.verify(token, env.jwt_access_token_secret);
}
async function decodedRefreshToken(token) {
  return jwt.verify(token, env.jwt_refresh_token_secret);
}

export {
  generateAccessToken,
  generateRefreshToken,
  decodedAccessToken,
  decodedRefreshToken,
};
