import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

/**
 * GET /api/description-review/respond?token=<uuid>&action=<accept_current|accept_ai>
 *
 * Handles provider responses to description review emails.
 * Token-based auth (no login required for simple accept/reject actions).
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  const action = url.searchParams.get('action')

  if (!token || !action) {
    return buildHtmlResponse(
      'Invalid Request',
      'This link is missing required parameters. Please use the link from your email.',
      'error'
    )
  }

  if (!['accept_current', 'accept_ai'].includes(action)) {
    return buildHtmlResponse(
      'Invalid Action',
      'The action specified is not recognized. Please use the links from your email.',
      'error'
    )
  }

  const supabase = await createServiceClient()

  // Find the review by token
  const { data: review, error: fetchError } = await supabase
    .from('linksy_description_reviews')
    .select('id, provider_id, current_description, ai_suggested_description, status, triggered_at')
    .eq('action_token', token)
    .single()

  if (fetchError || !review) {
    return buildHtmlResponse(
      'Link Not Found',
      'This review link is invalid or has already been used. If you need to make changes, please log in to your dashboard.',
      'error'
    )
  }

  if (review.status !== 'pending') {
    const statusLabels: Record<string, string> = {
      accepted_current: 'You already confirmed no changes were needed.',
      accepted_ai: 'You already accepted the AI-suggested description.',
      edited: 'You already edited the description manually.',
      expired: 'This review link has expired.',
      error: 'There was an error processing this review.',
    }
    return buildHtmlResponse(
      'Already Responded',
      statusLabels[review.status] || 'This review has already been processed.',
      'info'
    )
  }

  // Check expiration (30 days from triggered_at)
  const triggeredAt = new Date(review.triggered_at)
  const expiresAt = new Date(triggeredAt.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (new Date() > expiresAt) {
    await supabase
      .from('linksy_description_reviews')
      .update({ status: 'expired' })
      .eq('id', review.id)

    return buildHtmlResponse(
      'Link Expired',
      'This review link has expired. Please log in to your dashboard to update your description.',
      'error'
    )
  }

  const now = new Date().toISOString()

  if (action === 'accept_current') {
    // Provider confirms current description is fine
    const { error: updateError } = await supabase
      .from('linksy_description_reviews')
      .update({ status: 'accepted_current', responded_at: now })
      .eq('id', review.id)

    if (updateError) {
      logger.error('Failed to update description review', new Error(updateError.message))
      return buildHtmlResponse('Error', 'Something went wrong. Please try again later.', 'error')
    }

    // Update provider's last review date and set next review ~90 days out
    await supabase
      .from('linksy_providers')
      .update({
        last_description_review_at: now,
        next_description_review_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', review.provider_id)

    return buildHtmlResponse(
      'Thank You!',
      'Your description has been confirmed. No changes were made. We\'ll check in again in about 90 days.',
      'success'
    )
  }

  if (action === 'accept_ai') {
    // Provider accepts the AI-suggested description
    if (!review.ai_suggested_description) {
      return buildHtmlResponse(
        'No Suggestion Available',
        'There was no AI suggestion available for this review. Please log in to edit your description manually.',
        'error'
      )
    }

    // Update the provider's description
    const { error: providerError } = await supabase
      .from('linksy_providers')
      .update({
        description: review.ai_suggested_description,
        last_description_review_at: now,
        next_description_review_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', review.provider_id)

    if (providerError) {
      logger.error('Failed to update provider description', new Error(providerError.message))
      return buildHtmlResponse('Error', 'Something went wrong updating your description. Please try again later.', 'error')
    }

    // Mark review as accepted
    const { error: reviewError } = await supabase
      .from('linksy_description_reviews')
      .update({ status: 'accepted_ai', responded_at: now })
      .eq('id', review.id)

    if (reviewError) {
      logger.error('Failed to update description review status', new Error(reviewError.message))
    }

    return buildHtmlResponse(
      'Description Updated!',
      'Your description has been updated with the AI-suggested version. We\'ll check in again in about 90 days.',
      'success'
    )
  }

  return buildHtmlResponse('Invalid Action', 'The action specified is not recognized.', 'error')
}

function buildHtmlResponse(
  title: string,
  message: string,
  type: 'success' | 'error' | 'info'
): NextResponse {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const colors = {
    success: { bg: '#f0fdf4', border: '#22c55e', icon: '&#10003;', iconBg: '#22c55e' },
    error: { bg: '#fef2f2', border: '#ef4444', icon: '&#10007;', iconBg: '#ef4444' },
    info: { bg: '#eff6ff', border: '#3b82f6', icon: 'i', iconBg: '#3b82f6' },
  }
  const c = colors[type]

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${appName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px;">
  <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
    <div style="background: ${c.border}; padding: 20px; text-align: center;">
      <div style="display: inline-block; width: 48px; height: 48px; background: rgba(255,255,255,0.2); border-radius: 50%; line-height: 48px; font-size: 24px; color: white; font-weight: bold;">${c.icon}</div>
    </div>
    <div style="padding: 30px;">
      <h1 style="margin: 0 0 12px; font-size: 22px; color: #333;">${title}</h1>
      <p style="color: #666; line-height: 1.6; margin: 0 0 24px;">${message}</p>
      <a href="${appUrl}/dashboard" style="display: inline-block; background: #333; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px;">Go to Dashboard</a>
    </div>
    <div style="padding: 16px 30px; background: #f9f9f9; border-top: 1px solid #eee; text-align: center;">
      <p style="margin: 0; color: #999; font-size: 12px;">${appName}</p>
    </div>
  </div>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
