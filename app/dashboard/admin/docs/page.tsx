'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDocs, useCreateDoc, useUpdateDoc, useDeleteDoc } from '@/lib/hooks/useDocs'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import type { Doc, DocRole } from '@/lib/types/linksy'

const ROLE_OPTIONS: { value: DocRole; label: string }[] = [
  { value: 'user', label: 'All Users' },
  { value: 'provider_employee', label: 'Provider Staff & Above' },
  { value: 'tenant_admin', label: 'Tenant Admins & Above' },
  { value: 'site_admin', label: 'Site Admins Only' },
]

const ROLE_VARIANT: Record<DocRole, 'secondary' | 'outline' | 'default' | 'destructive'> = {
  user: 'secondary',
  provider_employee: 'outline',
  tenant_admin: 'default',
  site_admin: 'destructive',
}

interface DocFormData {
  title: string
  slug: string
  category: string
  min_role: DocRole
  excerpt: string
  content: string
  is_published: boolean
  sort_order: number
}

const EMPTY_FORM: DocFormData = {
  title: '',
  slug: '',
  category: '',
  min_role: 'user',
  excerpt: '',
  content: '',
  is_published: true,
  sort_order: 0,
}

function slugify(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

export default function AdminDocsPage() {
  const { data, isLoading } = useDocs()
  const createDoc = useCreateDoc()
  const updateDoc = useUpdateDoc()
  const deleteDoc = useDeleteDoc()

  const docs = data?.docs || []

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<Doc | null>(null)
  const [form, setForm] = useState<DocFormData>(EMPTY_FORM)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function openCreate() {
    setEditingDoc(null)
    setForm(EMPTY_FORM)
    setError('')
    setDialogOpen(true)
  }

  function openEdit(doc: Doc) {
    setEditingDoc(doc)
    setForm({
      title: doc.title,
      slug: doc.slug,
      category: doc.category,
      min_role: doc.min_role,
      excerpt: doc.excerpt || '',
      content: doc.content,
      is_published: doc.is_published,
      sort_order: doc.sort_order,
    })
    setError('')
    setDialogOpen(true)
  }

  function handleTitleChange(title: string) {
    setForm((f) => ({
      ...f,
      title,
      slug: editingDoc ? f.slug : slugify(title),
    }))
  }

  async function handleSave() {
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    setError('')
    try {
      if (editingDoc) {
        await updateDoc.mutateAsync({
          slug: editingDoc.slug,
          title: form.title,
          category: form.category,
          min_role: form.min_role,
          excerpt: form.excerpt || null,
          content: form.content,
          is_published: form.is_published,
          sort_order: form.sort_order,
        })
      } else {
        await createDoc.mutateAsync(form)
      }
      setDialogOpen(false)
    } catch (e: any) {
      setError(e.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  async function handleTogglePublished(doc: Doc) {
    await updateDoc.mutateAsync({ slug: doc.slug, is_published: !doc.is_published })
  }

  async function handleDelete(slug: string) {
    await deleteDoc.mutateAsync(slug)
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Docs Manager</h1>
          <p className="text-muted-foreground mt-1">
            Create and edit knowledge base articles.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          New Doc
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : docs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
          <p>No docs yet. Create your first article.</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Title</th>
                <th className="px-4 py-3 text-left font-medium">Category</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Published</th>
                <th className="px-4 py-3 text-left font-medium">Order</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{doc.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.category}</td>
                  <td className="px-4 py-3">
                    <Badge variant={ROLE_VARIANT[doc.min_role]}>
                      {ROLE_OPTIONS.find((r) => r.value === doc.min_role)?.label || doc.min_role}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleTogglePublished(doc)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                      title={doc.is_published ? 'Published — click to unpublish' : 'Draft — click to publish'}
                    >
                      {doc.is_published ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      <span className="text-xs">{doc.is_published ? 'Published' : 'Draft'}</span>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{doc.sort_order}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(doc)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteConfirm(doc.slug)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Edit Doc' : 'New Doc'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="Article title"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="auto-generated"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="e.g. Getting Started"
                />
              </div>

              <div className="space-y-1">
                <Label>Min Role</Label>
                <Select
                  value={form.min_role}
                  onValueChange={(v) => setForm((f) => ({ ...f, min_role: v as DocRole }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="sort_order">Sort Order</Label>
                <Input
                  id="sort_order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))}
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="excerpt">Excerpt</Label>
                <textarea
                  id="excerpt"
                  className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-y"
                  value={form.excerpt}
                  onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
                  placeholder="Short summary shown in card view (optional)"
                />
              </div>

              <div className="col-span-2 space-y-1">
                <Label htmlFor="content">Content</Label>
                <RichTextEditor
                  value={form.content}
                  onChange={(html) => setForm((f) => ({ ...f, content: html }))}
                  placeholder="Write your article content..."
                />
              </div>

              <div className="col-span-2 flex items-center gap-3">
                <Switch
                  id="published"
                  checked={form.is_published}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
                />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editingDoc ? 'Save Changes' : 'Create Doc'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this article? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
              disabled={deleteDoc.isPending}
            >
              {deleteDoc.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
