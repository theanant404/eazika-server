import { CookieOptions } from "express";
import prisma from "../config/db.config";
import env from "../config/env.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { asyncHandler } from "../utils/asyncHandler";
import { createAndSendOtp, verifyOtp } from "../utils/otp";
import * as jwt from "../utils/jwtTokens";
import * as userSchemas from "../validations/user.validation";
import * as redis from "../utils/redis";

const { isNodeEnvDevelopment, jwtAccessTokenExpiresIn } = env;

const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: !isNodeEnvDevelopment,
  sameSite: "none",
  path: "/",
  maxAge: jwtAccessTokenExpiresIn * 1000,
};

/* -------- Registration OTP controllers -------- */
const sendRegistrationOtp = asyncHandler(async (req, res) => {
  // write a steps to send registration otp
  // 1. validate input
  // 2. check if user already exists
  // 3. create and send otp
  // 4. return response

  const { phone, name } = userSchemas.registrationOtpSchema.parse(req.body);

  // rate-limiting should be applied in production
  const { requestId } = await createAndSendOtp(phone, name);
  return res
    .status(200)
    .json(new ApiResponse(200, "OTP requested successfully", { requestId }));
});

const verifyRegistrationOtp = asyncHandler(async (req, res) => {
  // write a steps to verify registration otp
  // 1. validate input
  // 2. verify otp
  // 3. create user
  // 4. create session and tokens
  // 5. return response

  const { phone, requestId, otp, deviceInfo } =
    userSchemas.verifyRegistrationOtpSchema.parse(req.body);

  const result = await verifyOtp(phone, requestId, otp);
  if (!result.ok) throw new ApiError(400, result.reason);

  let phoneOtpData = await redis.getPhoneOtpByRequestId(requestId);
  if (!phoneOtpData) throw new ApiError(500, "otp_data_not_found");

  // create user if not exists
  const user = await prisma.user.upsert({
    where: { phone: phoneOtpData.phone },
    update: {},
    create: { phone: phoneOtpData.phone, name: phoneOtpData?.name || "" },
  });

  if (!user) throw new ApiError(500, "user_creation_failed");

  const accessToken = jwt.signAccessToken({ id: user.id, role: user.role });
  const refreshToken = jwt.signRefreshToken({ id: user.id, role: user.role });

  return res
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("userRole", user.role, { path: "/", maxAge: cookieOptions.maxAge })
    .json(
      new ApiResponse(200, "OTP verified successfully", {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          phone: user.phone,
          name: user.name,
          role: user.role,
        },
      })
    );
});

const resendRegistrationOtp = asyncHandler(async (req, res) => {
  // write a steps to resend registration otp
  // 1. validate input
  // 2. create and send otp
  // 3. return response

  const { phone, name } = userSchemas.registrationOtpSchema.parse(req.body);
  // rate-limiting should be applied in production
  const { requestId } = await createAndSendOtp(phone, name);
  return res
    .status(200)
    .json(new ApiResponse(200, "OTP resent successfully", { requestId }));
});

/* -------- Login OTP controllers -------- */
const sendLoginOtp = asyncHandler(async (req, res) => {
  // write a steps to send login otp
  // 1. validate input
  // 2. check if user exists
  // 3. create and send otp
  // 4. return response

  // const { phone } = userSchemas.registrationOtpSchema.parse(req.body);
  const { phone } = req.body;
  if (typeof phone !== "string" || !/^\d{10}$/.test(phone))
    throw new ApiError(400, "Phone number must be exactly 10 digits");

  // const user = await prisma.user.findUnique({ where: { phone } });
  // if (!user) throw new ApiError(404, "user_not_found");

  // rate-limiting should be applied in production
  const { requestId } = await createAndSendOtp(phone, "");
  return res
    .status(200)
    .json(new ApiResponse(200, "OTP requested successfully", { requestId }));
});

const verifyLoginOtp = asyncHandler(async (req, res) => {
  // write a steps to verify login otp
  // 1. validate input
  // 2. verify otp
  // 3. create session and tokens
  // 4. return response

  const { phone, requestId, otp, deviceInfo } =
    userSchemas.verifyRegistrationOtpSchema.parse(req.body);

  const result = await verifyOtp(phone, requestId, otp);
  if (!result.ok) throw new ApiError(400, result.reason);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(404, "user_not_found");
  const refreshToken = jwt.signRefreshToken({ id: user.id, role: user.role });
  const accessToken = jwt.signAccessToken({ id: user.id, role: user.role });

  return res
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("userRole", user.role)
    .json(
      new ApiResponse(200, "OTP verified successfully", {
        accessToken,
        refreshToken,
        user: { id: user.id, phone: user.phone },
      })
    );
});

const resendLoginOtp = asyncHandler(async (req, res) => {
  // write a steps to resend login otp
  // 1. validate input
  // 2. create and send otp
  // 3. return response

  const { phone } = userSchemas.registrationOtpSchema
    .pick({ phone: true })
    .parse(req.body);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(404, "user_not_found");

  // rate-limiting should be applied in production
  const { requestId } = await createAndSendOtp(phone, user.name);
  return res
    .status(200)
    .json(new ApiResponse(200, "OTP resent successfully", { requestId }));
});

