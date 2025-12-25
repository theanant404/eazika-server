import env from "../config/env.config.js";

export class ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data: T | null;
  success: boolean;

  constructor(statusCode: number, message = "Success", data?: T) {
    if (env.isNodeEnvDevelopment)
      console.log(
        `ApiResponse : ${statusCode}, Message: ${message},`
      );

    this.statusCode = statusCode;
    this.message = message;
    this.data = typeof data === "undefined" ? null : data;
    this.success = statusCode < 400;
  }
}

export class ApiError extends Error {
  statusCode: number;
  data: null;
  success: false;
  errors: unknown[];

  constructor(
    statusCode: number,
    message = "Something went wrong",
    errors: unknown[] = [],
    stack = ""
  ) {
    super(message);

    // Restore prototype chain (important when targeting ES5)
    Object.setPrototypeOf(this, new.target.prototype);

    if (env.isNodeEnvDevelopment) {
      console.error(`ApiError : ${statusCode},message: ${message}`);
    }

    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
