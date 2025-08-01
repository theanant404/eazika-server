import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, ApiResponse } from "../utils/apiHandler.js";
import prisma from "../config/dbConfig.js";
import { registeredUserSchema } from "../validations/auth.validation.js";

import {
  generateAccessToken,
  generateRefreshToken,
  decodedRefreshToken,
} from "../utils/jwtTokens.js";

/**
 * Register a new user
 */
const registerUser = asyncHandler(async (req, res) => {
  const payload = await registeredUserSchema.parseAsync(req.body);
  // Expected: { name, phone, email?, password, role?, profileImage? }

  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: payload.email || undefined }, { phone: payload.phone }],
    },
  });

  if (existingUser) throw new ApiError(409, "User already exists");

  const hashedPassword = await bcrypt.hash(payload.password, 10);

  const newUser = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email || null,
      phone: payload.phone,
      password: hashedPassword,
      role: payload.role || "CUSTOMER",
      profileImage: payload.profileImage || null,
    },
  });

  return res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      profileImage: newUser.profileImage,
    })
  );
});

/**
 * Login User
 */
const loginUser = asyncHandler(async (req, res) => {
  const { emailPhone, password } = req.body;

  if (!emailPhone || !password)
    throw new ApiError(400, "Email or phone and password are required");

  // let user;
  // if (/^\d{10}$/.test(emailPhone)) {
  //   user = await prisma.user.findUnique({ where: { phone: emailPhone } });
  // } else {
  //   user = await prisma.user.findUnique({ where: { email: emailPhone } });
  // }
  const user = await prisma.user.findFirst({
    where: { OR: [{ email: emailPhone }, { phone: emailPhone }] },
  });

  if (!user) throw new ApiError(404, "User not found");

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) throw new ApiError(401, "Invalid credentials");

  return res.status(200).json(
    new ApiResponse(200, "Login successful", {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        profileImage: user.profileImage,
      },
      accessToken: await generateAccessToken(user.id, user.role),
      refreshToken: await generateRefreshToken(user.id, user.role),
    })
  );
});

/**
 * Logout User (placeholder)
 */
const logoutUser = asyncHandler(async (req, res) => {
  // If using cookies to store tokens
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, "User logged out successfully", null, true));
});

/**
 * Refresh Access Token (placeholder)
 */
const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw new ApiError(401, "Refresh token missing");
  }

  const decoded = await decodedRefreshToken(refreshToken);

  // Generate a new access token using user info from refresh token
  const newAccessToken = await generateAccessToken(decoded.id, decoded.role);

  return res.status(200).json(
    new ApiResponse(200, "Access token refreshed successfully", {
      accessToken: newAccessToken,
    })
  );
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
