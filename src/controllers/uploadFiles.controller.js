import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiHandler.js";
import {
  signedUrlToUploadFiles,
  uploadBufferToGCS,
} from "../utils/uploadFiles.js";
// import { uploadFilesSchema } from "../validations/uploadFiles.validation.js";

// Get all customer addresses
export const uploadFiles = asyncHandler(async (req, res) => {
  const payload = req.body || {};
  // console.log("Payload:", payload);

  const file = req.file;

  // If a file buffer is provided (multer memoryStorage), upload server-side
  if (file && file.buffer) {
    // folderName (imageType) is optional; default to 'uploads'
    const folder = payload.imageType || "uploads";
    const result = await uploadBufferToGCS(folder, file, false);
    return res.json(new ApiResponse(200, "File uploaded successfully", result));
  }

  // Otherwise, client likely wants signed URLs for direct upload.
  // Expect payload.fileNames to be a string or array of strings.
  const { fileNames } = payload;
  if (!fileNames) {
    return res
      .status(400)
      .json(
        new ApiResponse(400, "No file provided and fileNames missing", null)
      );
  }

  const folderName = payload.imageType || "uploads";
  const signed = await signedUrlToUploadFiles(folderName, fileNames);
  return res.json(new ApiResponse(200, "Signed URLs generated", signed));
});
