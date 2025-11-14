import redis from "../config/redis.config";
import { PhoneOtpInterface } from "../types/index";
const expireIn = 60 * 60; // 60 minutes

function setPhoneOtpDataOnRedis(
  OtpData: PhoneOtpInterface
): Promise<string | null> {
  const key = `phone_otp:${OtpData.requestId}`;
  const value = JSON.stringify(OtpData);
  return redis.set(key, value, { EX: expireIn });
}

async function getPhoneOtpByRequestId(
  requestId: string
): Promise<PhoneOtpInterface | null> {
  const key = `phone_otp:${requestId}`;
  const data = await redis.get(key);
  if (!data) return null;
  return JSON.parse(data) as PhoneOtpInterface;
}

async function incrementOtpAttempts(requestId: string) {
  // get the otp data
  const key = `phone_otp:${requestId}`;
  return await redis
    .get(key)
    .then((data) => {
      if (!data) return null;
      const otpData = JSON.parse(data) as PhoneOtpInterface;
      otpData.attempts += 1;
      // update the data back to redis
      return redis.set(key, JSON.stringify(otpData), { EX: expireIn });
    })
    .catch((err) => {
      console.error("Error incrementing OTP attempts:", err);
      return null;
    });
}

async function markOtpAsUsed(requestId: string): Promise<string | null> {
  // get the otp data
  const key = `phone_otp:${requestId}`;
  return await redis
    .get(key)
    .then((data) => {
      if (!data) return null;
      const otpData = JSON.parse(data) as PhoneOtpInterface;
      otpData.used = true;
      // update the data back to redis
      return redis.set(key, JSON.stringify(otpData), { EX: expireIn });
    })
    .catch((err) => {
      console.error("Error marking OTP as used:", err);
      return null;
    });
}

function deletePhoneOtpByRequestId(requestId: string): Promise<number> {
  const key = `phone_otp:${requestId}`;
  return redis.del(key);
}

export {
  setPhoneOtpDataOnRedis,
  getPhoneOtpByRequestId,
  incrementOtpAttempts,
  markOtpAsUsed,
  deletePhoneOtpByRequestId,
};
