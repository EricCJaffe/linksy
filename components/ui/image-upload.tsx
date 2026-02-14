'use client'

import { useCallback, useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string) => void
  onRemove?: () => void
  disabled?: boolean
  className?: string
  uploadFn: (file: File) => Promise<string>
}

export function ImageUpload({
  value,
  onChange,
  onRemove,
  disabled,
  className,
  uploadFn,
}: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)
      setIsUploading(true)

      try {
        const url = await uploadFn(file)
        onChange(url)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to upload file')
      } finally {
        setIsUploading(false)
      }
    },
    [onChange, uploadFn]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)

      if (disabled || isUploading) return

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [disabled, isUploading, handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleRemove = useCallback(() => {
    onRemove?.()
    setError(null)
  }, [onRemove])

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="relative">
          <img
            src={value}
            alt="Upload preview"
            className="h-32 w-32 rounded-lg border object-cover"
          />
          {!disabled && (
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -right-2 -top-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ) : (
        <div
          className={cn(
            'flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
            isDragging && 'border-primary bg-primary/5',
            disabled && 'cursor-not-allowed opacity-50',
            !disabled && !isDragging && 'hover:border-primary/50'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => {
            if (!disabled && !isUploading) {
              document.getElementById('file-upload')?.click()
            }
          }}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                Drop an image here or click to upload
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                PNG, JPG, GIF up to 5MB
              </p>
            </>
          )}
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileInput}
            disabled={disabled || isUploading}
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
