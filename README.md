# Eazika Server 2O

- This is the backend for the Eazika application, built with Node.js and Express.

## Setup

1. Install dependencies:

```
npm install
```

2. Copy `.env.example` to `.env` and fill values (DATABASE_URL, JWT_SECRET, OTP_SECRET, etc.).

3. Initialize Prisma / migrate:

```
npm run prisma:generate
npm run prisma:migrate
```

4. Run the server:

```
npm run dev
```

## Endpoints

- `POST /auth/request-otp` -> { phone }
- `POST /auth/verify-otp` -> { phone, requestId, otp, deviceInfo? } (returns accessToken, sets refresh cookie)
- `POST /auth/refresh` -> rotates refresh token (cookie) and returns new access
- `POST /auth/logout` -> revoke session and clears cookie

Notes: This is a demo. Replace console-based OTP delivery with an SMS provider. Add rate-limiting, captcha, logging, and monitoring for production.

---- NOTES ----

- The demo logs OTP to console. In production, never expose OTPs in logs.
- For improved security use asymmetric signing (RS256) and rotate keys.
- Add IP/device checks and detection for refresh token reuse.

// End of project file
