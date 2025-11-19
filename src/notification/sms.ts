import axios, { AxiosRequestConfig } from "axios";
import env from "../config/env.config";

interface SmsResponse {
  requestId: string;
  type: string;
}

const { smsApiKey, smsTemplateId } = env;

async function sendSmsOtp(phone: string): Promise<SmsResponse> {
  const options: AxiosRequestConfig = {
    method: "POST",
    url: "https://api.msg91.com/api/v5/widget/sendOtp",
    headers: {
      "content-type": "application/json",
      authkey: smsApiKey,
    },
    data: JSON.stringify({
      widgetId: smsTemplateId,
      identifier: `91${phone}`,
    }),
  };

  try {
    const {
      data: { message: requestId, type },
    } = await axios.request(options);
    return { requestId, type } as SmsResponse;
  } catch (error) {
    return { requestId: "", type: "error" };
  }
}

async function verifySmsOtp(requestId: string, otp: string) {
  const options: AxiosRequestConfig = {
    method: "POST",
    url: "https://api.msg91.com/api/v5/widget/verifyOtp",
    headers: {
      "content-type": "application/json",
      authkey: smsApiKey,
    },
    data: JSON.stringify({
      widgetId: smsTemplateId,
      reqId: requestId,
      otp: otp,
    }),
  };

  try {
    const {
      data: { message: requestId, type },
    } = await axios.request(options);
    return { requestId, type };
  } catch (error) {
    return { requestId: "", type: "error" };
  }
}

async function reterySmsOtp(requestId: string): Promise<SmsResponse> {
  const options: AxiosRequestConfig = {
    method: "POST",
    url: "https://api.msg91.com/api/v5/widget/retryOtp",
    headers: {
      "content-type": "application/json",
      authkey: smsApiKey,
    },
    data: JSON.stringify({
      widgetId: smsTemplateId,
      reqId: requestId,
    }),
  };

  try {
    const {
      data: { message: requestId, type },
    } = await axios.request(options);

    return { requestId, type } as SmsResponse;
  } catch (error) {
    return { requestId: "", type: "error" };
  }
}

export { sendSmsOtp, verifySmsOtp, reterySmsOtp };

// const { smsApiKey, smsTemplateId, smsOtpExpiresAt } = env;
// interface SmsOtpPayload {
//   phone: string;
//   otp: string;
// }
// async function sendSmsOtp(props: SmsOtpPayload): Promise<SmsResponse> {
//   const options: AxiosRequestConfig = {
//     method: "POST",
//     url: "https://control.msg91.com/api/v5/otp",
//     params: {
//       mobile: `91${props.phone}`,
//       authkey: smsApiKey,
//       otp_expiry: String(smsOtpExpiresAt),
//       template_id: smsTemplateId,
//       realTimeResponse: "",
//     },
//     headers: {
//       "content-type": "application/json",
//       "Content-Type": "application/JSON",
//     },
//     data: `{\n  "OTP": "${props.otp}"\n}`,
//   };

//   try {
//     const { data } = await axios.request(options);
//     // console.log("SMS OTP Response:", data);
//     return data;
//   } catch (error) {
//     // console.error("Error sending SMS OTP:", error);
//     return { request_id: "", type: "error" };
//   }
// }
