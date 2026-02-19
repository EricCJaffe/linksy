'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Paperclip, X, FileText, Image, FileSpreadsheet, File, Loader2, Download } from 'lucide-react'
import type { NoteAttachment } from '@/lib/types/linksy'

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  if (type.includes('pdf')) return FileText
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return FileSpreadsheet
  return File
}

interface FileAttachmentEditProps {
  value: NoteAttachment[]
  onChange: (attachments: NoteAttachment[]) => void
  uploadFn: (file: File) => Promise<string>
}

export function FileAttachmentEdit({ value, onChange, uploadFn }: FileAttachmentEditProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    try {
      const newAttachments: NoteAttachment[] = []
      for (const file of Array.from(files)) {
        const url = await uploadFn(file)
        newAttachments.push({
          name: file.name,
          url,
          size: file.size,
          type: file.type,
        })
      }
      onChange([...value, ...newAttachments])
    } catch (e: any) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <Paperclip className="h-4 w-4 mr-1.5" />
        )}
        {uploading ? 'Uploading...' : 'Attach Files'}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {value.length > 0 && (
        <div className="space-y-1">
          {value.map((att, i) => {
            const Icon = getFileIcon(att.type)
            return (
              <div
                key={`${att.url}-${i}`}
                className="flex items-center gap-2 rounded border bg-muted/30 px-2.5 py-1.5 text-sm"
              >
                <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <span className="truncate flex-1">{att.name}</span>
                <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(att.size)}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="text-muted-foreground hover:text-destructive flex-shrink-0"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

interface FileAttachmentDisplayProps {
  attachments: NoteAttachment[] | undefined | null
}

export function FileAttachmentDisplay({ attachments }: FileAttachmentDisplayProps) {
  if (!attachments || attachments.length === 0) return null

  return (
    <div className="space-y-1 mt-2">
      {attachments.map((att, i) => {
        const Icon = getFileIcon(att.type)
        return (
          <a
            key={`${att.url}-${i}`}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded border bg-muted/30 px-2.5 py-1.5 text-sm hover:bg-muted/50 transition-colors"
          >
            <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            <span className="truncate flex-1 text-primary">{att.name}</span>
            <span className="text-xs text-muted-foreground flex-shrink-0">{formatSize(att.size)}</span>
            <Download className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
          </a>
        )
      })}
    </div>
  )
}
