import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { verifyJWT } from '@/lib/services/auth'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Define allowed file types and extensions
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text files
  'text/plain',
  'text/csv',
  // Archives
  'application/zip',
  'application/x-zip-compressed',
]

const ALLOWED_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'gif', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'txt', 'csv', 'zip'
]

// Map extensions to their allowed MIME types (handles aliases like jpg/jpeg)
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  // Images - handle jpg/jpeg aliases
  'jpg': ['image/jpeg'],
  'jpeg': ['image/jpeg'],
  'png': ['image/png'],
  'gif': ['image/gif'],
  'webp': ['image/webp'],
  // Documents
  'pdf': ['application/pdf'],
  'doc': ['application/msword'],
  'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  'xls': ['application/vnd.ms-excel'],
  'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  'ppt': ['application/vnd.ms-powerpoint'],
  'pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  // Text files
  'txt': ['text/plain'],
  'csv': ['text/csv'],
  // Archives
  'zip': ['application/zip', 'application/x-zip-compressed']
}

// Sanitize and validate file extension with MIME type correspondence
function getValidatedExtension(fileName: string, mimeType: string): string | null {
  // Extract extension from filename (handle files without extensions)
  const parts = fileName.toLowerCase().split('.')
  if (parts.length < 2) {
    return null // No extension
  }
  
  // Get the last part as extension (handles double extensions)
  const extension = parts[parts.length - 1]
  
  // Validate extension is in allowed list
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return null
  }
  
  // Get allowed MIME types for this extension
  const allowedMimeTypes = EXTENSION_MIME_MAP[extension]
  if (!allowedMimeTypes) {
    return null // Extension not in mapping
  }
  
  // Validate that the provided MIME type matches the extension
  if (!allowedMimeTypes.includes(mimeType)) {
    return null // MIME type doesn't match extension
  }
  
  return extension
}

// Convert file to base64 data URL for Cloudinary upload
async function fileToDataURL(file: File): Promise<string> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const base64 = buffer.toString('base64')
  return `data:${file.type};base64,${base64}`
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = verifyJWT(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Validate file count (max 5 files)
    if (files.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 files allowed per message' },
        { status: 400 }
      )
    }

    const uploadedFiles = []

    for (const file of files) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 10MB.` },
          { status: 400 }
        )
      }

      // Validate file type and extension
      const validExtension = getValidatedExtension(file.name, file.type)
      if (!validExtension) {
        return NextResponse.json(
          { error: `File ${file.name} has an unsupported file type. Allowed types: images, documents, text files, and archives.` },
          { status: 400 }
        )
      }

      try {
        // Convert file to data URL for Cloudinary upload
        const dataURL = await fileToDataURL(file)
        
        // Generate secure filename with validated extension
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(2, 15)
        const fileName = `${timestamp}_${randomString}`
        
        // Determine resource type based on file type
        const resourceType = file.type.startsWith('image/') ? 'image' : 
                           file.type.startsWith('video/') ? 'video' : 'raw'
        
        // Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(dataURL, {
          folder: 'bidforge/messages',
          public_id: fileName,
          resource_type: resourceType,
          use_filename: false,
          unique_filename: true,
        })
        
        uploadedFiles.push({
          fileName: uploadResult.public_id,
          originalName: file.name,
          fileType: file.type,
          fileSize: file.size,
          url: uploadResult.secure_url,
        })
        
      } catch (uploadError) {
        console.error('Cloudinary upload error:', uploadError)
        return NextResponse.json(
          { error: `Failed to upload ${file.name}. Please try again.` },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      files: uploadedFiles
    })

  } catch (error) {
    console.error('File upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    )
  }
}