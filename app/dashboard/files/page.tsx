'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload as UploadIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { FileUpload } from '@/components/shared/file-upload'
import { FileBrowser } from '@/components/shared/file-browser'
import { FileActions } from '@/components/shared/file-actions'
import type { FileMetadata } from '@/lib/storage/files'
import { useToast } from '@/hooks/use-toast'

export default function FilesPage() {
  const [selectedFile, setSelectedFile] = useState<FileMetadata | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)
  const [currentFolder, setCurrentFolder] = useState('')
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const handleUploadComplete = (file: FileMetadata) => {
    toast({
      title: 'Upload complete',
      description: `${file.name} has been uploaded successfully`,
    })
    queryClient.invalidateQueries({ queryKey: ['files'] })
    setShowUploadDialog(false)
  }

  const handleUploadError = (error: string) => {
    toast({
      title: 'Upload failed',
      description: error,
      variant: 'destructive',
    })
  }

  const handleFileClick = (file: FileMetadata) => {
    setSelectedFile(file)
  }

  const handleFileDeleted = () => {
    toast({
      title: 'File deleted',
      description: 'The file has been deleted successfully',
    })
    setSelectedFile(null)
    queryClient.invalidateQueries({ queryKey: ['files'] })
  }

  const handleFileMoved = (newPath: string) => {
    toast({
      title: 'File moved',
      description: `File has been moved to ${newPath || 'root folder'}`,
    })
    setSelectedFile(null)
    queryClient.invalidateQueries({ queryKey: ['files'] })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Files</h1>
          <p className="text-muted-foreground">
            Upload and manage your files
          </p>
        </div>

        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <UploadIcon className="mr-2 h-4 w-4" />
              Upload Files
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Files</DialogTitle>
              <DialogDescription>
                Upload files to your workspace. Maximum file size is 50MB.
              </DialogDescription>
            </DialogHeader>
            <FileUpload
              onUploadComplete={handleUploadComplete}
              onError={handleUploadError}
              folderPath={currentFolder}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Files</TabsTrigger>
          <TabsTrigger value="shared">Shared Files</TabsTrigger>
          <TabsTrigger value="my-files">My Files</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Files</CardTitle>
              <CardDescription>
                Browse all files in your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileBrowser
                onFileClick={handleFileClick}
                onFolderChange={setCurrentFolder}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shared" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shared Files</CardTitle>
              <CardDescription>
                Files shared across your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileBrowser
                onFileClick={handleFileClick}
                onFolderChange={setCurrentFolder}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="my-files" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>My Files</CardTitle>
              <CardDescription>
                Files uploaded by you
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileBrowser
                onFileClick={handleFileClick}
                onFolderChange={setCurrentFolder}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* File Details Sidebar */}
      {selectedFile && (
        <Card className="fixed right-6 top-20 w-96 shadow-lg">
          <CardHeader>
            <CardTitle className="truncate">{selectedFile.name}</CardTitle>
            <CardDescription>File Details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="font-medium">{selectedFile.mime_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded:</span>
                <span className="font-medium">
                  {new Date(selectedFile.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Module:</span>
                <span className="font-medium">
                  {selectedFile.module_id || 'General'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shared:</span>
                <span className="font-medium">
                  {selectedFile.is_shared ? 'Yes' : 'No'}
                </span>
              </div>
            </div>

            <FileActions
              file={selectedFile}
              onDelete={handleFileDeleted}
              onMove={handleFileMoved}
            />

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setSelectedFile(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
