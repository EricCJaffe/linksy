'use client'

import { useCallback, useState } from 'react'
import { Upload, X, FileIcon, Image, Video, Music } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { formatFileSize } from '@/lib/storage/files'

interface FileUploadProps {
  moduleId?: string
  isShared?: boolean
  folderPath?: string
  onUploadComplete?: (file: any) => void
  onError?: (error: string) => void
  maxFiles?: number
  accept?: string
  maxSize?: number
  className?: string
}

interface UploadingFile {
  file: File
  progress: number
  preview?: string
  error?: string
}

export function FileUpload({
  moduleId = 'general',
  isShared = false,
  folderPath = '',
  onUploadComplete,
  onError,
  maxFiles = 10,
  accept,
  maxSize = 50 * 1024 * 1024, // 50MB default
  className,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([])

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-8 w-8" />
    if (file.type.startsWith('video/')) return <Video className="h-8 w-8" />
    if (file.type.startsWith('audio/')) return <Music className="h-8 w-8" />
    return <FileIcon className="h-8 w-8" />
  }

  const createPreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => resolve(e.target?.result as string)
        reader.onerror = () => resolve(undefined)
        reader.readAsDataURL(file)
      } else {
        resolve(undefined)
      }
    })
  }

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('moduleId', moduleId)
    formData.append('isShared', isShared.toString())
    if (folderPath) {
      formData.append('folderPath', folderPath)
    }

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const result = await response.json()
      return result.file
    } catch (error) {
      throw error
    }
  }

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Validate number of files
    if (fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`)
      return
    }

    // Validate file sizes
    const oversizedFiles = fileArray.filter((file) => file.size > maxSize)
    if (oversizedFiles.length > 0) {
      onError?.(
        `Some files exceed the maximum size of ${formatFileSize(maxSize)}`
      )
      return
    }

    // Create uploading file entries with previews
    const uploadingEntries = await Promise.all(
      fileArray.map(async (file) => ({
        file,
        progress: 0,
        preview: await createPreview(file),
      }))
    )

    setUploadingFiles(uploadingEntries)

    // Upload files
    for (let i = 0; i < uploadingEntries.length; i++) {
      const entry = uploadingEntries[i]

      try {
        // Update progress
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 50 } : f))
        )

        const uploadedFile = await uploadFile(entry.file)

        // Update progress to 100%
        setUploadingFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 100 } : f))
        )

        onUploadComplete?.(uploadedFile)

        // Remove from uploading list after a delay
        setTimeout(() => {
          setUploadingFiles((prev) => prev.filter((_, idx) => idx !== i))
        }, 1000)
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Upload failed'

        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, error: errorMessage } : f
          )
        )

        onError?.(errorMessage)
      }
    }
  }

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [moduleId, isShared, folderPath]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, idx) => idx !== index))
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        )}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          multiple={maxFiles > 1}
          accept={accept}
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="rounded-full bg-muted p-4">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <p className="text-lg font-medium">
              Drag and drop files here, or click to select
            </p>
            <p className="text-sm text-muted-foreground">
              Maximum file size: {formatFileSize(maxSize)}
              {maxFiles > 1 && ` • Up to ${maxFiles} files`}
            </p>
          </div>

          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Choose Files
            </label>
          </Button>
        </div>
      </div>

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Uploading Files</h3>
          <div className="space-y-2">
            {uploadingFiles.map((upload, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border p-3"
              >
                {/* Preview or Icon */}
                <div className="flex-shrink-0">
                  {upload.preview ? (
                    <img
                      src={upload.preview}
                      alt={upload.file.name}
                      className="h-12 w-12 rounded object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-muted-foreground">
                      {getFileIcon(upload.file)}
                    </div>
                  )}
                </div>

                {/* File Info */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium truncate">
                      {upload.file.name}
                    </p>
                    {!upload.error && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(upload.file.size)}
                  </p>

                  {upload.error ? (
                    <p className="text-xs text-red-500">{upload.error}</p>
                  ) : (
                    <Progress value={upload.progress} className="h-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
