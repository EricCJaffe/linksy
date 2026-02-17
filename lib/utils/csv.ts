/**
 * Convert an array of objects to CSV format
 */
export function convertToCSV<T extends Record<string, any>>(
  data: T[],
  columns: { key: keyof T; header: string }[]
): string {
  if (data.length === 0) return ''

  // Create header row
  const headers = columns.map(col => col.header).join(',')

  // Create data rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key]

      // Handle null/undefined
      if (value === null || value === undefined) return ''

      // Handle dates
      if (value instanceof Date) {
        return value.toISOString()
      }

      // Handle objects/arrays (stringify them)
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`
      }

      // Escape quotes and wrap in quotes if contains comma, newline, or quote
      const stringValue = String(value)
      if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }

      return stringValue
    }).join(',')
  })

  return [headers, ...rows].join('\n')
}

/**
 * Trigger a CSV download in the browser
 */
export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
