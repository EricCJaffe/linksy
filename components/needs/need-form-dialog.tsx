'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Category {
  id: string
  name: string
  description: string | null
  airs_code: string | null
  is_active: boolean
}

interface Need {
  id: string
  name: string
  category_id: string
  synonyms: string[]
  is_active: boolean
}

interface NeedFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'category' | 'need'
  editItem?: Category | Need | null
  categories?: Category[]
  onSubmit: (data: any) => void
  isLoading?: boolean
}

export function NeedFormDialog({
  open,
  onOpenChange,
  mode,
  editItem,
  categories,
  onSubmit,
  isLoading,
}: NeedFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [airsCode, setAirsCode] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [synonymsText, setSynonymsText] = useState('')

  const isEditing = !!editItem

  useEffect(() => {
    if (editItem) {
      setName(editItem.name)
      setIsActive(editItem.is_active)
      if (mode === 'category') {
        setDescription((editItem as Category).description || '')
        setAirsCode((editItem as Category).airs_code || '')
      }
      if (mode === 'need' && 'category_id' in editItem) {
        setCategoryId(editItem.category_id)
        setSynonymsText((editItem.synonyms || []).join(', '))
      }
    } else {
      setName('')
      setDescription('')
      setAirsCode('')
      setIsActive(true)
      setCategoryId('')
      setSynonymsText('')
    }
  }, [editItem, mode, open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (mode === 'category') {
      const data: any = { name, description: description || null, airs_code: airsCode || null, is_active: isActive }
      if (isEditing) data.id = editItem!.id
      onSubmit(data)
    } else {
      const synonyms = synonymsText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const data: any = { name, category_id: categoryId, synonyms, is_active: isActive }
      if (isEditing) data.id = editItem!.id
      onSubmit(data)
    }
  }

  const title = isEditing
    ? `Edit ${mode === 'category' ? 'Category' : 'Need'}`
    : `Add ${mode === 'category' ? 'Category' : 'Need'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {mode === 'category' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="airs_code">AIRS Code</Label>
                <Input
                  id="airs_code"
                  value={airsCode}
                  onChange={(e) => setAirsCode(e.target.value)}
                  placeholder="e.g. AIRS-HOU"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="AIRS/211 standard category description"
                  rows={3}
                />
              </div>
            </>
          )}

          {mode === 'need' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories || []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span>{cat.name}</span>
                        {cat.airs_code && (
                          <span className="ml-2 font-mono text-xs text-muted-foreground">
                            {cat.airs_code}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="synonyms">Synonyms (comma-separated)</Label>
                <Textarea
                  id="synonyms"
                  value={synonymsText}
                  onChange={(e) => setSynonymsText(e.target.value)}
                  placeholder="e.g. housing assistance, shelter, temporary housing"
                  rows={3}
                />
              </div>
            </>
          )}

          {isEditing && (
            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : isEditing ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
