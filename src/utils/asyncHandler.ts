import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";

import env from "../config/env.config.js";

type AnyError = unknown & {
  statusCode?: number;
  status?: string;
  message?: string;
};

const asyncHandler =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<unknown> | unknown
  ): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await Promise.resolve(fn(req, res, next));
    } catch (error: AnyError | any) {
      if (env.isNodeEnvDevelopment) {
        console.log("Error caught in asyncHandler:", error.message);
      }

      if (error instanceof ZodError) {
        const first = error.issues?.[0];
        return res.status(400).json({
          status: "fail",
          message: first?.message ?? "Validation failed",
          errors: first?.path ?? [],
        });
      }

      return res.status(error.statusCode ?? 500).json({
        status: "error",
        message: error.message ?? "Something went wrong",
      });
    }
  };

export { asyncHandler };
