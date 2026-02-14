import { createClient } from '@/lib/supabase/client'
import { randomUUID } from 'crypto'

export interface FileMetadata {
  id: string
  name: string
  size: number
  mime_type: string
  storage_path: string
  tenant_id: string
  module_id: string | null
  uploaded_by: string
  is_shared: boolean
  folder_path: string | null
  created_at: string
  updated_at: string
}

export interface UploadFileOptions {
  file: File
  tenantId: string
  moduleId?: string
  isShared?: boolean
  folderPath?: string
  onProgress?: (progress: number) => void
}

export interface ListFilesOptions {
  tenantId: string
  moduleId?: string
  folderPath?: string
  limit?: number
  offset?: number
}

/**
 * Upload a file to Supabase Storage
 * Storage path: /files/{tenant_id}/{module_id}/shared/{filename}
 * or /files/{tenant_id}/{module_id}/{user_id}/{filename}
 */
export async function uploadFile({
  file,
  tenantId,
  moduleId = 'general',
  isShared = false,
  folderPath = '',
  onProgress,
}: UploadFileOptions): Promise<FileMetadata> {
  const supabase = createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('User not authenticated')
  }

  // Generate secure storage path with UUID to prevent path traversal and name collisions
  // Extract file extension safely
  const originalName = file.name || 'file'
  const lastDotIndex = originalName.lastIndexOf('.')
  const extension = lastDotIndex > 0
    ? originalName.slice(lastDotIndex).toLowerCase().slice(0, 10) // Limit extension length
    : ''

  // Validate extension to prevent dangerous file types
  const allowedExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', // Images
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', // Documents
    '.txt', '.csv', '.json', '.xml', // Text files
    '.zip', '.tar', '.gz', // Archives
    '.mp4', '.mp3', '.wav', // Media
  ]

  const sanitizedExtension = allowedExtensions.includes(extension) ? extension : '.bin'

  // Use UUID for filename to prevent any path traversal or name-based attacks
  const fileName = `${randomUUID()}${sanitizedExtension}`

  // Sanitize folder path to prevent path traversal
  let sanitizedFolderPath = ''
  if (folderPath) {
    sanitizedFolderPath = folderPath
      .split('/')
      .filter(segment => segment && segment !== '.' && segment !== '..')
      .map(segment => segment.replace(/[^a-zA-Z0-9_-]/g, '_'))
      .join('/')
  }

  const pathSegments = [
    'files',
    tenantId,
    moduleId,
    isShared ? 'shared' : user.id,
  ]

  if (sanitizedFolderPath) {
    pathSegments.push(sanitizedFolderPath)
  }

  pathSegments.push(fileName)
  const storagePath = pathSegments.join('/')

  // Upload to Supabase Storage
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('files')
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`)
  }

  // Create file metadata record in database
  const { data: fileMetadata, error: metadataError } = await supabase
    .from('files')
    .insert({
      name: file.name, // Keep original name for display purposes
      size: file.size,
      mime_type: file.type,
      storage_path: uploadData.path,
      tenant_id: tenantId,
      module_id: moduleId,
      uploaded_by: user.id,
      is_shared: isShared,
      folder_path: sanitizedFolderPath || null,
    })
    .select()
    .single()

  if (metadataError) {
    // Clean up uploaded file if metadata creation fails
    await supabase.storage.from('files').remove([uploadData.path])
    throw new Error(`Failed to create file metadata: ${metadataError.message}`)
  }

  if (onProgress) {
    onProgress(100)
  }

  return fileMetadata
}

/**
 * Delete a file from storage and database
 */
export async function deleteFile(fileId: string): Promise<void> {
  const supabase = createClient()

  // Get file metadata
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch file metadata: ${fetchError.message}`)
  }

  // Delete from storage
  const { error: storageError } = await supabase.storage
    .from('files')
    .remove([file.storage_path])

  if (storageError) {
    throw new Error(`Failed to delete file from storage: ${storageError.message}`)
  }

  // Delete metadata from database
  const { error: deleteError } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)

  if (deleteError) {
    throw new Error(`Failed to delete file metadata: ${deleteError.message}`)
  }
}

/**
 * Get file metadata and signed URL for download
 */
export async function getFile(fileId: string): Promise<{
  metadata: FileMetadata
  downloadUrl: string
}> {
  const supabase = createClient()

  // Get file metadata
  const { data: metadata, error: fetchError } = await supabase
    .from('files')
    .select('*')
    .eq('id', fileId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch file metadata: ${fetchError.message}`)
  }

  // Generate signed URL (valid for 1 hour)
  const { data: urlData, error: urlError } = await supabase.storage
    .from('files')
    .createSignedUrl(metadata.storage_path, 3600)

  if (urlError) {
    throw new Error(`Failed to generate download URL: ${urlError.message}`)
  }

  return {
    metadata,
    downloadUrl: urlData.signedUrl,
  }
}

/**
 * List files with optional filtering
 */
export async function listFiles({
  tenantId,
  moduleId,
  folderPath,
  limit = 50,
  offset = 0,
}: ListFilesOptions): Promise<{
  files: FileMetadata[]
  total: number
}> {
  const supabase = createClient()

  // Build query
  let query = supabase
    .from('files')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (moduleId) {
    query = query.eq('module_id', moduleId)
  }

  if (folderPath !== undefined) {
    if (folderPath === '') {
      query = query.is('folder_path', null)
    } else {
      query = query.eq('folder_path', folderPath)
    }
  }

  const { data: files, error, count } = await query

  if (error) {
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return {
    files: files || [],
    total: count || 0,
  }
}

/**
 * Move a file to a different folder
 */
export async function moveFile(
  fileId: string,
  newFolderPath: string
): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase
    .from('files')
    .update({ folder_path: newFolderPath || null })
    .eq('id', fileId)

  if (error) {
    throw new Error(`Failed to move file: ${error.message}`)
  }
}

/**
 * Generate a shareable link for a file
 */
export async function createShareLink(
  fileId: string,
  expiresInSeconds: number = 86400 // 24 hours default
): Promise<string> {
  const supabase = createClient()

  // Get file metadata
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path')
    .eq('id', fileId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch file: ${fetchError.message}`)
  }

  // Generate signed URL
  const { data: urlData, error: urlError } = await supabase.storage
    .from('files')
    .createSignedUrl(file.storage_path, expiresInSeconds)

  if (urlError) {
    throw new Error(`Failed to create share link: ${urlError.message}`)
  }

  return urlData.signedUrl
}

/**
 * Get file preview URL (for images and PDFs)
 */
export async function getFilePreview(fileId: string): Promise<string | null> {
  const supabase = createClient()

  // Get file metadata
  const { data: file, error: fetchError } = await supabase
    .from('files')
    .select('storage_path, mime_type')
    .eq('id', fileId)
    .single()

  if (fetchError) {
    throw new Error(`Failed to fetch file: ${fetchError.message}`)
  }

  // Only generate preview for supported types
  const supportedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
  ]

  if (!supportedTypes.includes(file.mime_type)) {
    return null
  }

  // Get public URL or signed URL
  const { data: urlData } = await supabase.storage
    .from('files')
    .createSignedUrl(file.storage_path, 3600)

  return urlData?.signedUrl || null
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎥'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType === 'application/pdf') return '📄'
  if (
    mimeType.includes('spreadsheet') ||
    mimeType.includes('excel') ||
    mimeType.includes('csv')
  )
    return '📊'
  if (
    mimeType.includes('document') ||
    mimeType.includes('word') ||
    mimeType.includes('text')
  )
    return '📝'
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return '🗜️'
  return '📁'
}
