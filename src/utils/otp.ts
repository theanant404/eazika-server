import * as redis from "../utils/redis";
import { sendSmsOtp, verifySmsOtp, reterySmsOtp } from "../notification/sms";
import env from "../config/env.config";

async function sendOtp(
  phone: string,
  name: string
): Promise<{ requestId: string }> {
  try {
    const { requestId, type } = await sendSmsOtp(phone);
    if (type != "success") throw new Error("OTP delivery failed");

    await redis.setPhoneOtpDataOnRedis({
      name,
      phone,
      requestId,
      attempts: 0,
      createdAt: new Date(),
      expiresAt: new Date(new Date().getTime() + env.smsOtpExpiresAt * 1000),
      used: false,
    });

    return { requestId };
  } catch (err) {
    throw new Error(`Failed to create and send OTP: ${(err as Error).message}`);
  }
}

async function reteryOtp(requestId: string) {
  const record = await redis.getPhoneOtpByRequestId(requestId);
  if (!record) throw new Error("Invalid request ID");

  const { requestId: newRequestId, type } = await reterySmsOtp(record.phone);
  if (type != "success") throw new Error("Failed to resend OTP");

  // Update the Redis record with the new requestId and reset attempts
  record.requestId = newRequestId;
  record.attempts = 0;
  record.createdAt = new Date();
  record.expiresAt = new Date(
    new Date().getTime() + env.smsOtpExpiresAt * 1000
  );
  record.used = false;

  await redis.setPhoneOtpDataOnRedis(record);

  return { requestId: newRequestId };
}

async function verifyOtp(
  phone: string,
  requestId: string,
  otp: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const record = await redis.getPhoneOtpByRequestId(requestId);

  if (!record) return { ok: false, reason: "invalid_request" };
  if (record.used) return { ok: false, reason: "already_used" };
  if (record.phone !== phone) return { ok: false, reason: "phone_mismatch" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };
  if (record.attempts >= 5) return { ok: false, reason: "too_many_attempts" };

  const result = await verifySmsOtp(requestId, otp);
  if (result.type !== "success") {
    await redis.incrementOtpAttempts(requestId);
    return { ok: false, reason: result.requestId };
  }

  // await redis.markOtpAsUsed(requestId);
  return { ok: true };
}

export { sendOtp as createAndSendOtp, reteryOtp, verifyOtp };

// import * as redis from "../utils/redis";
// import { sendSmsOtp } from "../notification/sms";
// import env from "../config/env.config";

// /**
//  * Generate a numeric OTP of the given length.
//  * Ensures length is at least 1 and returns a string without leading zeros.
//  */
// function genNumericOTP(length = 6): string {
//   const sanitizedLength = Math.max(1, Math.floor(length));
//   const min = 10 ** (sanitizedLength - 1);
//   const max = 10 ** sanitizedLength - 1;
//   return String(Math.floor(Math.random() * (max - min + 1)) + min);
// }

// /**
//  * Create an OTP, send it via SMS and persist metadata in Redis.
//  * Throws on errors related to delivery or persistence.
//  */
// async function createAndSendOtp(
//   phone: string,
//   name: string
// ): Promise<{ requestId: string; otp: string }> {
//   const otp = genNumericOTP(4);
//   const createdAt = new Date();

//   try {
//     const { request_id: requestId, type } = await sendSmsOtp({ phone, otp });

//     if (type !== "secure") {
//       throw new Error(
//         "OTP delivery failed: provider returned non-secure response"
//       );
//     }

//     await redis.setPhoneOtpDataOnRedis({
//       name,
//       phone,
//       requestId,
//       otp,
//       attempts: 0,
//       createdAt,
//       expiresAt: new Date(createdAt.getTime() + env.smsOtpExpiresAt * 1000),
//       used: false,
//     });

//     return { requestId, otp };
//   } catch (err) {
//     throw new Error(`Failed to create and send OTP: ${(err as Error).message}`);
//   }
// }

// /**
//  * Verify an OTP previously issued.
//  * Returns { ok: true } on success, otherwise { ok: false, reason }.
//  */
// async function verifyOtp(
//   phone: string,
//   requestId: string,
//   otp: string
// ): Promise<{ ok: true } | { ok: false; reason: string }> {
//   const record = await redis.getPhoneOtpByRequestId(requestId);

//   if (!record) return { ok: false, reason: "invalid_request" };
//   if (record.used) return { ok: false, reason: "already_used" };
//   if (record.phone !== phone) return { ok: false, reason: "phone_mismatch" };
//   if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };
//   if (record.attempts >= 5) return { ok: false, reason: "too_many_attempts" };

//   if (record.otp !== otp) {
//     await redis.incrementOtpAttempts(requestId);
//     return { ok: false, reason: "invalid_otp" };
//   }

//   await redis.markOtpAsUsed(requestId);
//   return { ok: true };
// }

// export { createAndSendOtp, verifyOtp };
