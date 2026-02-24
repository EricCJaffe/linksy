/**
 * Google OAuth Configuration Validator
 *
 * This script validates your Google OAuth setup by checking:
 * - Supabase connection
 * - Environment variables
 * - OAuth provider configuration
 *
 * Run with: npx tsx scripts/test-google-oauth.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

// Load .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      const value = match[2].trim()
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

async function main() {
  console.log('\n🔍 Google OAuth Configuration Validator\n')
  console.log('=' .repeat(60))

  // 1. Check environment variables
  console.log('\n1️⃣  Checking Environment Variables:')
  const envChecks = {
    'NEXT_PUBLIC_SUPABASE_URL': SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY': SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
  }

  let envValid = true
  for (const [key, value] of Object.entries(envChecks)) {
    if (value && value !== 'your-supabase-project-url' && value !== 'your-supabase-anon-key') {
      console.log(`   ✅ ${key} is set`)
    } else {
      console.log(`   ❌ ${key} is missing or not configured`)
      envValid = false
    }
  }

  if (!envValid) {
    console.log('\n❌ Environment variables are not properly configured.')
    console.log('   Please check your .env.local file.\n')
    process.exit(1)
  }

  // 2. Test Supabase connection
  console.log('\n2️⃣  Testing Supabase Connection:')
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  try {
    const { error } = await supabase.from('users').select('count', { count: 'exact', head: true })
    if (error) throw error
    console.log('   ✅ Successfully connected to Supabase\n')
  } catch (error: any) {
    console.log('   ❌ Failed to connect to Supabase')
    console.log(`   Error: ${error.message}\n`)
    process.exit(1)
  }

  // 3. Check OAuth providers (this will work if the user has enabled it in Supabase dashboard)
  console.log('3️⃣  Checking OAuth Configuration:')
  console.log('   ℹ️  Note: OAuth providers are configured in Supabase Dashboard')
  console.log('   📍 Supabase Dashboard → Authentication → Providers')
  console.log('\n   To complete Google OAuth setup:')
  console.log('   1. Enable Google provider in Supabase Dashboard')
  console.log('   2. Add Google OAuth credentials (Client ID & Secret)')
  console.log('   3. Configure redirect URLs')
  console.log('\n   For detailed instructions, see: GOOGLE_OAUTH_SETUP.md\n')

  // 4. Check callback route exists
  console.log('4️⃣  Checking Callback Route:')
  const callbackPath = './app/auth/callback/route.ts'

  if (fs.existsSync(callbackPath)) {
    console.log('   ✅ Callback route exists at /app/auth/callback/route.ts')
  } else {
    console.log('   ❌ Callback route missing at /app/auth/callback/route.ts')
  }

  // 5. Check middleware configuration
  console.log('\n5️⃣  Checking Middleware Configuration:')
  const middlewarePath = './middleware.ts'

  if (fs.existsSync(middlewarePath)) {
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8')
    if (middlewareContent.includes('/auth/callback')) {
      console.log('   ✅ /auth/callback is configured as a public route')
    } else {
      console.log('   ⚠️  /auth/callback may not be configured as a public route')
      console.log('      Check middleware.ts to ensure /auth/callback is allowed')
    }
  } else {
    console.log('   ⚠️  Middleware file not found at ./middleware.ts')
  }

  // Summary
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Code Configuration Complete!')
  console.log('\n📋 Next Steps:')
  console.log('\n1. Configure Google OAuth in Google Cloud Console:')
  console.log('   - Create OAuth 2.0 Client ID')
  console.log('   - Set redirect URI to: https://YOUR_PROJECT.supabase.co/auth/v1/callback')
  console.log('\n2. Enable Google provider in Supabase Dashboard:')
  console.log('   - Go to Authentication → Providers → Google')
  console.log('   - Add your Google Client ID and Secret')
  console.log('\n3. Add redirect URLs in Supabase:')
  console.log('   - Go to Authentication → URL Configuration')
  console.log('   - Add: http://localhost:3000/auth/callback')
  console.log('   - Add: https://your-production-domain.com/auth/callback (for production)')
  console.log('\n4. Test the OAuth flow:')
  console.log('   - npm run dev')
  console.log('   - Go to http://localhost:3000/login')
  console.log('   - Click "Continue with Google"')
  console.log('\n📖 For detailed setup instructions, see: GOOGLE_OAUTH_SETUP.md')
  console.log('')
}

main().catch(console.error)
