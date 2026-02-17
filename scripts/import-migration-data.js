#!/usr/bin/env node

/**
 * Migration script: Import Clay County Linksy data from Power Apps CSVs
 *
 * Imports in order:
 * 1. Site record (Clay County)
 * 2. linksy_need_categories (from ic_needcategories.csv)
 * 3. linksy_needs (from ic_needs.csv)
 * 4. linksy_providers (from accounts.csv)
 * 5. linksy_locations (from account addresses)
 * 6. linksy_provider_needs (derived from ic_referrals.csv)
 * 7. linksy_tickets (from ic_referrals.csv)
 * 8. linksy_provider_notes (child accounts → notes on parent)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS.
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vjusthretnfmxmgdiwtw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required.');
  console.error('Run: source .env.local && node scripts/import-migration-data.js');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const DATA_DIR = path.join(__dirname, '..', 'data', 'migration');

// --- CSV Parser (handles quoted fields with embedded newlines/commas) ---
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  // Remove BOM if present
  const cleaned = content.replace(/^\uFEFF/, '');
  const rows = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === '"') {
      if (inQuotes && cleaned[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      rows.length === 0 ? (rows.push([current]), current = '') : (rows[rows.length - 1].push(current), current = '');
    } else if (ch === '\n' && !inQuotes) {
      if (rows.length === 0) {
        rows.push([current]);
      } else {
        rows[rows.length - 1].push(current);
      }
      current = '';
      rows.push([]);
    } else if (ch === '\r' && !inQuotes) {
      // skip \r
    } else {
      current += ch;
    }
  }
  // Push last field
  if (current || rows[rows.length - 1]?.length > 0) {
    if (rows.length === 0) rows.push([]);
    rows[rows.length - 1].push(current);
  }

  // Filter empty rows and map to objects
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length === headers.length && r.some(v => v.trim()));
  return dataRows.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = row[i]?.trim() || ''; });
    return obj;
  });
}

// --- Slug generator ---
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

// --- Enum Maps ---
const SECTOR_MAP = {
  '123300000': 'nonprofit',
  '123300001': 'faith_based',
  '123300002': 'government',
  '123300003': 'business',
};

const PROJECT_STATUS_MAP = {
  '123300000': 'sustaining',
  '123300001': 'maintenance',
  '123300002': 'active',
  '123300003': 'na',
};

const TICKET_STATUS_MAP = {
  '123300000': 'pending',
  '123300001': 'wrong_organization_referred',
  '123300002': 'customer_need_addressed',
  '123300003': 'outside_of_scope',
  '123300004': 'client_not_eligible',
  '123300005': 'unable_to_assist',
  '123300006': 'client_unresponsive',
};

// --- Helpers ---
function buildSocialLinks(row) {
  const links = {};
  if (row.ic_facebooklink) links.facebook = row.ic_facebooklink;
  if (row.ic_instagramlink) links.instagram = row.ic_instagramlink;
  if (row.ic_linkedinlink) links.linkedin = row.ic_linkedinlink;
  if (row.ic_youtubelink) links.youtube = row.ic_youtubelink;
  return Object.keys(links).length > 0 ? links : null;
}

function parseSynonyms(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

function parseNonReferralName(name) {
  let cleanName = name;
  let instructions = '';

  // Extract instructions AFTER NON-REFERRAL
  const match = name.match(/NON[\s-]REFERRAL\s*(.*)/i);
  if (match) {
    const postText = match[1].trim();
    // Strip leading "ONLY", "BASED", "- " from post text
    instructions = postText.replace(/^(ONLY\s+|BASED\s*[-.]?\s*)/i, '').trim();
  }

  // Remove NON-REFERRAL and everything after it from name
  cleanName = name.replace(/\s*NON[\s-]REFERRAL.*/i, '').trim();

  // Detect instruction phrases left in the name (ALL CAPS phrases at end)
  // e.g. "The Clothes Closet & Food Pantry YOU MUST FILL OUT THEIR FORM FOR ASSISTANCE"
  const instructionAtEnd = cleanName.match(/\s+(YOU MUST[^]*|MUST MAKE[^]*|MUST CALL[^]*|MUST GO[^]*)$/i);
  if (instructionAtEnd) {
    const preInstructions = instructionAtEnd[1].trim();
    cleanName = cleanName.slice(0, instructionAtEnd.index).trim();
    // Prepend to existing instructions
    instructions = preInstructions + (instructions ? '. ' + instructions : '');
  }

  // Clean trailing punctuation like " -", " –"
  cleanName = cleanName.replace(/\s*[-–—]\s*$/, '').trim();

  // Clean "ONLY" prefix from instructions
  instructions = instructions.replace(/^ONLY\s*/i, '').trim();
  // Remove "MUST MAKE A DIRECT CONTACT - NON-REFERRAL BASED" type patterns from instructions
  instructions = instructions.replace(/MUST MAKE A DIRECT CONTACT\s*[-–]?\s*NON[\s-]?REFERRAL\s*BASED\.?\s*/gi, '').trim();

  return { cleanName, instructions };
}

