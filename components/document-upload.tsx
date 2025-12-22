"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import { FileText, Upload, X, CheckCircle, AlertCircle } from "lucide-react"
import { uploadToCloudinaryClient } from "@/lib/services/cloudinary"
import { useStore } from "@/lib/store"

interface DocumentUploadProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onUploadComplete?: (document: any) => void
}

const DOCUMENT_TYPES = [
  { value: "BLUEPRINT", label: "Blueprint" },
  { value: "SPECIFICATION", label: "Specification" },
  { value: "CONTRACT", label: "Contract" },
  { value: "ADDENDUM", label: "Addendum" },
  { value: "PHOTO", label: "Photo" },
  { value: "OTHER", label: "Other" },
]

export function DocumentUpload({ projectId, isOpen, onClose, onUploadComplete }: DocumentUploadProps) {
  const { currentUser } = useStore()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [documentType, setDocumentType] = useState<string>("")
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    
    // Validate file sizes (10MB limit per file)
    const maxSize = 10 * 1024 * 1024 // 10MB in bytes
    const oversizedFiles = files.filter(file => file.size > maxSize)
    
    if (oversizedFiles.length > 0) {
      setUploadStatus('error')
      setErrorMessage(`Some files are too large. Maximum size is 10MB per file. Oversized files: ${oversizedFiles.map(f => f.name).join(', ')}`)
      return
    }
    
    // Validate file types
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif'
    ]
    
    const invalidFiles = files.filter(file => !allowedTypes.includes(file.type))
    
    if (invalidFiles.length > 0) {
      setUploadStatus('error')
      setErrorMessage(`Some files have invalid formats. Allowed: PDF, DOC, DOCX, JPG, PNG, GIF. Invalid files: ${invalidFiles.map(f => f.name).join(', ')}`)
      return
    }
    
    setSelectedFiles(files)
    setUploadStatus('idle')
    setErrorMessage("")
  }

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !documentType || !currentUser) return

    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('idle')
    setErrorMessage("")

    try {
      const uploadedDocuments = []

      // Upload each file to Cloudinary
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        
        // Upload to Cloudinary with progress tracking
        const cloudinaryResult = await uploadToCloudinaryClient(file, (progress) => {
          // Calculate overall progress across all files
          const fileProgress = (i / selectedFiles.length) * 100 + (progress / selectedFiles.length)
          setUploadProgress(Math.min(fileProgress, 95))
        })

        // Save document metadata to database
        const documentData = {
          projectId,
          name: file.name,
          type: documentType,
          url: cloudinaryResult.secure_url,
          size: file.size,
          uploadedBy: currentUser.id,
        }

        const response = await fetch('/api/documents', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(documentData),
        })

        if (!response.ok) {
          throw new Error('Failed to save document metadata')
        }

        const result = await response.json()
        uploadedDocuments.push(result.document)
      }

      setUploadProgress(100)
      setUploadStatus('success')
      
      // Call the completion callback
      if (onUploadComplete) {
        uploadedDocuments.forEach(doc => onUploadComplete(doc))
      }

      // Reset form after successful upload
      setTimeout(() => {
        setSelectedFiles([])
        setDocumentType("")
        setUploadProgress(0)
        setUploadStatus('idle')
        onClose()
      }, 1500)

    } catch (error) {
      console.error('Upload failed:', error)
      setUploadStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setSelectedFiles([])
      setDocumentType("")
      setUploadProgress(0)
      setUploadStatus('idle')
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload project documents, blueprints, specifications, and other files.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Selection */}
          <div>
            <Label>Select Files</Label>
            <div 
              className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={handleFileSelect}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-1">
                Click to select files or drag and drop
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, DOC, DOCX, JPG, PNG (Max 10MB each)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Selected Files */}
          {selectedFiles.length > 0 && (
            <div>
              <Label>Selected Files ({selectedFiles.length})</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                    </div>
                    {!uploading && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Document Type */}
          {selectedFiles.length > 0 && (
            <div>
              <Label>Document Type</Label>
              <Select value={documentType} onValueChange={setDocumentType} disabled={uploading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div>
              <Label>Upload Progress</Label>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Files uploaded successfully!</span>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex flex-col gap-2 text-red-600 bg-red-50 p-3 rounded">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm font-medium">Upload Failed</span>
              </div>
              <p className="text-sm">{errorMessage}</p>
              {errorMessage.includes('upload preset') && (
                <div className="text-xs mt-2 p-2 bg-red-100 rounded">
                  <p className="font-medium mb-1">Setup Required:</p>
                  <p>Create an unsigned upload preset named "bidforge_documents" in your Cloudinary dashboard.</p>
                  <p>Go to Settings → Upload → Upload presets → Add upload preset</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={uploading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || !documentType || uploading}
              className="flex-1 bg-accent hover:bg-accent-hover text-white"
            >
              {uploading ? "Uploading..." : "Upload Files"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}