const refreshToken = asyncHandler(async (req, res) => {
  // write a steps to refresh token
  // 1. read refresh token from cookie/body
  // 2. verify token
  // 3. generate new tokens
  // 4. return response

  const incoming = req.cookies.refreshToken || req.body.refreshToken;
  if (!incoming) throw new ApiError(401, "Refresh token required");

  const payload = jwt.verifyToken(incoming);
  if (!payload) throw new ApiError(401, "Invalid refresh token");

  const accessToken = jwt.signAccessToken({
    id: payload.id,
    role: payload.role,
  });
  const refreshToken = jwt.signRefreshToken({
    id: payload.id,
    role: payload.role,
  });

  return res
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(
      new ApiResponse(200, "Token refreshed successfully", {
        accessToken,
        expiresIn: "7d", // 7 days
      })
    );
});

/* -------- Logout Controller -------- */
const logout = asyncHandler(async (req, res) => {
  // write a steps to logout
  // 1. clear cookies
  // 2. return response

  return res
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("userRole")
    .json(new ApiResponse(200, "Logged out successfully"));
});

/* -------- Current User Controllers -------- */
const getCurrentUser = asyncHandler(async (req, res) => {
  // write a steps to get current user
  // 1. get user from req (set by auth middleware)
  // 2. return response

  const user = await prisma.user.findUnique({
    where: { id: req.user?.id },
    select: {
      id: true,
      phone: true,
      name: true,
      role: true,
      createdAt: true,
      email: true,
      defaultAddressId: true,
      address: {
        where: { isDeleted: false },
      },
    },
  });
  if (!user) throw new ApiError(404, "user not found");

  const formatedUser = {
    id: user.id,
    name: user.name,
    phone: user.phone,

    email: user.email,
    role: user.role,
    addresses: user.address.map((addr) => ({
      id: addr.id,
      isDefult: addr.id === user.defaultAddressId,
      name: addr.name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2,
      street: addr.street,
      city: addr.city,
      state: addr.state,
      country: addr.country,
      pinCode: addr.pinCode,
      geoLocation: addr.geoLocation,
    })),
  };

  return res
    .status(200)
    .json(
      new ApiResponse(200, "User fetched successfully", { user: formatedUser })
    );
});

const updateCurrentUser = asyncHandler(async (req, res) => {
  // write a steps to update current user
  // 1. validate input
  // 2. get user from req (set by auth middleware)
  // 3. update user
  // 4. return response

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { name, email, defaultAddressId } = userSchemas.updateUserSchema.parse(
    req.body
  );

  const user = await prisma.user.update({
    where: { id: userId },
    data: { name, email, defaultAddressId },
    select: { id: true, phone: true, name: true, role: true, createdAt: true },
  });
  if (!user) throw new ApiError(404, "user_not_found");

  return res
    .status(200)
    .json(new ApiResponse(200, "User updated successfully", { user }));
});

const updateProfilePicture = asyncHandler(async (req, res) => {
  // write a steps to update profile picture
  // 1. validate input
  // 2. get user from req (set by auth middleware)
  // 3. update user profile picture
  // 4. return response

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const { imageUrl } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { image: imageUrl },
    select: { id: true, phone: true, name: true, email: true, role: true },
  });
  if (!user) throw new ApiError(404, "user_not_found");

  return res
    .status(200)
    .json(
      new ApiResponse(200, "Profile picture updated successfully", { user })
    );
});

const addNewAddress = asyncHandler(async (req, res) => {
  // write a steps to add new address for current user
  // 1. validate input
  // 2. get user from req (set by auth middleware)
  // 3. add new address
  // 4. return response

  const userId = req.user?.id;
  if (!userId) throw new ApiError(401, "Unauthorized");

  const payload = userSchemas.userAddressSchema.parse(req.body);

  const newAddress = await prisma.address.create({
    data: {
      userId,
      name: payload.name,
      phone: payload.phone,
      line1: payload.line1,
      line2: payload.line2,
      street: payload.street,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      pinCode: payload.pinCode,
      geoLocation: payload.geoLocation,
    },
  });
  if (!newAddress) throw new ApiError(500, "Address creation failed");
  return res.status(201).json(
    new ApiResponse(201, "Address added successfully", {
      address: newAddress,
    })
  );
});

const updateAddress = asyncHandler(async (req, res) => {
  // write a steps to update address by ID for current user
  // 1. validate input
  // 2. get user from req (set by auth middleware)
  // 3. update address
  // 4. return response

  const userId = req.user?.id;
  const addressId = Number(req.params.addressId);

  if (!userId) throw new ApiError(401, "Unauthorized");

  const payload = userSchemas.userAddressSchema.parse(req.body);

  const updatedAddress = await prisma.address.update({
    where: { id: addressId, userId },
    data: { ...payload },
  });
  return res.status(200).json(
    new ApiResponse(200, "Address updated successfully", {
      address: updatedAddress,
    })
  );
});

const deleteAddress = asyncHandler(async (req, res) => {
  // write a steps to delete address by ID for current user
  // 1. get user from req (set by auth middleware)
  // 2. delete address
  // 3. return response

  const userId = req.user?.id;
  const addressId = Number(req.params.addressId);

  if (!userId) throw new ApiError(401, "Unauthorized");

  if (isNaN(addressId) || addressId <= 0)
    throw new ApiError(400, "Invalid address ID");

  const updatedAddress = await prisma.address.update({
    where: { id: addressId, userId },
    data: { isDeleted: true },
  });

  if (!updatedAddress) throw new ApiError(404, "Address not found");

  return res
    .status(200)
    .json(new ApiResponse(200, "Address deleted successfully"));
});

export {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  sendLoginOtp,
  verifyLoginOtp,
  resendLoginOtp,
  refreshToken,
  logout,
  getCurrentUser,
  updateCurrentUser,
  updateProfilePicture,
  addNewAddress,
  updateAddress,
  deleteAddress,
};