// --- Main Import ---
async function main() {
  console.log('=== Linksy Migration Import ===\n');

  // -------------------------------------------------------
  // Step 1: Create or get site record
  // -------------------------------------------------------
  console.log('Step 1: Creating site record...');

  // Check if a Linksy site already exists
  let { data: existingSites } = await supabase
    .from('sites')
    .select('*')
    .eq('name', 'Linksy - Clay County');

  let siteId;
  if (existingSites && existingSites.length > 0) {
    siteId = existingSites[0].id;
    console.log(`  Site already exists: ${siteId}`);
  } else {
    const { data: site, error: siteErr } = await supabase
      .from('sites')
      .insert({
        name: 'Linksy - Clay County',
        domain: 'linksy-clay.org',
        settings: {
          region: 'Clay County, FL',
          state: 'Florida',
          timezone: 'America/New_York'
        }
      })
      .select()
      .single();

    if (siteErr) {
      console.error('  Failed to create site:', siteErr);
      process.exit(1);
    }
    siteId = site.id;
    console.log(`  Created site: ${siteId}`);
  }

  // -------------------------------------------------------
  // Cleanup: Delete all existing data for idempotent re-runs
  // -------------------------------------------------------
  console.log('\nCleaning up existing data...');
  // Delete in reverse dependency order
  await supabase.from('linksy_ticket_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_tickets').delete().eq('site_id', siteId);
  await supabase.from('linksy_interactions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_provider_needs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_provider_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_provider_contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('linksy_events').delete().eq('site_id', siteId);
  await supabase.from('linksy_api_keys').delete().eq('site_id', siteId);
  await supabase.from('linksy_providers').delete().eq('site_id', siteId);
  await supabase.from('linksy_needs').delete().eq('site_id', siteId);
  await supabase.from('linksy_need_categories').delete().eq('site_id', siteId);
  console.log('  Cleanup complete');

  // -------------------------------------------------------
  // Step 2: Import need categories
  // -------------------------------------------------------
  console.log('\nStep 2: Importing need categories...');
  const categoriesRaw = parseCSV(path.join(DATA_DIR, 'ic_needcategories.csv'));
  console.log(`  Parsed ${categoriesRaw.length} categories from CSV`);

  const categoryRows = categoriesRaw.map((row, idx) => ({
    site_id: siteId,
    name: row.ic_category,
    slug: slugify(row.ic_category),
    is_active: true,
    sort_order: idx + 1,
    legacy_id: row.ic_needcategoryid,
  }));


  const { data: insertedCategories, error: catErr } = await supabase
    .from('linksy_need_categories')
    .insert(categoryRows)
    .select('id, legacy_id, name');

  if (catErr) {
    console.error('  Failed to insert categories:', catErr);
    process.exit(1);
  }
  console.log(`  Inserted ${insertedCategories.length} need categories`);

  // Build legacy_id -> new UUID lookup
  const categoryLookup = {};
  insertedCategories.forEach(c => { categoryLookup[c.legacy_id] = c.id; });

  // -------------------------------------------------------
  // Step 3: Import needs
  // -------------------------------------------------------
  console.log('\nStep 3: Importing needs...');
  const needsRaw = parseCSV(path.join(DATA_DIR, 'ic_needs.csv'));
  console.log(`  Parsed ${needsRaw.length} needs from CSV`);

  // Filter to active needs only (statecode=0)
  const activeNeeds = needsRaw.filter(r => r.statecode === '0');
  const inactiveNeeds = needsRaw.filter(r => r.statecode !== '0');
  console.log(`  Active: ${activeNeeds.length}, Inactive: ${inactiveNeeds.length}`);

  const needRows = needsRaw.map(row => ({
    site_id: siteId,
    category_id: categoryLookup[row.ic_needcategory] || null,
    name: row.ic_name,
    slug: slugify(row.ic_name),
    synonyms: parseSynonyms(row.ic_synonyms),
    is_active: row.statecode === '0',
    legacy_id: row.ic_needid,
  }));


  const { data: insertedNeeds, error: needErr } = await supabase
    .from('linksy_needs')
    .insert(needRows)
    .select('id, legacy_id, name');

  if (needErr) {
    console.error('  Failed to insert needs:', needErr);
    process.exit(1);
  }
  console.log(`  Inserted ${insertedNeeds.length} needs`);

  const needLookup = {};
  insertedNeeds.forEach(n => { needLookup[n.legacy_id] = n.id; });

  // -------------------------------------------------------
  // Step 4: Import providers (accounts)
  // -------------------------------------------------------
  console.log('\nStep 4: Importing providers...');
  const accountsRaw = parseCSV(path.join(DATA_DIR, 'accounts.csv'));
  console.log(`  Parsed ${accountsRaw.length} accounts from CSV`);

  // Separate parent and child accounts
  const childAccounts = accountsRaw.filter(a => a.parentaccountid && a.parentaccountid.trim());
  const parentAccounts = accountsRaw.filter(a => !a.parentaccountid || !a.parentaccountid.trim());
  console.log(`  Parent accounts (providers): ${parentAccounts.length}`);
  console.log(`  Child accounts (will become notes): ${childAccounts.length}`);

  const providerRows = parentAccounts.map(row => {
    const isNonReferral = /NON[\s-]REFERRAL/i.test(row.name);
    let name = row.name;
    let referralInstructions = '';
    let referralType = 'standard';

    if (isNonReferral) {
      const parsed = parseNonReferralName(row.name);
      name = parsed.cleanName;
      referralInstructions = parsed.instructions;
      referralType = 'contact_directly';
    }

    return {
      site_id: siteId,
      name,
      slug: slugify(name),
      description: row.description || null,
      sector: SECTOR_MAP[row.ic_sector] || 'nonprofit',
      project_status: PROJECT_STATUS_MAP[row.ic_projectstatus] || 'active',
      referral_type: referralType,
      referral_instructions: referralInstructions || null,
      phone: row.telephone1 || null,
      email: row.emailaddress1 || null,
      website: row.websiteurl || null,
      hours_of_operation: row.ic_hoursofoperation || null,
      social_links: buildSocialLinks(row),
      is_active: row.statecode === '0',
      allow_auto_update_description: row.ic_allowautoupdateofdescription === 'True',
      legacy_id: row.accountid,
      legacy_referral_count: parseInt(row.ic_referralcount) || 0,
    };
  });

  // Deduplicate slugs
  const slugCounts = {};
  providerRows.forEach(p => {
    slugCounts[p.slug] = (slugCounts[p.slug] || 0) + 1;
    if (slugCounts[p.slug] > 1) {
      p.slug = `${p.slug}-${slugCounts[p.slug]}`;
    }
  });

  // Insert in batches of 50
  const BATCH_SIZE = 50;
  let allProviders = [];
  for (let i = 0; i < providerRows.length; i += BATCH_SIZE) {
    const batch = providerRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('linksy_providers')
      .insert(batch)
      .select('id, legacy_id, name');

    if (error) {
      console.error(`  Failed to insert provider batch ${i}:`, error);
      console.error('  First failing row:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    allProviders = allProviders.concat(data);
  }
  console.log(`  Inserted ${allProviders.length} providers`);

  const providerLookup = {};
  allProviders.forEach(p => { providerLookup[p.legacy_id] = p.id; });

  // -------------------------------------------------------
  // Step 5: Import locations (from account addresses)
  // -------------------------------------------------------
  console.log('\nStep 5: Importing locations...');
  const locationRows = [];

  parentAccounts.forEach(row => {
    const providerId = providerLookup[row.accountid];
    if (!providerId) return;

    // Primary address
    if (row.address1_line1 || row.address1_city) {
      const loc = {
        provider_id: providerId,
        name: row.address1_name || 'Main Office',
        address_line1: row.address1_line1 || null,
        address_line2: row.address1_line2 || null,
        address_line3: row.address1_line3 || null,
        city: row.address1_city || null,
        state: row.address1_stateorprovince || null,
        postal_code: row.address1_postalcode || null,
        county: row.address1_county || null,
        country: row.address1_country || 'US',
        is_primary: true,
        is_active: true,
      };
      // Add lat/lng if present
      if (row.address1_latitude && row.address1_longitude) {
        loc.latitude = parseFloat(row.address1_latitude);
        loc.longitude = parseFloat(row.address1_longitude);
      }
      locationRows.push(loc);
    }

    // Secondary address
    if (row.address2_line1 || row.address2_city) {
      const loc = {
        provider_id: providerId,
        name: row.address2_name || 'Secondary Office',
        address_line1: row.address2_line1 || null,
        address_line2: row.address2_line2 || null,
        address_line3: row.address2_line3 || null,
        city: row.address2_city || null,
        state: row.address2_stateorprovince || null,
        postal_code: row.address2_postalcode || null,
        county: row.address2_county || null,
        country: row.address2_country || 'US',
        is_primary: false,
        is_active: true,
      };
      if (row.address2_latitude && row.address2_longitude) {
        loc.latitude = parseFloat(row.address2_latitude);
        loc.longitude = parseFloat(row.address2_longitude);
      }
      locationRows.push(loc);
    }
  });

  let allLocations = [];
  for (let i = 0; i < locationRows.length; i += BATCH_SIZE) {
    const batch = locationRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('linksy_locations')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`  Failed to insert location batch ${i}:`, error);
      console.error('  First failing row:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    allLocations = allLocations.concat(data);
  }
  console.log(`  Inserted ${allLocations.length} locations`);

  // -------------------------------------------------------
  // Step 6: Import provider_needs (from referrals)
  // -------------------------------------------------------
  console.log('\nStep 6: Importing provider-need associations...');
  const referralsRaw = parseCSV(path.join(DATA_DIR, 'ic_referrals.csv'));
  console.log(`  Parsed ${referralsRaw.length} referrals from CSV`);

  // Derive unique provider-need pairs
  const providerNeedPairs = new Set();
  const providerNeedRows = [];

  referralsRaw.forEach(row => {
    const providerId = providerLookup[row.ic_referralstoorganization];
    const needId = needLookup[row.ic_need];
    if (!providerId || !needId) return;

    const key = `${providerId}:${needId}`;
    if (providerNeedPairs.has(key)) return;
    providerNeedPairs.add(key);

    providerNeedRows.push({
      provider_id: providerId,
      need_id: needId,
      source: 'legacy_referral',
      is_confirmed: true,
    });
  });

  let allProviderNeeds = [];
  for (let i = 0; i < providerNeedRows.length; i += BATCH_SIZE) {
    const batch = providerNeedRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('linksy_provider_needs')
      .insert(batch)
      .select('id');

    if (error) {
      console.error(`  Failed to insert provider_needs batch ${i}:`, error);
      process.exit(1);
    }
    allProviderNeeds = allProviderNeeds.concat(data);
  }
  console.log(`  Inserted ${allProviderNeeds.length} provider-need associations`);

  // -------------------------------------------------------
  // Step 7: Import tickets (from referrals)
  // -------------------------------------------------------
  console.log('\nStep 7: Importing tickets...');

  const ticketRows = referralsRaw.map(row => {
    const providerId = providerLookup[row.ic_referralstoorganization];
    const needId = needLookup[row.ic_need];

    return {
      site_id: siteId,
      provider_id: providerId || null,
      need_id: needId || null,
      ticket_number: row.ic_referralnumber || null,
      status: TICKET_STATUS_MAP[row.ic_statusofreferral] || 'pending',
      client_name: row.ic_customerfullname || null,
      client_email: row.ic_customeremail || null,
      client_phone: row.ic_customerphone || null,
      description_of_need: row.ic_descriptionofneed || null,
      follow_up_sent: row.ic_followupsent === 'True',
      source: 'legacy_power_apps',
      legacy_id: row.ic_referralid,
      legacy_referral_number: row.ic_referralnumber || null,
    };
  });

  // Also add ticket comments from provider comments
  const ticketComments = [];

  let allTickets = [];
  for (let i = 0; i < ticketRows.length; i += BATCH_SIZE) {
    const batch = ticketRows.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from('linksy_tickets')
      .insert(batch)
      .select('id, legacy_id');

    if (error) {
      console.error(`  Failed to insert ticket batch ${i}:`, error);
      console.error('  First failing row:', JSON.stringify(batch[0], null, 2));
      process.exit(1);
    }
    allTickets = allTickets.concat(data);
  }
  console.log(`  Inserted ${allTickets.length} tickets`);

  // Build ticket lookup for comments
  const ticketLookup = {};
  allTickets.forEach(t => { ticketLookup[t.legacy_id] = t.id; });

  // Insert provider comments as ticket comments
  referralsRaw.forEach(row => {
    if (row.ic_providercomments && row.ic_providercomments.trim()) {
      const ticketId = ticketLookup[row.ic_referralid];
      if (ticketId) {
        ticketComments.push({
          ticket_id: ticketId,
          content: row.ic_providercomments.trim(),
          is_private: true,
          author_name: 'Legacy Import',
          author_role: 'system',
        });
      }
    }
    // Also add customer comments
    if (row.ic_customercomments && row.ic_customercomments.trim()) {
      const ticketId = ticketLookup[row.ic_referralid];
      if (ticketId) {
        ticketComments.push({
          ticket_id: ticketId,
          content: row.ic_customercomments.trim(),
          is_private: false,
          author_name: row.ic_customerfullname || 'Client',
          author_role: 'client',
        });
      }
    }
  });

  if (ticketComments.length > 0) {
    let allComments = [];
    for (let i = 0; i < ticketComments.length; i += BATCH_SIZE) {
      const batch = ticketComments.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('linksy_ticket_comments')
        .insert(batch)
        .select('id');

      if (error) {
        console.error(`  Failed to insert ticket comments batch ${i}:`, error);
        // Non-fatal, continue
      } else {
        allComments = allComments.concat(data);
      }
    }
    console.log(`  Inserted ${allComments.length} ticket comments`);
  }

  // -------------------------------------------------------
  // Step 8: Convert child accounts to provider notes
  // -------------------------------------------------------
  console.log('\nStep 8: Converting child accounts to provider notes...');

  const noteRows = childAccounts.map(child => {
    const parentProviderId = providerLookup[child.parentaccountid];
    if (!parentProviderId) {
      console.log(`  WARNING: No parent provider found for child "${child.name}" (parent: ${child.parentaccountid})`);
      return null;
    }

    const content = [
      `Sub-program: ${child.name}`,
      child.description ? `\nDescription: ${child.description}` : '',
      child.telephone1 ? `Phone: ${child.telephone1}` : '',
      child.emailaddress1 ? `Email: ${child.emailaddress1}` : '',
      child.websiteurl ? `Website: ${child.websiteurl}` : '',
      child.ic_hoursofoperation ? `Hours: ${child.ic_hoursofoperation}` : '',
    ].filter(Boolean).join('\n');

    return {
      provider_id: parentProviderId,
      note_type: 'general',
      content,
      author_name: 'Legacy Import',
    };
  }).filter(Boolean);

  if (noteRows.length > 0) {
    const { data: insertedNotes, error: noteErr } = await supabase
      .from('linksy_provider_notes')
      .insert(noteRows)
      .select('id');

    if (noteErr) {
      console.error('  Failed to insert provider notes:', noteErr);
    } else {
      console.log(`  Inserted ${insertedNotes.length} provider notes from child accounts`);
    }
  }

  // -------------------------------------------------------
  // Step 9: Import contacts (from contacts.csv + accounts.csv primarycontactid)
  // -------------------------------------------------------
  console.log('\nStep 9: Importing provider contacts...');
  const contactsRaw = parseCSV(path.join(DATA_DIR, 'contacts.csv'));
  console.log(`  Parsed ${contactsRaw.length} contacts from CSV`);

  // Build contact lookup by contactid
  const contactLookup = {};
  contactsRaw.forEach(c => { contactLookup[c.contactid] = c; });

  // Find accounts with a primarycontactid that maps to a known provider
  const contactsToImport = [];
  parentAccounts.forEach(account => {
    const primaryContactId = account.primarycontactid?.trim();
    if (!primaryContactId) return;

    const providerId = providerLookup[account.accountid];
    if (!providerId) return;

    const contact = contactLookup[primaryContactId];
    if (!contact) {
      console.log(`  WARNING: primarycontactid ${primaryContactId} not found in contacts.csv for account "${account.name}"`);
      return;
    }

    contactsToImport.push({ contact, providerId });
  });

  console.log(`  Found ${contactsToImport.length} primary contacts to import`);

  // Deduplicate by email (some contacts may be primary for multiple providers)
  const seenEmails = new Set();
  const userCreationResults = {}; // email -> user_id

  let contactsCreated = 0;
  let contactsSkipped = 0;

  for (const { contact, providerId } of contactsToImport) {
    const email = (contact.emailaddress1 || '').trim().toLowerCase();
    if (!email) {
      console.log(`  SKIP: Contact "${contact.fullname}" (${contact.contactid}) has no email`);
      contactsSkipped++;
      continue;
    }

    let userId = userCreationResults[email];

    // Create auth user + public.users row if not already done
    if (!userId) {
      // First check if user already exists in public.users
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        userId = existingUser.id;
        userCreationResults[email] = userId;
        console.log(`  User already exists for ${email}, reusing`);
      } else {
        // Try to create auth user with minimal data
        const crypto = require('crypto');
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true
        });

        if (authError) {
          console.log(`  SKIP: Failed to create auth user for ${email}: ${authError.message || authError.msg || JSON.stringify(authError)}`);
          contactsSkipped++;
          continue;
        }

        userId = authData.user.id;
      }

      // Upsert into public.users
      const fullName = contact.fullname || [contact.firstname, contact.lastname].filter(Boolean).join(' ') || email;
      const { error: userErr } = await supabase
        .from('users')
        .upsert({
          id: userId,
          full_name: fullName,
          email,
          role: 'user',
        }, { onConflict: 'id' });

      if (userErr) {
        console.log(`  WARNING: Failed to upsert public.users for ${email}: ${userErr.message}`);
      }

      userCreationResults[email] = userId;
    }

    // Map contact type
    const CONTACT_TYPE_MAP = {
      '123300001': 'provider_employee',
      '123300000': 'customer',
    };

    // Insert provider contact row
    const { error: pcErr } = await supabase
      .from('linksy_provider_contacts')
      .insert({
        provider_id: providerId,
        user_id: userId,
        contact_type: CONTACT_TYPE_MAP[contact.ic_contacttype] || 'provider_employee',
        is_primary_contact: true,
        job_title: contact.jobtitle || null,
        legacy_id: contact.contactid,
      });

    if (pcErr) {
      console.log(`  WARNING: Failed to insert provider_contact for ${email} -> provider ${providerId}: ${pcErr.message}`);
      contactsSkipped++;
    } else {
      contactsCreated++;
    }
  }

  console.log(`  Created ${contactsCreated} provider contacts (skipped ${contactsSkipped})`);

  // -------------------------------------------------------
  // Summary
  // -------------------------------------------------------
  console.log('\n=== Import Complete ===');
  console.log(`  Site:              ${siteId}`);
  console.log(`  Need Categories:   ${insertedCategories.length}`);
  console.log(`  Needs:             ${insertedNeeds.length}`);
  console.log(`  Providers:         ${allProviders.length}`);
  console.log(`  Locations:         ${allLocations.length}`);
  console.log(`  Provider-Needs:    ${allProviderNeeds.length}`);
  console.log(`  Tickets:           ${allTickets.length}`);
  console.log(`  Ticket Comments:   ${ticketComments.length}`);
  console.log(`  Provider Notes:    ${noteRows.length}`);
  console.log(`  Provider Contacts: ${contactsCreated}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
