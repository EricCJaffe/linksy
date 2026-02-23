'use client'

import { useState } from 'react'
import { useNeedCategories } from '@/lib/hooks/useProviders'
import {
  useCreateCategory,
  useUpdateCategory,
  useCreateNeed,
  useUpdateNeed,
} from '@/lib/hooks/useNeeds'
import { NeedFormDialog } from '@/components/needs/need-form-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import type { NeedCategory, Need } from '@/lib/types/linksy'

export default function NeedsPage() {
  const { data: categories, isLoading } = useNeedCategories()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const createNeed = useCreateNeed()
  const updateNeed = useUpdateNeed()

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<'category' | 'need'>('category')
  const [editItem, setEditItem] = useState<any>(null)
  const [showInactive, setShowInactive] = useState(false)

  function toggleCategory(id: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAddCategory() {
    setDialogMode('category')
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEditCategory(cat: NeedCategory) {
    setDialogMode('category')
    setEditItem(cat)
    setDialogOpen(true)
  }

  function openAddNeed() {
    setDialogMode('need')
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEditNeed(need: Need) {
    setDialogMode('need')
    setEditItem(need)
    setDialogOpen(true)
  }

  async function handleReorder(cat: NeedCategory, direction: 'up' | 'down') {
    if (!categories) return
    const sorted = [...categories].sort((a, b) => a.sort_order - b.sort_order)
    const idx = sorted.findIndex((c) => c.id === cat.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const current = sorted[idx]
    const swap = sorted[swapIdx]
    await Promise.all([
      updateCategory.mutateAsync({ id: current.id, sort_order: swap.sort_order }),
      updateCategory.mutateAsync({ id: swap.id, sort_order: current.sort_order }),
    ])
  }

  function handleSubmit(data: any) {
    const { id, ...rest } = data
    let promise: Promise<any>

    if (dialogMode === 'category') {
      promise = id
        ? updateCategory.mutateAsync({ id, ...rest })
        : createCategory.mutateAsync(rest)
    } else {
      promise = id
        ? updateNeed.mutateAsync({ id, ...rest })
        : createNeed.mutateAsync(rest)
    }

    promise.then(() => setDialogOpen(false))
  }

  const isMutating =
    createCategory.isPending ||
    updateCategory.isPending ||
    createNeed.isPending ||
    updateNeed.isPending

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  const allCategories = categories || []
  const activeCategoryCount = allCategories.filter((c) => c.is_active).length
  const inactiveCategoryCount = allCategories.length - activeCategoryCount
  const visibleCategories = showInactive
    ? allCategories
    : allCategories.filter((c) => c.is_active)
  const sorted = [...visibleCategories].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Needs Taxonomy</h1>
          <p className="text-sm text-muted-foreground">
            AIRS/211 standard categories — 17 categories, aligned to industry taxonomy
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 rounded-md border px-3 py-1.5">
            <Switch id="show-inactive-categories" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive-categories" className="text-sm">
              Show inactive
            </Label>
          </div>
          <Button variant="outline" onClick={openAddCategory}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
          <Button onClick={openAddNeed}>
            <Plus className="mr-2 h-4 w-4" />
            Add Need
          </Button>
        </div>
      </div>

      {!showInactive && inactiveCategoryCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {activeCategoryCount} active categories. {inactiveCategoryCount} inactive categories are hidden.
        </p>
      )}

      <div className="space-y-3">
        {sorted.map((cat, idx) => {
          const isExpanded = expandedCategories.has(cat.id)
          const needs = cat.needs || []
          const activeNeeds = needs.filter((n) => n.is_active)
          const inactiveNeeds = needs.filter((n) => !n.is_active)

          return (
            <Card key={cat.id} className={!cat.is_active ? 'opacity-60' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCategory(cat.id)}
                    className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  <div className="flex-1">
                    <CardTitle className="text-base">{cat.name}</CardTitle>
                    {cat.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>

                  {cat.airs_code && (
                    <Badge variant="outline" className="font-mono text-xs text-blue-600 border-blue-200">
                      {cat.airs_code}
                    </Badge>
                  )}

                  <Badge variant={cat.is_active ? 'default' : 'secondary'}>
                    {cat.is_active ? 'Active' : 'Inactive'}
                  </Badge>

                  <Badge variant="outline">
                    {activeNeeds.length} need{activeNeeds.length !== 1 ? 's' : ''}
                  </Badge>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleReorder(cat, 'up')}
                      disabled={idx === 0 || isMutating}
                    >
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleReorder(cat, 'down')}
                      disabled={idx === sorted.length - 1 || isMutating}
                    >
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEditCategory(cat)}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent>
                  {needs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No needs in this category</p>
                  ) : (
                    <div className="space-y-2">
                      {activeNeeds.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {activeNeeds.map((need) => (
                            <button
                              key={need.id}
                              onClick={() => openEditNeed(need)}
                              className="group inline-flex items-center gap-1 rounded-md border bg-background px-2.5 py-1 text-sm hover:border-primary hover:bg-accent"
                            >
                              {need.name}
                              {(need.synonyms?.length ?? 0) > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({need.synonyms!.length})
                                </span>
                              )}
                              <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                            </button>
                          ))}
                        </div>
                      )}

                      {inactiveNeeds.length > 0 && (
                        <div>
                          <p className="mb-1 text-xs text-muted-foreground">Inactive</p>
                          <div className="flex flex-wrap gap-2">
                            {inactiveNeeds.map((need) => (
                              <button
                                key={need.id}
                                onClick={() => openEditNeed(need)}
                                className="group inline-flex items-center gap-1 rounded-md border border-dashed bg-background px-2.5 py-1 text-sm text-muted-foreground hover:border-primary hover:bg-accent"
                              >
                                {need.name}
                                <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-100" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      <NeedFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        editItem={editItem}
        categories={(categories || []).filter((c) => c.is_active)}
        onSubmit={handleSubmit}
        isLoading={isMutating}
      />
    </div>
  )
}
