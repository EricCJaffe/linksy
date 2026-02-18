import { describe, it, expect } from 'vitest'
import { convertToCSV } from '@/lib/utils/csv'

const columns = [
  { key: 'name' as const, header: 'Name' },
  { key: 'email' as const, header: 'Email' },
  { key: 'age' as const, header: 'Age' },
]

describe('convertToCSV', () => {
  it('returns empty string for empty data array', () => {
    expect(convertToCSV([], columns)).toBe('')
  })

  it('produces a header row and a data row', () => {
    const result = convertToCSV(
      [{ name: 'Alice', email: 'alice@example.com', age: 30 }],
      columns
    )
    const lines = result.split('\n')
    expect(lines[0]).toBe('Name,Email,Age')
    expect(lines[1]).toBe('Alice,alice@example.com,30')
  })

  it('produces multiple data rows in correct order', () => {
    const data = [
      { name: 'Alice', email: 'alice@example.com', age: 30 },
      { name: 'Bob', email: 'bob@example.com', age: 25 },
    ]
    const lines = convertToCSV(data, columns).split('\n')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain('Alice')
    expect(lines[2]).toContain('Bob')
  })

  it('wraps values containing commas in double quotes', () => {
    const result = convertToCSV(
      [{ name: 'Smith, John', email: 'j@example.com', age: 40 }],
      columns
    )
    expect(result).toContain('"Smith, John"')
  })

  it('escapes double-quote characters by doubling them', () => {
    const result = convertToCSV(
      [{ name: 'Say "Hello"', email: 'h@example.com', age: 1 }],
      columns
    )
    expect(result).toContain('"Say ""Hello"""')
  })

  it('wraps values containing newlines in double quotes', () => {
    const result = convertToCSV(
      [{ name: 'Line1\nLine2', email: 'x@example.com', age: 0 }],
      columns
    )
    expect(result).toContain('"Line1\nLine2"')
  })

  it('renders null and undefined values as empty strings', () => {
    const data = [{ name: null as any, email: undefined as any, age: 5 }]
    const lines = convertToCSV(data, columns).split('\n')
    expect(lines[1]).toBe(',,5')
  })

  it('serialises Date values as ISO strings', () => {
    const dt = new Date('2024-01-15T10:00:00.000Z')
    const dtColumns = [{ key: 'created_at' as const, header: 'Created At' }]
    const result = convertToCSV([{ created_at: dt }], dtColumns)
    expect(result).toContain(dt.toISOString())
  })

  it('JSON-stringifies object values and doubles inner quotes per CSV spec', () => {
    const objColumns = [{ key: 'meta' as const, header: 'Meta' }]
    const result = convertToCSV([{ meta: { a: 1 } }], objColumns)
    // JSON.stringify produces {"a":1}; CSV wrapping doubles the inner quotes → "{""a"":1}"
    expect(result).toContain('"{""a"":1}"')
  })

  it('only outputs columns specified in the columns array', () => {
    const partialColumns = [{ key: 'name' as const, header: 'Name' }]
    const result = convertToCSV(
      [{ name: 'Alice', email: 'alice@example.com', age: 30 }],
      partialColumns
    )
    expect(result).not.toContain('Email')
    expect(result).not.toContain('alice@example.com')
    expect(result).toContain('Name')
    expect(result).toContain('Alice')
  })
})
