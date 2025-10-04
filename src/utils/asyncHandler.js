import { ZodError } from "zod";

import { env } from "../config/index.js";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    if (env.isNodeEnvDevelopment)
      console.log("Error caught in asyncHandler:", error.message);
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: "fail",
        message: JSON.parse(error.message)[0].message || "Validation failed",
        errors: JSON.parse(error.message)[0].path || [],
      });
    }
    // if prisma error

    return res.status(error.statusCode || 500).json({
      status: "error",
      message: error.message || "Something went wrong",
    });
  }
};

export { asyncHandler };
