'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Grid3x3,
  List,
  Search,
  ChevronRight,
  FolderIcon,
  Download,
  Trash2,
  Share2,
  MoreVertical,
} from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logger } from '@/lib/utils/logger'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatFileSize, getFileIcon } from '@/lib/storage/files'
import type { FileMetadata } from '@/lib/storage/files'

interface FileBrowserProps {
  moduleId?: string
  folderPath?: string
  onFileClick?: (file: FileMetadata) => void
  onFolderChange?: (path: string) => void
  onDownload?: (file: FileMetadata) => void
  onDelete?: (file: FileMetadata) => void
  onShare?: (file: FileMetadata) => void
  className?: string
}

type ViewMode = 'list' | 'grid'
type SortBy = 'name' | 'date' | 'size'

async function fetchFiles(
  moduleId?: string,
  folderPath?: string
): Promise<{ files: FileMetadata[] }> {
  const params = new URLSearchParams()
  if (moduleId) params.set('moduleId', moduleId)
  if (folderPath !== undefined) params.set('folderPath', folderPath)

  const response = await fetch(`/api/files?${params.toString()}`)

  if (!response.ok) {
    throw new Error('Failed to fetch files')
  }

  return response.json()
}

export function FileBrowser({
  moduleId,
  folderPath = '',
  onFileClick,
  onFolderChange,
  onDownload,
  onDelete,
  onShare,
  className,
}: FileBrowserProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['files', moduleId, folderPath],
    queryFn: () => fetchFiles(moduleId, folderPath),
  })

  // Get breadcrumb path
  const breadcrumbs = folderPath
    ? folderPath.split('/').filter(Boolean)
    : []

  // Filter and sort files
  const filteredFiles = (data?.files || [])
    .filter((file) =>
      file.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'size':
          return b.size - a.size
        case 'date':
        default:
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
      }
    })

  const handleBreadcrumbClick = (index: number) => {
    const newPath = breadcrumbs.slice(0, index + 1).join('/')
    onFolderChange?.(newPath)
  }

  const handleDownload = async (file: FileMetadata) => {
    try {
      const response = await fetch(`/api/files/${file.id}`)
      const data = await response.json()

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank')
      }

      onDownload?.(file)
    } catch (error) {
      logger.error('Download failed', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id,
        file_name: file.name
      })
    }
  }

  const handleDelete = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete ${file.name}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/files/${file.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete file')
      }

      refetch()
      onDelete?.(file)
    } catch (error) {
      logger.error('Delete failed', error instanceof Error ? error : new Error('Unknown error'), {
        file_id: file.id,
        file_name: file.name
      })
    }
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1 text-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFolderChange?.('')}
            className="h-8 px-2"
          >
            <FolderIcon className="h-4 w-4" />
          </Button>
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(index)}
                className="h-8 px-2"
              >
                {crumb}
              </Button>
            </div>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Sort */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="size">Size</SelectItem>
            </SelectContent>
          </Select>

          {/* View Mode */}
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading files...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredFiles.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
          <FolderIcon className="h-12 w-12 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {searchQuery ? 'No files found' : 'No files uploaded yet'}
          </p>
        </div>
      )}

      {/* List View */}
      {!isLoading && viewMode === 'list' && filteredFiles.length > 0 && (
        <div className="rounded-lg border">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b p-3 text-xs font-medium text-muted-foreground">
            <div>Type</div>
            <div>Name</div>
            <div>Size</div>
            <div>Modified</div>
            <div></div>
          </div>
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 border-b p-3 last:border-b-0 hover:bg-muted/50"
            >
              <div className="flex items-center text-2xl">
                {getFileIcon(file.mime_type)}
              </div>
              <div
                className="flex items-center truncate cursor-pointer"
                onClick={() => onFileClick?.(file)}
              >
                <span className="truncate font-medium">{file.name}</span>
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                {formatFileSize(file.size)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                {format(new Date(file.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare?.(file)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(file)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Grid View */}
      {!isLoading && viewMode === 'grid' && filteredFiles.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="group relative rounded-lg border p-4 hover:bg-muted/50"
            >
              <div
                className="cursor-pointer"
                onClick={() => onFileClick?.(file)}
              >
                <div className="mb-3 flex h-24 items-center justify-center text-5xl">
                  {getFileIcon(file.mime_type)}
                </div>
                <p className="truncate text-sm font-medium" title={file.name}>
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(file.size)}
                </p>
              </div>

              <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(file)}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onShare?.(file)}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDelete(file)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
