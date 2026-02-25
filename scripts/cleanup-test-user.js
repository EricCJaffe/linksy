#!/usr/bin/env node

/**
 * Cleanup script to remove test user and contact
 * Usage: node scripts/cleanup-test-user.js ejaffe@4lot.org
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function cleanupUser(email) {
  console.log(`\n🔍 Looking for user: ${email}`)

  try {
    // 1. Find the user in auth.users
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error listing auth users:', authError)
      return
    }

    const authUser = authUsers.users.find(u => u.email === email)

    if (authUser) {
      console.log(`✅ Found auth user: ${authUser.id}`)

      // Delete provider contacts first (they reference the user)
      const { data: contacts, error: contactsError } = await supabase
        .from('linksy_provider_contacts')
        .delete()
        .eq('user_id', authUser.id)
        .select()

      if (contactsError) {
        console.error('❌ Error deleting provider contacts:', contactsError)
      } else {
        console.log(`✅ Deleted ${contacts?.length || 0} provider contact(s)`)
      }

      // Delete the auth user (this cascades to public.users)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(authUser.id)

      if (deleteError) {
        console.error('❌ Error deleting auth user:', deleteError)
      } else {
        console.log(`✅ Deleted auth user: ${authUser.id}`)
      }
    } else {
      console.log('ℹ️  No auth user found with that email')
    }

    // 2. Clean up any orphaned provider contacts with that email
    const { data: orphanedContacts, error: orphanError } = await supabase
      .from('linksy_provider_contacts')
      .delete()
      .eq('email', email)
      .select()

    if (orphanError) {
      console.error('❌ Error deleting orphaned contacts:', orphanError)
    } else if (orphanedContacts && orphanedContacts.length > 0) {
      console.log(`✅ Deleted ${orphanedContacts.length} orphaned contact(s)`)
    } else {
      console.log('ℹ️  No orphaned contacts found')
    }

    console.log('\n✅ Cleanup complete!\n')

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

// Get email from command line args
const email = process.argv[2]

if (!email) {
  console.error('❌ Usage: node scripts/cleanup-test-user.js <email>')
  process.exit(1)
}

cleanupUser(email)
