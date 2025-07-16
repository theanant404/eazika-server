import { ZodError } from "zod";

const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ status: "fail", message: error.errors[0] });
    }
    return res.status(500).json({ status: "error", message: error.message });
  }
};

export { asyncHandler };
