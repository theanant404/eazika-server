import { prisma } from "../config/index.js";
import { ApiError } from "../utils/apiHandler.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { decodedAccessToken } from "../utils/jwtTokens.js";

function excludeFields(user, keys) {
  for (let key of keys) delete user[key];
  return user;
}

const verifyJWT = asyncHandler(async (req, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("authorization")?.replace("Bearer ", "");

    if (!token) throw new ApiError(401, "Unauthorized request");

    const decodedToken = await decodedAccessToken(token);
    if (!decodedToken) throw new ApiError(401, "Invalid Access Token");

    // Check if the user exists in the database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.id },
    });
    if (!user) throw new ApiError(401, "Invalid Access Token");

    req.user = excludeFields(user, ["password", "refreshToken"]); // Exclude sensitive fields
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});

export default verifyJWT;
