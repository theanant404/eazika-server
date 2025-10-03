import { env } from "../config/index.js";
class ApiResponse {
  constructor(statusCode, message = "Success", data) {
    if (env.isNodeEnvDevelopment)
      console.log(
        `ApiResponse : ${statusCode},message: ${message}, and data: ${JSON.stringify(data)}`
      );

    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.success = statusCode < 400;
  }
}

class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    errors = [],
    stack = ""
  ) {
    if (env.isNodeEnvDevelopment) {
      console.error(`ApiError : ${statusCode},message: ${message}`);
    }

    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiResponse, ApiError };
