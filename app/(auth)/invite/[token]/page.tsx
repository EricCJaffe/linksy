import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteAcceptForm } from '@/components/auth/invite-accept-form'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface InvitePageProps {
  params: {
    token: string
  }
}

interface Invitation {
  id: string
  email: string
  role: string
  tenant_id: string
  accepted_at: string | null
  expires_at: string | null
}

type InvitationResult =
  | { invitation: Invitation; error?: never }
  | { error: string; invitation?: never }

async function getInvitation(token: string): Promise<InvitationResult> {
  const supabase = await createClient()

  // Query the invitations table to validate the token
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select('id, email, role, tenant_id, accepted_at, expires_at')
    .eq('token', token)
    .single<Invitation>()

  if (error || !invitation) {
    return { error: 'Invalid invitation link' }
  }

  // Check if invitation is already accepted
  if (invitation.accepted_at) {
    return { error: 'This invitation has already been accepted' }
  }

  // Check if invitation has expired
  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return { error: 'This invitation has expired' }
  }

  return { invitation }
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token } = params
  const { invitation, error } = await getInvitation(token)

  // Check if user is already logged in
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  if (error || !invitation) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Invalid Invitation</CardTitle>
          <CardDescription className="text-destructive">
            {error}
          </CardDescription>
        </CardHeader>
        <div className="p-6">
          <Link href="/login">
            <Button variant="outline" className="w-full">
              Go to Login
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  return <InviteAcceptForm token={token} email={invitation.email} />
}
