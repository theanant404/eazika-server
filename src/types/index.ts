interface PhoneOtpInterface {
  name?: string;
  phone: string;
  requestId: string;
  otp: string | number;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  deviceInfo?: string;
}

export { PhoneOtpInterface };
