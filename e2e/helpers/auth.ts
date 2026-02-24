import { expect, type Page } from '@playwright/test'

export function getE2EAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  return {
    email,
    password,
    isConfigured: Boolean(email && password),
  }
}

export async function loginAsAdmin(page: Page) {
  const { email, password, isConfigured } = getE2EAdminCredentials()

  if (!isConfigured) {
    throw new Error('E2E admin credentials are not configured')
  }

  await page.goto('/login')

  await page.getByLabel('Email').fill(email!)
  await page.getByLabel('Password').fill(password!)
  await page.getByRole('button', { name: /^Sign In$/i }).click()

  await page.waitForURL('**/dashboard**')
  await expect(page).toHaveURL(/\/dashboard/)
}
