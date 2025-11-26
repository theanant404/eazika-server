import { asyncHandler } from "../utils/asyncHandler";
import { ApiError, ApiResponse } from "../utils/apiHandler";
import env from "../config/env.config";

import { Storage } from "@google-cloud/storage";

const storage = new Storage({ keyFilename: "key.json" });

// ROUTE => POST http://localhost:5000/api/v2/uploads/profile-picture
const uploadProfilePicture = asyncHandler(async (req, res) => {
  const { file } = req.body;

  if (!file || typeof file !== "string")
    throw new ApiError(400, "No file provided");

  const [signedUrl] = await storage
    .bucket(env.gcsBucketName)
    .file(file)
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "application/octet-stream",
    });

  res.status(200).json(
    new ApiResponse(200, "Profile picture uploaded successfully", {
      signedUrl,
    })
  );
});

// ROUTE => POST http://localhost:5000/api/v2/uploads/product-images
const uploadProdectImages = asyncHandler(async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0 || files.length > 5) {
    throw new ApiError(400, "Please provide between 1 to 5 files");
  }

  const [signedUrls] = await storage
    .bucket(env.gcsBucketName)
    .file(files.join(","))
    .getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: "application/octet-stream",
    });

  res.status(200).json(
    new ApiResponse(200, "Product images uploaded successfully", {
      signedUrls,
    })
  );
});

export { uploadProfilePicture, uploadProdectImages };
