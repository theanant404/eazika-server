import { z } from "zod";

export const productReviewSchema = z.object({
  shopProductId: z.string().uuid("Invalid product ID"),
  orderId: z.string().uuid("Invalid order ID"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating cannot exceed 5"),
  review: z.string().max(1000, "Review cannot exceed 1000 characters").optional()
});

export function validateProductReview(req, res, next) {
  try {
    productReviewSchema.parse(req.body);
    next();
  } catch (e) {
    // Handle different types of Zod errors safely
    let errorMessage = "Invalid request data";
    
    if (e.errors && Array.isArray(e.errors) && e.errors.length > 0) {
      errorMessage = e.errors[0]?.message || errorMessage;
    } else if (e.message) {
      errorMessage = e.message;
    }
    
    return res.status(400).json({
      success: false,
      error: errorMessage
    });
  }
}
