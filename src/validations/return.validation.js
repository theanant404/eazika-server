import { z } from "zod";

// For customer to request a return
export const returnRequestSchema = z.object({
  orderItemId: z.string().uuid(),
  reason: z.string().min(5, "Reason for return required")
});

export function validateReturnRequest(req, res, next) {
  try {
    returnRequestSchema.parse(req.body);
    next();
  } catch (e) {
    res.status(400).json({
      success: false,
      error: e.errors[0]?.message || "Invalid request data"
    });
  }
}
