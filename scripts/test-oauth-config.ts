#!/usr/bin/env tsx
/**
 * OAuth Configuration Validator
 *
 * Checks if Microsoft OAuth is properly configured.
 *
 * Usage: npx tsx scripts/test-oauth-config.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local
dotenv.config({ path: join(__dirname, '../.env.local') })

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
]

console.log('🔍 Validating OAuth Configuration...\n')

// Check environment variables
console.log('1️⃣ Checking Environment Variables:')
let allEnvVarsPresent = true
for (const envVar of requiredEnvVars) {
  const value = process.env[envVar]
  if (!value) {
    console.log(`   ❌ ${envVar} - Missing`)
    allEnvVarsPresent = false
  } else {
    // Mask sensitive values
    const masked = envVar.includes('KEY')
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value
    console.log(`   ✅ ${envVar} - ${masked}`)
  }
}

if (!allEnvVarsPresent) {
  console.log('\n❌ Missing required environment variables. Please check your .env.local file.\n')
  process.exit(1)
}

console.log()

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Check if we can connect to Supabase
console.log('2️⃣ Testing Supabase Connection:')
try {
  const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
  if (error) throw error
  console.log('   ✅ Successfully connected to Supabase\n')
} catch (error) {
  console.log('   ❌ Failed to connect to Supabase')
  console.log(`   Error: ${error instanceof Error ? error.message : 'Unknown error'}\n`)
  process.exit(1)
}

// Check middleware configuration
console.log('3️⃣ Checking Middleware Configuration:')
try {
  const middlewarePath = join(__dirname, '../middleware.ts')
  const { readFileSync } = await import('fs')
  const middlewareContent = readFileSync(middlewarePath, 'utf-8')

  if (middlewareContent.includes("'/auth/callback'")) {
    console.log('   ✅ /auth/callback is in public routes\n')
  } else {
    console.log('   ❌ /auth/callback not found in public routes')
    console.log('   → Add "/auth/callback" to publicRoutes array in middleware.ts\n')
  }
} catch (error) {
  console.log('   ⚠️  Could not verify middleware configuration\n')
}

// Check callback route exists
console.log('4️⃣ Checking Auth Callback Route:')
try {
  const callbackPath = join(__dirname, '../app/auth/callback/route.ts')
  const { existsSync } = await import('fs')
  if (existsSync(callbackPath)) {
    console.log('   ✅ Auth callback route exists at /app/auth/callback/route.ts\n')
  } else {
    console.log('   ❌ Auth callback route not found\n')
  }
} catch (error) {
  console.log('   ⚠️  Could not verify callback route\n')
}

// Provide setup instructions
console.log('5️⃣ Next Steps:\n')
console.log('   📋 Complete these steps in order:\n')
console.log('   1. Azure AD App Registration:')
console.log('      → Go to https://portal.azure.com → Azure Active Directory → App registrations')
console.log('      → Create new registration (or use existing)')
console.log('      → Note your Application (client) ID\n')

console.log('   2. Configure Redirect URIs in Azure:')
console.log(`      → Add: https://YOUR_PROJECT.supabase.co/auth/v1/callback`)
console.log(`      → Add: http://localhost:54321/auth/v1/callback (for local Supabase)`)
console.log('      → Enable ID tokens checkbox\n')

console.log('   3. Create Client Secret in Azure:')
console.log('      → Certificates & secrets → New client secret')
console.log('      → Copy the VALUE (not the Secret ID!)\n')

console.log('   4. Configure Supabase:')
console.log('      → Go to your Supabase project → Authentication → Providers → Azure')
console.log('      → Enable Azure provider')
console.log('      → Enter Client ID from step 1')
console.log('      → Enter Client Secret VALUE from step 3')
console.log('      → Save\n')

console.log('   5. Add Allowed Redirect URLs in Supabase:')
console.log('      → Authentication → URL Configuration → Redirect URLs')
console.log(`      → Add: ${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`)
console.log('      → Add production URLs if deploying\n')

console.log('   6. Test the Integration:')
console.log('      → Start your dev server: npm run dev')
console.log('      → Navigate to http://localhost:3000/login')
console.log('      → Click "Continue with Microsoft"')
console.log('      → Complete the Microsoft sign-in flow')
console.log('      → You should be redirected to /dashboard\n')

console.log('📚 For detailed testing guide, see: docs/OAUTH_TESTING.md\n')

// Check for common issues
console.log('⚠️  Common Issues to Avoid:\n')
console.log('   • Client Secret: Use the VALUE, not the Secret ID')
console.log('   • Redirect URI: Must EXACTLY match (including https/http)')
console.log('   • Supabase URL: Use supabase.co (not supabase.com)')
console.log('   • Azure Redirect: Must be YOUR_PROJECT.supabase.co/auth/v1/callback')
console.log('   • App Redirect: Must be YOUR_DOMAIN/auth/callback (no /v1)\n')

console.log('✨ Configuration check complete!\n')
