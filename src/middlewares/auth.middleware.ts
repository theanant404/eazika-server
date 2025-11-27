import { verifyToken } from "../utils/jwtTokens";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiHandler";
import prisma, { User } from "../config/db.config";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const authMiddleware = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "token missing");

  const payload = verifyToken(token);
  if (!payload) throw new ApiError(401, "invalid_token");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });
  if (!user) throw new ApiError(401, "user_not_found");

  req.user = user;
  next();
});

const isShopkeeper = asyncHandler(async (req, _, next) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  if (req.user.role !== "shopkeeper") {
    throw new ApiError(
      403,
      "Forbidden: Only shopkeepers can access this resource"
    );
  }
  next();
});

const isDeliveryBoy = asyncHandler(async (req, _, next) => {
  if (!req.user) throw new ApiError(401, "User not authenticated");
  if (req.user.role !== "delivery_boy") {
    throw new ApiError(
      403,
      "Forbidden: Only delivery boys can access this resource"
    );
  }
  next();
});

const isShopkeeperOrAdmin = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "token missing");

  const payload = verifyToken(token);
  if (!payload) throw new ApiError(401, "invalid_token");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });
  if (!user) throw new ApiError(401, "user_not_found");

  if (user.role !== "shopkeeper" && user.role !== "admin") {
    throw new ApiError(
      403,
      "Forbidden: Only shopkeepers or admins can access this resource"
    );
  }

  req.user = user;
  next();
});

const isAdmin = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
  if (!token) throw new ApiError(401, "token missing");

  const payload = verifyToken(token);
  if (!payload) throw new ApiError(401, "Invalid Token");

  const user = await prisma.user.findUnique({
    where: { id: payload.id },
  });
  if (!user) throw new ApiError(401, "user_not_found");

  if (user.role !== "admin") {
    throw new ApiError(403, "Forbidden: Only admins can access this resource");
  }

  req.user = user;
  next();
});

export {
  authMiddleware,
  isShopkeeper,
  isDeliveryBoy,
  isShopkeeperOrAdmin,
  isAdmin,
};
