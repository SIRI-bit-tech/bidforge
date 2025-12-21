import { v2 as cloudinary } from "cloudinary"
import { v4 as uuidv4 } from "uuid"

// Configure Cloudinary client for file storage (blueprints, documents, certifications)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
})

export const storage = {
  // Upload file to Cloudinary
  async uploadFile(file: File, folder = "documents"): Promise<{ key: string; url: string; publicId: string }> {
    const buffer = await file.arrayBuffer()
    const base64 = Buffer.from(buffer).toString("base64")
    const dataURI = `data:${file.type};base64,${base64}`

    const uniqueId = uuidv4()
    const publicId = `${folder}/${uniqueId}`

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: folder,
      public_id: uniqueId,
      resource_type: "auto", // Automatically detect file type
    })

    return {
      key: result.public_id,
      url: result.secure_url,
      publicId: result.public_id,
    }
  },

  // Get optimized URL for file delivery with transformations
  getOptimizedUrl(publicId: string, options?: { width?: number; height?: number; format?: string }): string {
    return cloudinary.url(publicId, {
      secure: true,
      transformation: [
        ...(options?.width ? [{ width: options.width }] : []),
        ...(options?.height ? [{ height: options.height }] : []),
        ...(options?.format ? [{ fetch_format: options.format }] : []),
      ],
    })
  },

  // Get signed URL for secure file access (expires in specified time)
  getSignedUrl(publicId: string, expiresIn = 3600): string {
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn

    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: "authenticated",
    })
  },

  // Delete file from Cloudinary
  async deleteFile(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "auto",
    })
  },

  // Upload multiple files at once
  async uploadMultipleFiles(files: File[], folder = "documents"): Promise<Array<{ key: string; url: string }>> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder))
    return await Promise.all(uploadPromises)
  },
}
