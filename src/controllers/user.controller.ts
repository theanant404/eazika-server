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
  sameSite: "strict",
  path: "/",
  maxAge: jwtAccessTokenExpiresIn * 1000,
};

// Registration OTP controllers
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

  const user = await prisma.user.create({
    data: { phone: phoneOtpData.phone, name: phoneOtpData?.name || "" },
  });
  if (!user) throw new ApiError(500, "user_creation_failed");

  const accessToken = jwt.signAccessToken({ id: user.id, role: user.role });
  const refreshToken = jwt.signRefreshToken({ id: user.id, role: user.role });

  return res
    .cookie("refreshToken", refreshToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, "OTP verified successfully", {
        accessToken,
        expiresIn: "7d", // 7 days
        user: { id: user.id, phone: user.phone },
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

// Login OTP controllers (similar to registration, omitted for brevity)
const sendLoginOtp = asyncHandler(async (req, res) => {
  // write a steps to send login otp
  // 1. validate input
  // 2. check if user exists
  // 3. create and send otp
  // 4. return response

  const { phone } = userSchemas.registrationOtpSchema
    .pick({ phone: true })
    .parse(req.body);

  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(404, "user_not_found");

  // rate-limiting should be applied in production
  const { requestId } = await createAndSendOtp(phone, user.name);
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
    .json(
      new ApiResponse(200, "OTP verified successfully", {
        accessToken,
        expiresIn: "7d", // 7 days
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

const logout = asyncHandler(async (req, res) => {
  // write a steps to logout
  // 1. clear cookies
  // 2. return response

  return res
    .clearCookie("refreshToken", cookieOptions)
    .clearCookie("accessToken", cookieOptions)
    .json(new ApiResponse(200, "Logged out successfully"));
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
};
