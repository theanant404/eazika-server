import { z } from "zod";

export const uploadFilesSchema = z.object({
  imageType: z.enum(
    ["user", "product", "shopkeeper", "delivery_boy", "documents", "others"],
    {
      required_error: "imageType is required",
      invalid_type_error: "Invalid imageType",
    }
  ),
  fileNames: z
    .array(z.string().min(1, "File name cannot be empty"))
    .min(1, "At least one file name is required"),
});
