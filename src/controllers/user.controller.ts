import prisma from "../config/db.config";
import env from "../config/env.config";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import { asyncHandler } from "../utils/asyncHandler";

const registerUser = asyncHandler(async (req, res) => {
  // write a steps to register user using phone otp

  return true;
});

const loginUser = asyncHandler(async (req, res) => {
  // write a steps to login user using phone otp

  return true;
});
const verifyPhoneOTP = asyncHandler(async (req, res) => {
  // write a steps to verify phone otp

  return true;
});

export { registerUser, loginUser, verifyPhoneOTP };
