'use client'

import { useState } from 'react'
import {
  Download,
  Share2,
  Trash2,
  FolderInput,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logger } from '@/lib/utils/logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createShareLink } from '@/lib/storage/files'
import type { FileMetadata } from '@/lib/storage/files'

interface FileActionsProps {
  file: FileMetadata
  onDownload?: () => void
  onDelete?: () => void
  onMove?: (newFolderPath: string) => void
}

export function FileActions({
  file,
  onDownload,
  onDelete,
  onMove,
}: FileActionsProps) {
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showMoveDialog, setShowMoveDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [shareLink, setShareLink] = useState<string | null>(null)
  const [linkCopied, setLinkCopied] = useState(false)
  const [newFolderPath, setNewFolderPath] = useState('')
  const [expiresIn, setExpiresIn] = useState('86400') // 24 hours

  const handleDownload = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}`)
      const data = await response.json()

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
        onDownload?.()
      }
    } catch (error) {
      logger.error('Download failed', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id
      })
    }
  }

  const handleGenerateShareLink = async () => {
    try {
      const link = await createShareLink(file.id, parseInt(expiresIn))
      setShareLink(link)
    } catch (error) {
      logger.error('Failed to generate share link', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id
      })
    }
  }

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const handleMove = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ folderPath: newFolderPath }),
      })

      if (!response.ok) {
        throw new Error('Failed to move file')
      }

      setShowMoveDialog(false)
      onMove?.(newFolderPath)
    } catch (error) {
      logger.error('Move failed', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id,
        new_folder_path: newFolderPath
      })
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      setShowDeleteDialog(false)
      onDelete?.()
    } catch (error) {
      logger.error('Delete failed', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id
      })
    }
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowShareDialog(true)}
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowMoveDialog(true)}
        >
          <FolderInput className="mr-2 h-4 w-4" />
          Move
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          className="text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share File</DialogTitle>
            <DialogDescription>
              Generate a temporary share link for {file.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="expires">Link expires in</Label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger id="expires">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="86400">24 hours</SelectItem>
                  <SelectItem value="604800">7 days</SelectItem>
                  <SelectItem value="2592000">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {shareLink && (
              <div className="space-y-2">
                <Label htmlFor="share-link">Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="share-link"
                    value={shareLink}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="flex-shrink-0"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowShareDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateShareLink}>Generate Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Move Dialog */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move File</DialogTitle>
            <DialogDescription>
              Move {file.name} to a different folder
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-path">Folder Path</Label>
              <Input
                id="folder-path"
                value={newFolderPath}
                onChange={(e) => setNewFolderPath(e.target.value)}
                placeholder="e.g., documents/projects"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to move to root folder
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMoveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleMove}>Move File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete File</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {file.name}? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
