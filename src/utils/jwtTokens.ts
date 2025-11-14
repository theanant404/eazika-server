import jwt from "jsonwebtoken";
import env from "../config/env.config";

interface JwtPayload {
  id: number;
  role: string;
  iat?: number;
}

const { jwtSecret, jwtAccessTokenExpiresIn, jwtRefreshTokenExpiresIn } = env;

function signAccessToken(payload: JwtPayload): string {
  if (payload.iat === undefined)
    payload.iat = Math.floor(Date.now() / 1000) - 30;

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtAccessTokenExpiresIn,
  }) as string;
}

function signRefreshToken(payload: JwtPayload): string {
  if (payload.iat === undefined)
    payload.iat = Math.floor(Date.now() / 1000) - 30;

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtRefreshTokenExpiresIn,
  }) as string;
}

function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, jwtSecret) as JwtPayload;
  } catch (e) {
    return null;
  }
}

export { signAccessToken, signRefreshToken, verifyToken };
