import { createClient } from '@/lib/supabase/client'

/**
 * Upload a file to Supabase Storage
 * @param file - The file to upload
 * @param bucket - The storage bucket name
 * @param path - The path within the bucket (will be auto-generated if not provided)
 * @returns The public URL of the uploaded file
 */
export async function uploadFile(
  file: File,
  bucket: string,
  path?: string
): Promise<string> {
  const supabase = createClient()

  // Generate a unique file name if path not provided
  const fileName = path || `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  // Get the public URL
  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Upload an avatar image for a user
 * @param file - The avatar image file
 * @param userId - The user's ID
 * @returns The public URL of the uploaded avatar
 */
export async function uploadAvatar(file: File, userId: string): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  const path = `avatars/${userId}/${Date.now()}-${file.name}`
  return uploadFile(file, 'user-uploads', path)
}

/**
 * Upload a logo image for a tenant
 * @param file - The logo image file
 * @param tenantId - The tenant's ID
 * @returns The public URL of the uploaded logo
 */
export async function uploadLogo(file: File, tenantId: string): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File size must be less than 5MB')
  }

  const path = `logos/${tenantId}/${Date.now()}-${file.name}`
  return uploadFile(file, 'tenant-uploads', path)
}

/**
 * Upload a widget logo image for a host provider
 * @param file - The logo image file
 * @param providerId - The provider's ID
 * @returns The public URL of the uploaded logo
 */
export async function uploadWidgetLogo(file: File, providerId: string): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB')
  }

  const path = `widget-logos/${providerId}/${Date.now()}-${file.name}`
  return uploadFile(file, 'tenant-uploads', path)
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param path - The path to the file
 */
export async function deleteFile(bucket: string, path: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage.from(bucket).remove([path])

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Get the public URL for a file
 * @param bucket - The storage bucket name
 * @param path - The path to the file
 * @returns The public URL
 */
export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient()

  const { data: { publicUrl } } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)

  return publicUrl
}

/**
 * Extract the file path from a Supabase Storage URL
 * @param url - The full public URL
 * @param bucket - The bucket name
 * @returns The file path within the bucket
 */
export function extractPathFromUrl(url: string, bucket: string): string | null {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/storage/v1/object/public/${bucket}/`)
    return pathParts[1] || null
  } catch {
    return null
  }
}
