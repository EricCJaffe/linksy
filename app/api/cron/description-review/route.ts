import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'
import { logger } from '@/lib/utils/logger'
import OpenAI from 'openai'

/**
 * POST /api/cron/description-review
 *
 * Quarterly cron job that:
 * 1. Finds active providers due for description review
 * 2. Scrapes their website for current info via OpenAI
 * 3. Compares against existing description
 * 4. Sends review email to primary contact
 *
 * Protected by CRON_SECRET header (Vercel cron authentication).
 * Can also be triggered manually by site admins via POST with { provider_ids: [...] }.
 */
export const maxDuration = 300 // 5 minutes for batch processing

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

export async function POST(request: Request) {
  // Verify cron secret or admin auth
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const body = await request.json().catch(() => ({}))
  const manualProviderIds: string[] | undefined = body.provider_ids
  const batchId = crypto.randomUUID()

  // Determine which providers need review
  let providers
  if (manualProviderIds && manualProviderIds.length > 0) {
    // Manual trigger for specific providers
    const { data, error } = await supabase
      .from('linksy_providers')
      .select('id, name, description, website, email')
      .in('id', manualProviderIds)
      .eq('is_active', true)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    providers = data
  } else {
    // Cron: find providers due for review
    // Either next_description_review_at <= now, or no review date and last review > 90 days ago (or never reviewed)
    const now = new Date().toISOString()
    const { data, error } = await supabase
      .from('linksy_providers')
      .select('id, name, description, website, email')
      .eq('is_active', true)
      .eq('is_frozen', false)
      .not('website', 'is', null)
      .or(`next_description_review_at.lte.${now},and(next_description_review_at.is.null,or(last_description_review_at.is.null,last_description_review_at.lte.${new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()}))`)

    if (error) {
      logger.error('Failed to fetch providers for description review', new Error(error.message))
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    providers = data
  }

  if (!providers || providers.length === 0) {
    return NextResponse.json({ processed: 0, message: 'No providers due for review.' })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const supportEmail = process.env.SMTP_FROM_EMAIL || 'support@linksy.app'

  // Load email template from DB
  const { data: templateRow } = await supabase
    .from('linksy_email_templates')
    .select('subject_template, html_template, text_template, is_active')
    .eq('template_key', 'description_review')
    .eq('is_active', true)
    .maybeSingle()

  const results = {
    processed: 0,
    emailed: 0,
    skipped: 0,
    errors: 0,
  }

  for (const provider of providers) {
    try {
      // Skip providers without a website
      if (!provider.website) {
        results.skipped++
        continue
      }

      // Generate AI description from website
      const aiDescription = await scanWebsiteForDescription(provider.website, provider.name)

      // Find primary contact with email
      const { data: contacts } = await supabase
        .from('linksy_provider_contacts')
        .select('id, user_id, is_primary_contact, phone, users:user_id(email, full_name)')
        .eq('provider_id', provider.id)
        .eq('status', 'active')
        .order('is_primary_contact', { ascending: false })
        .limit(5)

      // Find a contact with an email
      type ContactRow = {
        id: string
        user_id: string | null
        is_primary_contact: boolean
        phone: string | null
        users: { email: string; full_name: string | null } | null
      }
      const contactWithEmail = (contacts as ContactRow[] | null)?.find(
        (c) => c.users?.email
      )

      const recipientEmail = contactWithEmail?.users?.email || provider.email
      const contactName = contactWithEmail?.users?.full_name || 'Provider Administrator'

      if (!recipientEmail) {
        // Create review record with error
        await supabase.from('linksy_description_reviews').insert({
          provider_id: provider.id,
          current_description: provider.description,
          ai_suggested_description: aiDescription,
          status: 'error',
          error_message: 'No email address found for provider contact',
          triggered_by: manualProviderIds ? 'manual' : 'cron',
          batch_id: batchId,
        })
        results.skipped++
        continue
      }

      // Create review record
      const { data: review, error: reviewError } = await supabase
        .from('linksy_description_reviews')
        .insert({
          provider_id: provider.id,
          current_description: provider.description,
          ai_suggested_description: aiDescription,
          status: aiDescription ? 'pending' : 'error',
          error_message: aiDescription ? null : 'Failed to generate AI description',
          triggered_by: manualProviderIds ? 'manual' : 'cron',
          batch_id: batchId,
        })
        .select('id, action_token')
        .single()

      if (reviewError || !review) {
        logger.error('Failed to create description review record', new Error(reviewError?.message || 'Unknown error'))
        results.errors++
        continue
      }

      if (!aiDescription) {
        results.errors++
        continue
      }

      // Build action URLs
      const baseActionUrl = `${appUrl}/api/description-review/respond`
      const acceptCurrentUrl = `${baseActionUrl}?token=${review.action_token}&action=accept_current`
      const acceptAiUrl = `${baseActionUrl}?token=${review.action_token}&action=accept_ai`
      const editUrl = `${appUrl}/dashboard/providers/${provider.id}?tab=details&review=${review.id}`

      // Render email
      const variables: Record<string, string> = {
        app_name: appName,
        contact_name: contactName,
        provider_name: provider.name,
        current_description: provider.description || '(No description on file)',
        ai_suggested_description: aiDescription,
        accept_current_url: acceptCurrentUrl,
        accept_ai_url: acceptAiUrl,
        edit_url: editUrl,
        support_email: supportEmail,
      }

      let subject: string
      let html: string
      let text: string | undefined

      if (templateRow) {
        subject = renderTemplate(templateRow.subject_template, variables)
        html = renderTemplate(templateRow.html_template, variables)
        text = templateRow.text_template ? renderTemplate(templateRow.text_template, variables) : undefined
      } else {
        // Fallback if template not in DB
        subject = `Action Required: Please Review Your ${provider.name} Description`
        html = buildFallbackHtml(variables)
        text = undefined
      }

      const emailResult = await sendEmail({
        to: recipientEmail,
        subject,
        html,
        text,
      })

      if (emailResult.success) {
        results.emailed++
      } else {
        logger.warn('Failed to send description review email', {
          providerId: provider.id,
          email: recipientEmail,
          error: emailResult.error,
        })
      }

      results.processed++
    } catch (error) {
      logger.error(
        `Description review failed for provider ${provider.id}`,
        error instanceof Error ? error : new Error('Unknown error')
      )
      results.errors++
    }
  }

  logger.info('Description review cron completed', results)
  return NextResponse.json(results)
}

function renderTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? '')
}

