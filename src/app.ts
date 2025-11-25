import express, { Application } from "express";
// import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import cors from "cors";

import env from "./config/env.config";
const { cors_origin, isNodeEnvDevelopment } = env;

const app: Application = express();

// add rate limiting middleware here
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again later.",
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// app.use(limiter);
app.use(cors({ origin: cors_origin, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// if (isNodeEnvDevelopment) {
//   app.use((req, _, next) => {
//     console.log(
//       `[Devlopment Environment] method: ${req.method}, url: ${req.protocol}://${req.get("host")}${req.originalUrl}, Time: ${new Date().toLocaleTimeString()}`
//     );
//     next();
//   });
// }

app.get("/", (_, res) => res.send("Welcome to Eazika API v2"));
app.get("/health", (_, res) => res.json({ status: "ok" }));

import { swaggerHost, swaggerServeFile, swaggerSetup } from "./swagger.js";
if (isNodeEnvDevelopment) {
  app.use("/api-docs", swaggerHost, swaggerServeFile(), swaggerSetup());
}

// Routing;
import routes from "./routes/index.js";
app.use("/api/v2", routes);

export default app;
