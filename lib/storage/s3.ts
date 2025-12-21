import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { v4 as uuidv4 } from "uuid"

// S3 client for file storage (blueprints, documents, certifications)
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "bidforge-documents"

export const storage = {
  // Upload file to S3
  async uploadFile(file: File, folder = "documents"): Promise<{ key: string; url: string }> {
    const fileExtension = file.name.split(".").pop()
    const key = `${folder}/${uuidv4()}.${fileExtension}`

    const buffer = await file.arrayBuffer()

    await s3Client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      }),
    )

    const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`
    return { key, url }
  },

  // Get presigned URL for secure file access
  async getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    })

    return await getSignedUrl(s3Client, command, { expiresIn })
  },

  // Delete file from S3
  async deleteFile(key: string): Promise<void> {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      }),
    )
  },
}
