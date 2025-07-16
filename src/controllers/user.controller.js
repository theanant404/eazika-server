import bcrypt from "bcrypt";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, ApiResponse } from "../utils/apiHandler.js";
import prisma from "../config/dbConfig.js";

import { registeredUserSchema } from "../validations/user.validation.js";

const registerUser = asyncHandler(async (req, res) => {
  // 1. Validate required fields
  const payload = await registeredUserSchema.parseAsync(req.body);

  // 2. find user by email or phone
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ email: payload.email }, { phone: payload.phone }] },
  });
  // 3. If user already exists, throw an error
  if (existingUser) throw new ApiError(409, "User already exists");

  // 4. hash the password
  const hashedPassword = await bcrypt.hash(payload.password, 10);

  // 5. Create a new user in the database
  const newUser = await prisma.user.create({
    data: {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone || null,
      password: hashedPassword,
      imageUrl: payload.imageUrl || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  // 6. If user creation fails, throw an error
  if (!newUser) throw new ApiError(500, "User registration failed");

  // 7. Return the user data in the response
  return res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      user: {
        id: newUser.id,
        first_name: newUser.firstName,
        last_name: newUser.lastName,
        email: newUser.email,
        phone: newUser.phone,
        image_url: newUser.imageUrl,
      },
    })
  );
});

const loginUser = asyncHandler(async (req, res) => {
  // Logic to handle user login
  // This could involve checking credentials, generating tokens, etc.
  // For simplicity, we will just return a success message with user data
  // Note: Actual login logic will depend on your authentication strategy
  return res.status(200).json(
    new ApiResponse(200, "User logged in successfully", {
      user: {
        id: req.user.id,
        first_name: req.user.firstName,
        last_name: req.user.lastName,
        email: req.user.email,
        phone: req.user.phone,
        image_url: req.user.imageUrl,
      },
    })
  );
});

const logoutUser = asyncHandler(async (req, res) => {
  // Logic to handle user logout
  // This could involve invalidating the refresh token or clearing session data
  // For simplicity, we will just return a success message
  // Note: Actual logout logic will depend on your authentication strategy
  return res
    .status(200)
    .json(new ApiResponse(200, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // Logic to refresh access token
  // This is a placeholder, actual implementation will depend on your JWT strategy
  return res.status(200).json(
    new ApiResponse(200, "Access token refreshed successfully", {
      accessToken: "newAccessTokenHere", // Replace with actual token generation logic
    })
  );
});

export { registerUser, loginUser, logoutUser, refreshAccessToken };
