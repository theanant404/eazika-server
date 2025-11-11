import express, { Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env.config.js";

const app: Application = express();

app.use(cors({ origin: env.cors_origin, credentials: true }));
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser());

app.get("/", (_, res) => res.send("Welcome to the Swasyn Server!"));
app.get("/health", (_, res) => res.json({ status: "ok" }));

// Routing
import routes from "./routes/index.js";
app.use("/api/v2", routes);

export default app;
