import { env } from "../config/index.js";
import { Storage } from "@google-cloud/storage";

const storage = new Storage({ keyFilename: env.gcs_key_file });
const mimeMap = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
  heic: "image/heic",
  pdf: "application/pdf",
  bmp: "image/bmp",
};

function getExtension(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name.split(".");
  if (parts.length === 1) return "";
  return parts.pop().toLowerCase();
}

function getContentType(name) {
  const ext = getExtension(name);
  return mimeMap[ext] || "application/octet-stream";
}

/**
 * Generate signed upload URLs for one or more files.
 * Returns an array of { url, key, contentType }.
 *
 * - folderName: string (e.g. "uploads/images")
 * - fileNames: array of original filenames or a single filename string
 * - expiresMs: optional expiry in milliseconds (default 10 minutes)
 */
export async function signedUrlToUploadFiles(
  folderName,
  fileNames,
  expiresMs = 10 * 60 * 1000
) {
  if (!folderName || typeof folderName !== "string") {
    throw new Error("folderName must be a non-empty string");
  }

  const names = Array.isArray(fileNames) ? fileNames : [fileNames];
  if (!names || names.length === 0) return [];

  try {
    const results = await Promise.all(
      names.map(async (originalName) => {
        const ext = getExtension(originalName);
        const key = `${folderName}/${Date.now()}-${Math.floor(Math.random() * 1000)}${
          ext ? "." + ext : ""
        }`;

        const contentType = getContentType(originalName);

        const options = {
          version: "v4",
          action: "write",
          expires: Date.now() + expiresMs,
          contentType,
        };

        const [url] = await storage
          .bucket(env.gcs_bucket_name)
          .file(key)
          .getSignedUrl(options);

        return { url, key, contentType };
      })
    );

    // console.log(results);
    return results;
  } catch (err) {
    throw new Error(`Failed to generate signed URLs: ${err?.message || err}`);
  }
}

/**
 * Upload a single file buffer (from multer memoryStorage) to GCS.
 * - folderName: destination folder in bucket
 * - file: multer file object { originalname, buffer, mimetype }
 * - makePublic: if true, make the uploaded object public (optional)
 * Returns: { key, contentType, url }
 */
export async function uploadBufferToGCS(folderName, file, makePublic = false) {
  if (!folderName || typeof folderName !== "string") {
    throw new Error("folderName must be a non-empty string");
  }
  if (!file || !file.buffer) {
    throw new Error("file with buffer is required");
  }

  const ext = getExtension(file.originalname) || "";
  const key = `${folderName}/${Date.now()}-${Math.floor(Math.random() * 1000)}${
    ext ? "." + ext : ""
  }`;

  const bucket = storage.bucket(env.gcs_bucket_name);
  const fileRef = bucket.file(key);

  try {
    await fileRef.save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype || getContentType(file.originalname),
      },
    });

    if (makePublic) {
      try {
        await fileRef.makePublic();
      } catch (e) {
        // non-fatal
        console.warn("Could not make file public:", e?.message || e);
      }
    }

    // If made public, return public URL, otherwise generate a short-lived read signed URL
    if (makePublic) {
      const publicUrl = `https://storage.googleapis.com/${env.gcs_bucket_name}/${key}`;
      return { key, contentType: file.mimetype, url: publicUrl };
    }

    const [readUrl] = await fileRef.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    return { key, contentType: file.mimetype, url: readUrl };
  } catch (err) {
    throw new Error(`Failed to upload buffer to GCS: ${err?.message || err}`);
  }
}
