export const storage = {
  async uploadFile(file: File, folder = "documents"): Promise<{ key: string; url: string; publicId: string }> {
    throw new Error("File storage via Cloudinary has been removed. Please migrate to UploadThing.")
  },

  getOptimizedUrl(publicId: string, options?: { width?: number; height?: number; format?: string }): string {
    throw new Error("Cloudinary optimized URLs are no longer supported.")
  },

  getSignedUrl(publicId: string, expiresIn = 3600): string {
    throw new Error("Cloudinary signed URLs are no longer supported.")
  },

  async deleteFile(publicId: string): Promise<void> {
    throw new Error("Cloudinary delete is no longer supported.")
  },

  async uploadMultipleFiles(files: File[], folder = "documents"): Promise<Array<{ key: string; url: string }>> {
    throw new Error("Cloudinary multi-file upload is no longer supported.")
  },
}
