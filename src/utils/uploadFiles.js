import { env } from "../config/index.js";
import { Storage } from "@google-cloud/storage";

const storage = new Storage({ keyFilename: env.gcs_key_file });

export async function signedUrlToUploadFiles(folderName, fileNames) {
  const files = fileNames
    .map(
      (name) =>
        `${folderName}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${name.split(".").pop()}`
    )
    .join(",");

  const options = {
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    contentType: "application/octet-stream",
  };

  const [url] = await storage
    .bucket(env.gcs_bucket_name)
    .file(files)
    .getSignedUrl(options);

  //   console.log("Generated PUT signed URL:", url);

  return url;
}
