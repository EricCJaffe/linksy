import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * POST /api/admin/users/[id]/force-reset
 * Forces a password reset email for a specific user (site admin only)
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { id } = params
  const supabase = await createServiceClient()

  // Look up the user's email
  const { data: userData, error: userError } = await supabase.auth.admin.getUserById(id)

  if (userError || !userData?.user?.email) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  const email = userData.user.email
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Send password reset email via Supabase Auth
  const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/update-password`,
  })

  if (resetError) {
    return NextResponse.json({ error: resetError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Password reset email sent to ${email}`,
  })
}
