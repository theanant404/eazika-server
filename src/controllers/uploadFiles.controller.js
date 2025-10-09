import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiHandler.js";
import { signedUrlToUploadFiles } from "../utils/uploadFiles.js";
import { uploadFilesSchema } from "../validations/uploadFiles.validation.js";

// Get all customer addresses
export const uploadFiles = asyncHandler(async (req, res) => {
  const payload = uploadFilesSchema.parse(req.body);
  const url = await signedUrlToUploadFiles(
    payload.imageType,
    payload.fileNames
  );
  if (!url) throw new Error("Could not generate signed URL");
  res.json(new ApiResponse(200, "Files uploaded successfully", { url }));
});