async function scanWebsiteForDescription(
  websiteUrl: string,
  providerName: string
): Promise<string | null> {
  try {
    const openai = getOpenAI()

    // Use GPT to generate a description based on the website URL
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a community resource specialist. Given a provider's website URL and name, generate a concise, accurate description of their services suitable for a community resource directory. Focus on:
- What services they provide
- Who they serve (target population)
- Key programs or offerings
- Any eligibility requirements or service area info

Keep the description between 2-4 paragraphs. Be factual and professional. Do not include contact information, addresses, or phone numbers in the description.`,
        },
        {
          role: 'user',
          content: `Generate a current description for "${providerName}" based on their website: ${websiteUrl}

Please provide an up-to-date description of their services and offerings.`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
    })

    return completion.choices[0]?.message?.content?.trim() || null
  } catch (error) {
    logger.warn('Failed to scan website for provider description', {
      websiteUrl,
      providerName,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}

function buildFallbackHtml(variables: Record<string, string>): string {
  return `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #333;">Hello ${variables.contact_name},</h2>
<p>As part of our quarterly review process, we've compared your current provider description in our system with information found on your website. Please review the details below.</p>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Your Current Description</h3>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">${variables.current_description}</p>
</div>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">AI-Suggested Description (from your website)</h3>
<div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">${variables.ai_suggested_description}</p>
</div>

<div style="margin: 20px 0;">
<a href="${variables.accept_current_url}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px;">No Changes Needed</a>
<a href="${variables.accept_ai_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px;">Use AI Suggestion</a>
<a href="${variables.edit_url}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none;">Log In & Edit</a>
</div>

<p style="color: #999; font-size: 12px;">Sent by ${variables.app_name}</p>
</div>`
}
