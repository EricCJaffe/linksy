import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { logger } from '@/lib/utils/logger'
import { requireAuth, requireSiteAdmin } from '@/lib/middleware/auth'

// Validation schemas
const createModuleSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  slug: z.string()
    .min(1, 'Slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
})

const updateModuleSchema = z.object({
  id: z.string().uuid('Invalid module ID'),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().max(50).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(500).optional().nullable(),
  is_active: z.boolean().optional(),
})

export async function GET() {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()

  const { data: modules, error: queryError } = await supabase
    .from('modules')
    .select('*')
    .order('name')

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(modules)
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const serviceClient = await createServiceClient()

  try {
    const body = await request.json()
    const validation = createModuleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { name, slug, description } = validation.data

    const { data: module, error: insertError } = await serviceClient
      .from('modules')
      .insert({
        name,
        slug,
        description: description || null,
        is_active: true,
      })
      .select()
      .single<any>()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(module, { status: 201 })
  } catch (error) {
    logger.apiError('/api/modules', 'POST', error instanceof Error ? error : new Error('Unknown error'))
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    )
  }
}

export async function PATCH(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const serviceClient = await createServiceClient()

  try {
    const body = await request.json()
    const validation = updateModuleSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { id, ...updates } = validation.data

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    )

    if (Object.keys(cleanUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    const { data: module, error: updateError } = await serviceClient
      .from('modules')
      .update(cleanUpdates)
      .eq('id', id)
      .select()
      .single<any>()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json(module)
  } catch (error) {
    logger.apiError('/api/modules', 'PATCH', error instanceof Error ? error : new Error('Unknown error'))
    return NextResponse.json(
      { error: 'Invalid request data' },
      { status: 400 }
    )
  }
}
