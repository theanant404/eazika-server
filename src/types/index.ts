interface PhoneOtpInterface {
  name?: string;
  phone: string;
  requestId: string;
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  used: boolean;
  deviceInfo?: string;
}

export { PhoneOtpInterface };
