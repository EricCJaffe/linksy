/**
 * File Type Validation using Magic Bytes
 * Validates file types by checking file signatures instead of relying on client-provided MIME types
 */

// File signatures (magic bytes) for common file types
const FILE_SIGNATURES: Record<
  string,
  { bytes: number[][]; mimeTypes: string[]; extensions: string[] }
> = {
  // Images
  png: {
    bytes: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    mimeTypes: ['image/png'],
    extensions: ['.png'],
  },
  jpg: {
    bytes: [
      [0xff, 0xd8, 0xff, 0xe0],
      [0xff, 0xd8, 0xff, 0xe1],
      [0xff, 0xd8, 0xff, 0xe2],
      [0xff, 0xd8, 0xff, 0xe3],
      [0xff, 0xd8, 0xff, 0xe8],
    ],
    mimeTypes: ['image/jpeg'],
    extensions: ['.jpg', '.jpeg'],
  },
  gif: {
    bytes: [
      [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
      [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
    ],
    mimeTypes: ['image/gif'],
    extensions: ['.gif'],
  },
  webp: {
    bytes: [[0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
    mimeTypes: ['image/webp'],
    extensions: ['.webp'],
  },

  // Documents
  pdf: {
    bytes: [[0x25, 0x50, 0x44, 0x46]],
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
  },
  docx: {
    bytes: [[0x50, 0x4b, 0x03, 0x04]],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['.docx'],
  },
  xlsx: {
    bytes: [[0x50, 0x4b, 0x03, 0x04]],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['.xlsx'],
  },
  pptx: {
    bytes: [[0x50, 0x4b, 0x03, 0x04]],
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['.pptx'],
  },

  // Archives
  zip: {
    bytes: [
      [0x50, 0x4b, 0x03, 0x04],
      [0x50, 0x4b, 0x05, 0x06],
      [0x50, 0x4b, 0x07, 0x08],
    ],
    mimeTypes: ['application/zip'],
    extensions: ['.zip'],
  },

  // Text
  txt: {
    bytes: [], // Text files don't have reliable magic bytes
    mimeTypes: ['text/plain'],
    extensions: ['.txt', '.csv', '.json', '.xml'],
  },

  // Media
  mp4: {
    bytes: [
      [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x1c, 0x66, 0x74, 0x79, 0x70],
      [0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70],
    ],
    mimeTypes: ['video/mp4'],
    extensions: ['.mp4'],
  },
  mp3: {
    bytes: [
      [0x49, 0x44, 0x33],
      [0xff, 0xfb],
    ],
    mimeTypes: ['audio/mpeg'],
    extensions: ['.mp3'],
  },
}

/**
 * Check if the file's magic bytes match expected signature
 */
function checkMagicBytes(
  buffer: Uint8Array,
  signatures: number[][]
): boolean {
  if (signatures.length === 0) return true // Skip check for types without signatures

  return signatures.some((signature) => {
    if (buffer.length < signature.length) return false

    for (let i = 0; i < signature.length; i++) {
      // Skip wildcard bytes (0x00 in signature means any byte is acceptable)
      if (signature[i] !== 0x00 && buffer[i] !== signature[i]) {
        return false
      }
    }
    return true
  })
}

/**
 * Validate file type using magic bytes
 * Returns null if valid, error message if invalid
 */
export async function validateFileType(
  file: File
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  try {
    // Read first 32 bytes for magic byte checking
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer.slice(0, 32))

    // Check against known signatures
    for (const [type, signature] of Object.entries(FILE_SIGNATURES)) {
      if (checkMagicBytes(bytes, signature.bytes)) {
        // Verify the detected type matches allowed extensions
        const fileExtension = file.name
          .toLowerCase()
          .slice(file.name.lastIndexOf('.'))

        if (signature.extensions.includes(fileExtension)) {
          return {
            valid: true,
            detectedType: type,
          }
        }
      }
    }

    // Special handling for text files (no reliable magic bytes)
    const textExtensions = ['.txt', '.csv', '.json', '.xml']
    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))
    if (textExtensions.includes(extension)) {
      // Basic validation: check if content is primarily text
      const text = new TextDecoder('utf-8', { fatal: true })
      try {
        text.decode(arrayBuffer.slice(0, 512))
        return {
          valid: true,
          detectedType: 'txt',
        }
      } catch {
        // Not valid UTF-8 text
      }
    }

    return {
      valid: false,
      error: `Unsupported or invalid file type. File appears to be different from its extension.`,
    }
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Get list of allowed file extensions
 */
export function getAllowedExtensions(): string[] {
  return Object.values(FILE_SIGNATURES).flatMap((sig) => sig.extensions)
}

/**
 * Get list of allowed MIME types
 */
export function getAllowedMimeTypes(): string[] {
  return Object.values(FILE_SIGNATURES).flatMap((sig) => sig.mimeTypes)
}

/**
 * Check if file extension is allowed
 */
export function isExtensionAllowed(filename: string): boolean {
  const extension = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return getAllowedExtensions().includes(extension)
}
