import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/index.js";
import path from "path";

const app = express();

app.use(cors({ origin: env.cors_origin, credentials: true }));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (_, res) =>
  res.json({ message: "Welcome to Eazika Backend API", status: "success" })
);

app.get("/health", (_, res) => res.json({ status: "ok" }));

app.use("/uploads", express.static(path.join(".", "uploads")));

// Routing
import routes from "./routes/index.js";
app.use("/api/v1", routes);

export { app };
