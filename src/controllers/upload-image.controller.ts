import { Request, Response } from "express";
import { generateV4UploadSignedUrl, getPublicUrl } from "../services/gcs";

export async function getSignedUrl(req: Request, res: Response) {
  try {
    // console.log('Request body:', req.body);
    const { fileName, contentType } = req.body;
    const bucketName = process.env.GCS_BUCKET_NAME as string;
    if (!fileName) {
      return res.status(400).json({ error: "File name is required" });
    }
    if (!bucketName) {
      return res
        .status(500)
        .json({ error: "GCS bucket name is not configured" });
    }
    const fileContentType = contentType || "application/octet-stream";
    const url = await generateV4UploadSignedUrl(
      bucketName,
      fileName,
      fileContentType
    );
    const publicUrl = getPublicUrl(bucketName, fileName);

    // console.log("Generated signed URL:", url);
    res.json({
      signedUrl: url,
      publicUrl: publicUrl,
      instructions: {
        method: "PUT",
        headers: {
          "Content-Type": fileContentType,
        },
        note: "After uploading to signedUrl, the file will be accessible at publicUrl",
      },
    });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    res.status(500).json({ error: "Failed to generate signed URL" });
  }
}

export async function getMultipleSignedUrls(req: Request, res: Response) {
  try {
    const { files } = req.body;
    const bucketName = process.env.GCS_BUCKET_NAME as string;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({
        error: "Files array is required and must contain at least one file",
        example: {
          files: [
            { fileName: "image1.jpg", contentType: "image/jpeg" },
            { fileName: "image2.png", contentType: "image/png" },
          ],
        },
      });
    }

    if (!bucketName) {
      return res
        .status(500)
        .json({ error: "GCS bucket name is not configured" });
    }

    const uploadData = await Promise.all(
      files.map(async (file: { fileName: string; contentType?: string }) => {
        if (!file.fileName) {
          throw new Error("Each file must have a fileName");
        }

        const fileContentType = file.contentType || "application/octet-stream";
        const signedUrl = await generateV4UploadSignedUrl(
          bucketName,
          file.fileName,
          fileContentType
        );
        const publicUrl = getPublicUrl(bucketName, file.fileName);

        return {
          fileName: file.fileName,
          signedUrl,
          publicUrl,
          contentType: fileContentType,
        };
      })
    );

    res.json({
      success: true,
      count: uploadData.length,
      files: uploadData,
      urls: uploadData.map((d) => d.signedUrl),
      instructions: {
        method: "PUT",
        note: "Upload each file to its corresponding signedUrl using PUT request with the correct Content-Type header. After upload, files will be accessible at their publicUrl",
      },
    });
  } catch (error) {
    console.error("Error generating multiple signed URLs:", error);
    res.status(500).json({
      error: "Failed to generate signed URLs",
      details: (error as Error).message,
    });
  }
}
