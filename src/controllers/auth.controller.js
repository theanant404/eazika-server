import bcrypt from "bcrypt";
import { google } from "googleapis";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError, ApiResponse } from "../utils/apiHandler.js";
import { prisma, env } from "../config/index.js";
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

  // Use transaction to ensure atomicity (both user and profile are created together)
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the user
    const newUser = await tx.user.create({
      data: {
        name: payload.name,
        email: payload.email || null,
        phone: payload.phone,
        password: hashedPassword,
        role: payload.role,
        profileImage: payload.profileImage || null,
      },
    });

    // 2. Create role-specific profile based on user role
    switch (newUser.role) {
      case 'CUSTOMER':
        await tx.customerProfile.create({
          data: {
            userId: newUser.id,
            metadata: {
              profileCompleted: false,
              registrationDate: new Date().toISOString()
            }
          }
        });
        break;

      case 'SHOPKEEPER':
        await tx.shopkeeperProfile.create({
          data: {
            userId: newUser.id,
            businessName: payload.businessName || '', // Empty initially
            kycStatus: 'PENDING',
            kycDocuments: [],
            commissionRate: 5.00,
            rating: 0,
            totalOrders: 0,
            metadata: {
              profileCompleted: false,
              registrationDate: new Date().toISOString()
            },
            bankDetails: {}
          }
        });
        break;

      case 'DELIVERY_BOY':
        await tx.deliveryProfile.create({
          data: {
            userId: newUser.id,
            vehicleType: payload.vehicleType || null,
            vehicleNumber: payload.vehicleNumber || null,
            isAvailable: true,
            deliveryRadius: 5,
            rating: 0,
            totalDeliveries: 0,
            metadata: {
              profileCompleted: false,
              registrationDate: new Date().toISOString()
            }
          }
        });
        break;

      default:
        throw new ApiError(400, "Invalid user role");
    }

    return newUser;
  });

  return res.status(201).json(
    new ApiResponse(201, "User registered successfully", {
      id: result.id,
      name: result.name,
      email: result.email,
      phone: result.phone,
      role: result.role,
      profileImage: result.profileImage,
      nextStep: "complete_profile" 
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

// Login with Google
const loginWithGoogle = asyncHandler(async (req, res) => {
  const oauth2Client = new google.auth.OAuth2(
    env.google_client_id,
    env.google_client_secret,
    "postmessage" // Replace with your actual redirect URI
  );

  const code = req.query.code;
  if (!code) throw new ApiError(400, "Google Authorization code is required");

  const googleRes = await oauth2Client.getToken(code);
  // console.log("Google Response:", googleRes.tokens);
  oauth2Client.setCredentials(googleRes.tokens);
  const userRes = await fetch(
    `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
  );
  if (!userRes.ok)
    throw new ApiError(500, "Failed to fetch user data from Google");

  const userData = await userRes.json();

  const existingUser = await prisma.user.findUnique({
    where: { email: userData.email },
  });

  if (!existingUser) {
    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: null, // Google doesn't provide phone number
        role: "CUSTOMER",
        profileImage: userData.picture || null,
      },
    });
    if (!newUser) throw new ApiError(500, "Failed to create user");

    return res.status(201).json(
      new ApiResponse(201, "User registered successfully via Google", {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          profileImage: newUser.profileImage,
        },
        accessToken: await generateAccessToken(newUser.id, newUser.role),
        refreshToken: await generateRefreshToken(newUser.id, newUser.role),
      })
    );
  }

  return res.status(200).json(
    new ApiResponse(200, "Login successful via Google", {
      user: {
        id: existingUser.id,
        name: existingUser.name,
        email: existingUser.email,
        phone: existingUser.phone,
        role: existingUser.role,
        profileImage: existingUser.profileImage,
      },
      accessToken: await generateAccessToken(
        existingUser.id,
        existingUser.role
      ),
      refreshToken: await generateRefreshToken(
        existingUser.id,
        existingUser.role
      ),
    })
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  loginWithGoogle,
};
