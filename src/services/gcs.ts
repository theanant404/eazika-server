
import { Storage } from "@google-cloud/storage";
import path from "node:path";

const storage = new Storage({
    // process cwd so dist build can find the key
    keyFilename: path.resolve(process.cwd(), "key.json"),
    projectId: "eazika-473507",
});

export async function generateV4UploadSignedUrl(bucketName: string, fileName: string, contentType: string = 'application/octet-stream'): Promise<string> {
    const options = {
        version: 'v4' as 'v4',
        action: 'write' as 'write',
        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
        contentType: contentType,
    };

    const [url] = await storage.bucket(bucketName).file(fileName).getSignedUrl(options);

    return url;
}

export function getPublicUrl(bucketName: string, fileName: string): string {
    return `https://storage.googleapis.com/${bucketName}/${fileName}`;
}
