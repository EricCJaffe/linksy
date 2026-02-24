import { test, expect } from '@playwright/test'

test.describe('Smoke', () => {
  test('landing page renders primary CTA', async ({ page }) => {
    await page.goto('/')

    await expect(
      page.getByRole('heading', { name: /Connect People to the Resources They Need/i })
    ).toBeVisible()

    await expect(
      page.getByRole('link', { name: /Find Resources Near You/i })
    ).toBeVisible()
  })

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: /^Sign In$/i })).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Sign In$/i })).toBeVisible()
  })
})
