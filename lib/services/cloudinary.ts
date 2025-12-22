// Cloudinary upload service
export interface CloudinaryUploadResult {
  public_id: string
  secure_url: string
  original_filename: string
  bytes: number
  format: string
  resource_type: string
}

// For client-side uploads, we'll use unsigned upload
export async function uploadToCloudinaryClient(file: File, onProgress?: (progress: number) => void): Promise<CloudinaryUploadResult> {
  // Get cloud name from window object (set by Next.js)
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured. Please set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME in your environment variables.')
  }

  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('file', file)
    // Use unsigned upload preset - you need to create this in your Cloudinary dashboard
    // Go to Settings > Upload > Upload presets and create an unsigned preset named 'bidforge_documents'
    formData.append('upload_preset', 'bidforge_documents')
    
    const xhr = new XMLHttpRequest()
    
    // Track upload progress
    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          onProgress(progress)
        }
      })
    }
    
    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        try {
          const result = JSON.parse(xhr.responseText)
          resolve(result)
        } catch (error) {
          reject(new Error('Failed to parse Cloudinary response'))
        }
      } else {
        let errorMessage = `Upload failed with status: ${xhr.status}`
        try {
          const errorResponse = JSON.parse(xhr.responseText)
          if (errorResponse.error && errorResponse.error.message) {
            errorMessage += `: ${errorResponse.error.message}`
          }
        } catch (e) {
          // Ignore JSON parse errors for error response
        }
        
        if (xhr.status === 400) {
          errorMessage += '. Make sure you have created an unsigned upload preset named "bidforge_documents" in your Cloudinary dashboard (Settings > Upload > Upload presets).'
        }
        
        reject(new Error(errorMessage))
      }
    })
    
    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload. Please check your internet connection.'))
    })
    
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/upload`)
    xhr.send(formData)
  })
}