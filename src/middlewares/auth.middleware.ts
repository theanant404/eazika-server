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

export { authMiddleware };
