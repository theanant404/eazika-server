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

interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: {
    [key: string]: any;
  };
}

export { PhoneOtpInterface };
