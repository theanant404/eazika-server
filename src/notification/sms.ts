import axios, { AxiosRequestConfig } from "axios";
import env from "../config/env.config";

const { smsApiKey, smsTemplateId, smsOtpExpiresAt } = env;

interface SmsResponse {
  request_id: string;
  type: string;
}

interface SmsOtpPayload {
  phone: string;
  otp: string;
}

async function sendSmsOtp(props: SmsOtpPayload): Promise<SmsResponse> {
  const options: AxiosRequestConfig = {
    method: "POST",
    url: "https://control.msg91.com/api/v5/otp",
    params: {
      mobile: `91${props.phone}`,
      authkey: smsApiKey,
      otp_expiry: String(smsOtpExpiresAt),
      template_id: smsTemplateId,
      realTimeResponse: "",
    },
    headers: {
      "content-type": "application/json",
      "Content-Type": "application/JSON",
    },
    data: `{\n  "OTP": "${props.otp}"\n}`,
  };

  try {
    const { data } = await axios.request(options);
    // console.log("SMS OTP Response:", data);
    return data;
  } catch (error) {
    // console.error("Error sending SMS OTP:", error);
    return { request_id: "", type: "error" };
  }
}

export { sendSmsOtp };
