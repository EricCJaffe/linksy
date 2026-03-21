import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/export/services/pdf
 * Export services/needs taxonomy as a print-friendly HTML page (Save as PDF from browser)
 */
export async function GET() {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: categories, error: catError } = await supabase
    .from('linksy_need_categories')
    .select('id, name, description, airs_code, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }

  const { data: needs, error: needsError } = await supabase
    .from('linksy_needs')
    .select('id, category_id, name, synonyms, is_active')
    .order('name', { ascending: true })

  if (needsError) {
    return NextResponse.json({ error: needsError.message }, { status: 500 })
  }

  // Group needs by category
  const needsByCategory = new Map<string, typeof needs>()
  for (const need of needs || []) {
    const list = needsByCategory.get(need.category_id) || []
    list.push(need)
    needsByCategory.set(need.category_id, list)
  }

  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const totalActiveNeeds = (needs || []).filter((n) => n.is_active).length
  const totalActiveCategories = (categories || []).filter((c) => c.is_active).length

  const categorySections = (categories || [])
    .filter((c) => c.is_active)
    .map((cat) => {
      const catNeeds = (needsByCategory.get(cat.id) || []).filter((n) => n.is_active)
      const needRows = catNeeds
        .map(
          (n) => `
          <tr>
            <td>${escapeHtml(n.name)}</td>
            <td class="synonyms">${(n.synonyms || []).map(escapeHtml).join(', ') || '—'}</td>
          </tr>`
        )
        .join('')

      return `
      <div class="category">
        <div class="category-header">
          <h2>${escapeHtml(cat.name)}${cat.airs_code ? ` <span class="airs-code">${escapeHtml(cat.airs_code)}</span>` : ''}</h2>
          ${cat.description ? `<p class="description">${escapeHtml(cat.description)}</p>` : ''}
          <p class="count">${catNeeds.length} service${catNeeds.length !== 1 ? 's' : ''}</p>
        </div>
        ${
          catNeeds.length > 0
            ? `<table>
            <thead><tr><th>Service / Need</th><th>Also Known As</th></tr></thead>
            <tbody>${needRows}</tbody>
          </table>`
            : '<p class="empty">No active services in this category</p>'
        }
      </div>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Services Taxonomy — Linksy</title>
  <style>
    @media print {
      body { margin: 0; }
      .no-print { display: none !important; }
      .category { page-break-inside: avoid; }
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 24px;
      color: #1a1a1a;
      font-size: 13px;
      line-height: 1.5;
    }
    .header {
      border-bottom: 2px solid #1a1a1a;
      padding-bottom: 12px;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0 0 4px; font-size: 22px; }
    .header p { margin: 0; color: #666; font-size: 12px; }
    .summary {
      display: flex;
      gap: 24px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #666;
    }
    .category { margin-bottom: 20px; }
    .category-header {
      background: #f5f5f5;
      padding: 8px 12px;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .category-header h2 { margin: 0; font-size: 15px; }
    .category-header .description { margin: 2px 0 0; color: #666; font-size: 12px; }
    .category-header .count { margin: 2px 0 0; color: #888; font-size: 11px; }
    .airs-code {
      font-family: monospace;
      font-size: 11px;
      color: #2563eb;
      font-weight: normal;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { text-align: left; padding: 4px 8px; border-bottom: 1px solid #ddd; color: #666; font-weight: 600; }
    td { padding: 4px 8px; border-bottom: 1px solid #eee; }
    .synonyms { color: #666; font-size: 11px; }
    .empty { color: #999; font-style: italic; font-size: 12px; margin: 4px 0; }
    .print-bar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #1a1a1a;
      color: white;
      padding: 10px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 100;
    }
    .print-bar button {
      background: white;
      color: #1a1a1a;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .print-bar button:hover { background: #e5e5e5; }
    .print-spacer { height: 52px; }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <span>Use <strong>Save as PDF</strong> in the print dialog, or print directly.</span>
    <button onclick="window.print()">Print / Save PDF</button>
  </div>
  <div class="print-spacer no-print"></div>

  <div class="header">
    <h1>Services Taxonomy</h1>
    <p>AIRS/211 Standard Categories &amp; Needs — Generated ${escapeHtml(date)}</p>
  </div>

  <div class="summary">
    <span><strong>${totalActiveCategories}</strong> active categories</span>
    <span><strong>${totalActiveNeeds}</strong> active services/needs</span>
  </div>

  ${categorySections}

  <script>
    // Auto-trigger print dialog after a brief delay
    setTimeout(function() { window.print(); }, 600);
  </script>
</body>
</html>`

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
