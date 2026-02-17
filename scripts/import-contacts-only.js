#!/usr/bin/env node

/**
 * Standalone Step 9: Import provider contacts from contacts.csv
 *
 * Safe to run independently — does NOT wipe any existing data.
 * Reads the provider legacy_id → UUID lookup directly from the DB.
 * Skips contacts whose email already exists in auth.users.
 *
 * Run: source .env.local && node scripts/import-contacts-only.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vjusthretnfmxmgdiwtw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required.');
  console.error('Run: source .env.local && node scripts/import-contacts-only.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DATA_DIR = path.join(__dirname, '..', 'data', 'migration');

// CSV parser (handles quoted fields)
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleaned = content.replace(/^\uFEFF/, '');
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      rows.length === 0 ? (rows.push([current]), current = '') : (rows[rows.length - 1].push(current), current = '');
    } else if (ch === '\n' && !inQuotes) {
      if (rows.length === 0) rows.push([current]);
      else rows[rows.length - 1].push(current);
      current = '';
      rows.push([]);
    } else if (ch === '\r' && !inQuotes) {
      // skip
    } else {
      current += ch;
    }
  }
  if (current || rows[rows.length - 1]?.length > 0) {
    if (rows.length === 0) rows.push([]);
    rows[rows.length - 1].push(current);
  }

  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length === headers.length && r.some(v => v.trim()));
  return dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = row[i]?.trim() || ''; });
    return obj;
  });
}

const CONTACT_TYPE_MAP = {
  '123300001': 'provider_employee',
  '123300000': 'customer',
};

async function main() {
  console.log('=== Import Provider Contacts (Step 9 standalone) ===\n');

  // 1. Load CSVs
  const contactsRaw = parseCSV(path.join(DATA_DIR, 'contacts.csv'));
  const accountsRaw = parseCSV(path.join(DATA_DIR, 'accounts.csv'));
  console.log(`Loaded ${contactsRaw.length} contacts, ${accountsRaw.length} accounts from CSV`);

  // 2. Build contact lookup by contactid
  const contactLookup = {};
  contactsRaw.forEach(c => { contactLookup[c.contactid] = c; });

  // 3. Build provider lookup from DB (legacy_id → provider UUID)
  const { data: providers, error: provErr } = await supabase
    .from('linksy_providers')
    .select('id, legacy_id')
    .not('legacy_id', 'is', null);

  if (provErr) {
    console.error('Failed to fetch providers:', provErr.message);
    process.exit(1);
  }

  const providerLookup = {};
  providers.forEach(p => { providerLookup[p.legacy_id] = p.id; });
  console.log(`Loaded ${providers.length} providers from DB with legacy_ids`);

  // 4. Filter parent accounts (those without a parentaccountid)
  const parentAccounts = accountsRaw.filter(a => !a.parentaccountid || !a.parentaccountid.trim());

  // 5. Find accounts with a primarycontactid that maps to a known provider
  const contactsToImport = [];
  parentAccounts.forEach(account => {
    const primaryContactId = account.primarycontactid?.trim();
    if (!primaryContactId) return;

    const providerId = providerLookup[account.accountid];
    if (!providerId) return;

    const contact = contactLookup[primaryContactId];
    if (!contact) {
      console.log(`  WARNING: primarycontactid ${primaryContactId} not found in contacts.csv for "${account.name}"`);
      return;
    }

    contactsToImport.push({ contact, providerId, accountName: account.name });
  });

  console.log(`\nFound ${contactsToImport.length} primary contacts to import\n`);

  // 6. Process contacts
  const userCreationResults = {}; // email -> user_id
  let contactsCreated = 0;
  let contactsSkipped = 0;
  let contactsAlreadyLinked = 0;

  for (const { contact, providerId, accountName } of contactsToImport) {
    const email = (contact.emailaddress1 || '').trim().toLowerCase();
    if (!email) {
      const name = [contact.firstname, contact.lastname].filter(Boolean).join(' ') || contact.contactid;
      console.log(`  SKIP (no email): ${name} for "${accountName}"`);
      contactsSkipped++;
      continue;
    }

    // Check if this provider_contact link already exists
    const { data: existingLink } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('legacy_id', contact.contactid)
      .maybeSingle();

    if (existingLink) {
      console.log(`  SKIP (already imported): ${email}`);
      contactsAlreadyLinked++;
      continue;
    }

    let userId = userCreationResults[email];

    if (!userId) {
      // Check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
        userCreationResults[email] = userId;
        console.log(`  Reusing existing user: ${email}`);
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
        });

        if (authError) {
          console.log(`  SKIP (auth error): ${email} — ${authError.message || JSON.stringify(authError)}`);
          contactsSkipped++;
          continue;
        }

        userId = authData.user.id;

        // Upsert public.users row
        const fullName = [contact.firstname, contact.lastname].filter(Boolean).join(' ') || email;
        const { error: userErr } = await supabase
          .from('users')
          .upsert({ id: userId, full_name: fullName, email, role: 'user' }, { onConflict: 'id' });

        if (userErr) {
          console.log(`  WARNING: Failed to upsert public.users for ${email}: ${userErr.message}`);
        }

        userCreationResults[email] = userId;
        console.log(`  Created user: ${email} (${[contact.firstname, contact.lastname].filter(Boolean).join(' ')})`);
      }
    }

    // Insert provider contact
    const { error: pcErr } = await supabase
      .from('linksy_provider_contacts')
      .insert({
        provider_id: providerId,
        user_id: userId,
        contact_type: CONTACT_TYPE_MAP[contact.ic_contacttype] || 'provider_employee',
        is_primary_contact: true,
        job_title: contact.jobtitle || null,
        legacy_id: contact.contactid,
        provider_role: 'user',
        status: 'active',
      });

    if (pcErr) {
      console.log(`  WARNING: Failed to insert contact ${email} → "${accountName}": ${pcErr.message}`);
      contactsSkipped++;
    } else {
      contactsCreated++;
      console.log(`  ✓ Linked ${email} → "${accountName}"`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`  Created:          ${contactsCreated}`);
  console.log(`  Already imported: ${contactsAlreadyLinked}`);
  console.log(`  Skipped:          ${contactsSkipped}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
