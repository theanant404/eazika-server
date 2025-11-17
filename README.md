# Eazika Server v2.0

A robust and scalable backend server for the Eazika e-commerce platform, built with Node.js, Express, TypeScript, and Prisma ORM.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [Contributing](#contributing)
- [License](#license)

## 🌟 Overview

Eazika Server is the backend API for a multi-vendor e-commerce platform that connects customers with local shopkeepers and delivery partners. The platform supports various business categories including grocery stores, electronics, furniture, clothing, bakeries, and more.

## ✨ Features

- **Multi-Role System**: Support for users, shopkeepers, delivery boys, and administrators
- **Authentication & Authorization**: JWT-based authentication with access and refresh tokens
- **OTP Verification**: Phone and email OTP verification via SMS (MSG91)
- **Product Management**: Global product catalog with shop-specific pricing
- **Order Management**: Complete order lifecycle from creation to delivery
- **Cart System**: Shopping cart functionality for customers
- **Address Management**: Multiple delivery addresses per user
- **Real-time Notifications**: Notification system for order updates
- **Rate Limiting**: API rate limiting to prevent abuse
- **API Documentation**: Interactive Swagger/OpenAPI documentation
- **Redis Caching**: Redis integration for session management and caching
- **Type Safety**: Full TypeScript support with Prisma-generated types

## 🛠 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Cache**: Redis
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Zod
- **API Documentation**: Swagger UI
- **SMS Provider**: MSG91
- **Rate Limiting**: express-rate-limit

## 🏗 Architecture

The application follows a modular architecture with clear separation of concerns:

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
┌──────▼──────────────────────────┐
│   Express Middleware Layer      │
│  (CORS, Rate Limit, Auth)       │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│     Routes & Controllers        │
│  (Business Logic)               │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│   Prisma ORM Layer              │
└──────┬──────────────────────────┘
       │
┌──────▼──────────────────────────┐
│   PostgreSQL Database           │
└─────────────────────────────────┘
```

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** (v14 or higher)
- **Redis** (v6 or higher)
- **Docker & Docker Compose** (optional, for containerized setup)

## 🚀 Installation

1. **Clone the repository**

```bash
git clone https://github.com/dev-voy/eazika-server-2O.git
cd eazika-server-2O
```

2. **Install dependencies**

```bash
npm install
```

## ⚙️ Configuration

1. **Create environment file**

Copy the sample environment file and configure it:

```bash
cp env.sample .env
```

2. **Configure environment variables**

Edit the `.env` file with your configuration:

```env
# Server Configuration
PORT=5000
CORS_ORIGIN="*"
NODE_ENV="development"

# Database Configuration
DATABASE_URL="postgres://postgres:root@localhost:5432/eazika_dev"

# Redis Configuration
REDIS_USERNAME="default"
REDIS_PASSWORD="eazika_redis_password"
REDIS_HOST="localhost"
REDIS_PORT="6379"

# JWT Configuration
JWT_SECRET="your_jwt_secret_here"
JWT_ACCESS_TOKEN_EXPIRES_IN="86400"   # 1 day in seconds
JWT_REFRESH_TOKEN_EXPIRES_IN="2592000" # 30 days in seconds

# SMS Provider (MSG91)
SMS_API_KEY="your_msg91_api_key"
SMS_TEMPLATE_ID="your_template_id"
SMS_OTP_EXPIRES_AT="300"  # 5 minutes in seconds
```

## 💾 Database Setup

### Using Docker Compose (Recommended)

Start PostgreSQL and Redis containers:

```bash
docker-compose up -d
```

This will start:

- PostgreSQL on port `5432`
- Adminer (database UI) on port `8080`
- Redis on port `6379`
- Redis Insight on the configured port

### Manual Setup

If you prefer to install PostgreSQL and Redis manually:

1. Install and start PostgreSQL
2. Create a database named `eazika_dev`
3. Install and start Redis
4. Update the connection strings in `.env`

### Run Database Migrations

```bash
npm run prisma:migrate
```

### Generate Prisma Client

```bash
npm run prisma:generate
```

### Open Prisma Studio (Optional)

To view and manage your database visually:

```bash
npm run prisma:studio
```

## 🏃 Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:5000` (or your configured PORT) with hot-reloading enabled.

### Production Mode

```bash
npm start
```

## 📚 API Documentation

Once the server is running in development mode, access the interactive API documentation at:

```
http://localhost:5000/api-docs
```

The API follows RESTful conventions and is versioned under `/api/v2`.

### Main Endpoints

- **Users**: `/api/v2/users` - User authentication and management
- **Shops**: `/api/v2/shops` - Shopkeeper and product management
- **Customers**: `/api/v2/customers` - Customer operations (protected)
- **Delivery**: `/api/v2/delivery` - Delivery boy operations

### Health Check

```bash
curl http://localhost:5000/health
```

## 📁 Project Structure

```
eazika-server-2O/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── config/               # Configuration files
│   │   ├── db.config.ts
│   │   ├── env.config.ts
│   │   └── redis.config.ts
│   ├── controllers/          # Request handlers
│   │   ├── customers.controller.ts
│   │   ├── delivery.controller.ts
│   │   ├── shop.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/          # Express middlewares
│   │   └── auth.middleware.ts
│   ├── routes/              # Route definitions
│   │   ├── customer.route.ts
│   │   ├── delivery.route.ts
│   │   ├── shop.route.ts
│   │   ├── user.route.ts
│   │   └── index.ts
│   ├── types/               # TypeScript type definitions
│   ├── utils/               # Utility functions
│   │   ├── apiHandler.ts
│   │   ├── asyncHandler.ts
│   │   ├── jwtTokens.ts
│   │   ├── otp.ts
│   │   └── redis.ts
│   ├── validations/         # Input validation schemas
│   ├── notification/        # Notification services
│   ├── generated/           # Prisma generated files
│   ├── app.ts              # Express app setup
│   ├── index.ts            # Application entry point
│   └── swagger.ts          # Swagger configuration
├── docker-compose.yml       # Docker services configuration
├── tsconfig.json           # TypeScript configuration
├── package.json            # Project dependencies
└── README.md              # This file
```

## 📜 Available Scripts

```bash
# Development
npm run dev              # Start development server with hot-reload

# Production
npm start               # Build and start production server

# Database
npm run prisma:generate # Generate Prisma client
npm run prisma:migrate  # Run database migrations
npm run prisma:studio   # Open Prisma Studio GUI

# Code Quality
npm run prettier        # Format code with Prettier
```

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for type safety
- Follow the existing code structure
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
