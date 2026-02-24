import { test, expect } from '@playwright/test'
import { getE2EAdminCredentials, loginAsAdmin } from './helpers/auth'

type InteractionPayload = {
  provider_id?: string
  interaction_type?: string
  session_id?: string
}

test.describe('Referral Workflow', () => {
  test('public flow: crisis check, provider selection, referral request, and interaction tracking', async ({ page }) => {
    let crisisCheckCalls = 0
    let searchCalls = 0
    let ticketRequestBody: Record<string, unknown> | null = null
    const interactions: InteractionPayload[] = []

    await page.route('**/api/need-categories', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      })
    })

    await page.route('**/api/linksy/providers?**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ providers: [] }),
      })
    })

    await page.route('**/api/crisis-keywords/test', async (route) => {
      crisisCheckCalls += 1
      const body = await route.request().postDataJSON()

      expect(body).toMatchObject({
        message: 'I feel unsafe and need emergency shelter',
      })

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          detected: true,
          result: {
            crisis_type: 'domestic_violence',
            severity: 'high',
            response_template: 'You are not alone. Immediate support options are below.',
            emergency_resources: [
              {
                name: 'National Domestic Violence Hotline',
                phone: '800-799-7233',
                url: 'https://www.thehotline.org',
                description: '24/7 confidential support',
              },
            ],
            matched_keyword: 'unsafe',
          },
        }),
      })
    })

    await page.route('**/api/linksy/search', async (route) => {
      searchCalls += 1
      const body = await route.request().postDataJSON()

      expect(body).toMatchObject({
        query: 'I feel unsafe and need emergency shelter',
      })

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          sessionId: 'test-session-1',
          message: 'I found organizations that can help right away.',
          providers: [
            {
              id: 'provider-safe-1',
              name: 'Safe Harbor Center',
              description: 'Emergency shelter and advocacy services.',
              phone: '(555) 111-2222',
              email: 'intake@safeharbor.org',
              website: 'https://safeharbor.example.org',
              hours_of_operation: '24/7',
              sector: 'Human Services',
              referral_type: 'standard',
              referral_instructions: null,
              distance: 2.1,
              primaryLocation: {
                name: 'Main Office',
                address_line1: '100 Main St',
                address_line2: null,
                city: 'Chicago',
                state: 'IL',
                postal_code: '60601',
                latitude: 41.88,
                longitude: -87.63,
              },
              provider_needs: [
                {
                  need: {
                    id: 'need-shelter',
                    name: 'Emergency Shelter',
                  },
                },
              ],
            },
            {
              id: 'provider-safe-2',
              name: 'Hope Family Services',
              description: 'Family stabilization and legal navigation.',
              phone: '(555) 333-4444',
              email: 'support@hopefamily.org',
              website: 'https://hopefamily.example.org',
              hours_of_operation: 'Mon-Fri 8am-6pm',
              sector: 'Nonprofit',
              referral_type: 'contact_directly',
              referral_instructions: 'Call before arriving to confirm bed availability.',
              distance: 4.3,
              primaryLocation: {
                name: 'North Office',
                address_line1: '200 Lake St',
                address_line2: null,
                city: 'Chicago',
                state: 'IL',
                postal_code: '60602',
                latitude: 41.89,
                longitude: -87.62,
              },
              provider_needs: [
                {
                  need: {
                    id: 'need-safety',
                    name: 'Safety Planning',
                  },
                },
              ],
            },
          ],
        }),
      })
    })

    await page.route('**/api/linksy/interactions', async (route) => {
      interactions.push(await route.request().postDataJSON())
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      })
    })

    await page.route('**/api/linksy/tickets', async (route) => {
      ticketRequestBody = await route.request().postDataJSON()
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          ticket_number: 'LINK-20260223-0001',
          message: 'Your referral request has been submitted successfully!',
        }),
      })
    })

    await page.goto('/find-help')

    await page.getByPlaceholder('Describe what you need help with...').fill('I feel unsafe and need emergency shelter')
    await page.getByRole('button', { name: 'Send' }).click()

    await expect(page.getByText('Domestic Violence Resources Available')).toBeVisible()
    await expect(page.getByText('I found organizations that can help right away.')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Safe Harbor Center' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Hope Family Services' })).toBeVisible()

    await page.getByRole('link', { name: '(555) 111-2222' }).click()

    await page
      .locator('div')
      .filter({ hasText: /^Safe Harbor Center/ })
      .getByRole('button', { name: 'Request Referral' })
      .click()

    await expect(page.getByRole('heading', { name: 'Request Referral' })).toBeVisible()

    await page.getByLabel(/Your Name/i).fill('Taylor Example')
    await page.getByLabel(/Phone Number/i).fill('(555) 987-6543')
    await page.getByLabel(/Additional Details/i).fill('Need safe shelter tonight and transportation support.')
    await page.getByRole('button', { name: 'Submit Request' }).click()

    await expect(page.getByRole('heading', { name: 'Request Submitted!' })).toBeVisible()
    await expect(page.getByText(/Reference Number:/i)).toBeVisible()
    await expect(page.getByText('LINK-20260223-0001')).toBeVisible()

    expect(crisisCheckCalls).toBe(1)
    expect(searchCalls).toBe(1)

    expect(ticketRequestBody).toMatchObject({
      provider_id: 'provider-safe-1',
      need_id: 'need-shelter',
      client_name: 'Taylor Example',
      client_phone: '(555) 987-6543',
      description_of_need: 'Need safe shelter tonight and transportation support.',
    })

    expect(interactions).toContainEqual({
      provider_id: 'provider-safe-1',
      interaction_type: 'phone_click',
      session_id: 'test-session-1',
    })
  })

  test('dashboard status update triggers outbound email path (env-gated)', async ({ page }) => {
    const creds = getE2EAdminCredentials()
    const providerId = process.env.E2E_PROVIDER_ID

    test.skip(
      !creds.isConfigured || !providerId,
      'Set E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD, and E2E_PROVIDER_ID to run this test'
    )

    const unique = Date.now().toString()
    const clientName = `E2E Client ${unique}`
    const clientEmail = `e2e-client-${unique}@example.com`
    const clientPhone = '(555) 111-0099'

    await page.goto('/find-help')

    // Create a public referral ticket with a known client email.
    const createdTicket = await page.evaluate(
      async ({ selectedProviderId, selectedClientName, selectedClientEmail, selectedClientPhone }) => {
        const res = await fetch('/api/linksy/tickets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider_id: selectedProviderId,
            client_name: selectedClientName,
            client_email: selectedClientEmail,
            client_phone: selectedClientPhone,
            description_of_need: 'Automated e2e follow-up email path verification.',
          }),
        })

        if (!res.ok) {
          throw new Error(`Ticket creation failed with status ${res.status}`)
        }

        return res.json()
      },
      {
        selectedProviderId: providerId!,
        selectedClientName: clientName,
        selectedClientEmail: clientEmail,
        selectedClientPhone: clientPhone,
      }
    )

    expect(createdTicket.ticket_number).toMatch(/^LINK-/)

    await loginAsAdmin(page)
    await page.goto('/dashboard/tickets')

    await page.getByPlaceholder('Search client name...').fill(clientName)
    await expect(page.getByText(createdTicket.ticket_number)).toBeVisible()

    const detailResponsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'GET' &&
        resp.url().includes('/api/tickets/') &&
        resp.status() === 200
    )

    await page.getByText(createdTicket.ticket_number).click()

    const detailResponse = await detailResponsePromise
    const detailJson = await detailResponse.json()

    // Email notification path in app/api/tickets/[id]/route.ts requires client_email.
    expect(detailJson.client_email).toBe(clientEmail)

    const statusPatchPromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === 'PATCH' &&
        resp.url().includes('/api/tickets/') &&
        resp.status() === 200
    )

    await page.locator('[role=\"combobox\"]').first().click()
    await page.getByRole('option', { name: 'Need Addressed' }).click()

    const statusPatchResponse = await statusPatchPromise
    const patched = await statusPatchResponse.json()
    expect(patched.status).toBe('customer_need_addressed')

    await expect(page.getByText('Need Addressed').first()).toBeVisible()
  })
})
