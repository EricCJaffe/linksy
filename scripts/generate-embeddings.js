#!/usr/bin/env node

/**
 * Generate embeddings for needs and providers using OpenAI text-embedding-3-small
 *
 * This script:
 * 1. Fetches all active needs and generates embeddings from name + synonyms
 * 2. Fetches all providers and generates embeddings from descriptions
 * 3. Updates the embedding column in the database
 *
 * Requires: OPENAI_API_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');

// --- Config ---
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vjusthretnfmxmgdiwtw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY env var is required.');
  console.error('Run: source .env.local && node scripts/generate-embeddings.js');
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY env var is required.');
  console.error('Add it to .env.local');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Embedding Generation ---
async function generateEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
    dimensions: 1536,
  });
  return response.data[0].embedding;
}

async function generateEmbeddingsWithRetry(texts, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: texts,
        dimensions: 1536,
      });
      return response.data.map(d => d.embedding);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      console.log(`  Retry ${attempt}/${maxRetries} after error:`, error.message);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
    }
  }
}

// --- Main Script ---
async function main() {
  console.log('=== Linksy Embedding Generation ===\n');

  // -------------------------------------------------------
  // Step 1: Generate embeddings for needs
  // -------------------------------------------------------
  console.log('Step 1: Generating embeddings for needs...');

  const { data: needs, error: needsError } = await supabase
    .from('linksy_needs')
    .select('id, name, synonyms, is_active')
    .eq('is_active', true);

  if (needsError) {
    console.error('  Failed to fetch needs:', needsError);
    process.exit(1);
  }

  console.log(`  Found ${needs.length} active needs`);

  const needsWithoutEmbeddings = needs.filter(n => !n.embedding);
  console.log(`  ${needsWithoutEmbeddings.length} needs missing embeddings`);

  if (needsWithoutEmbeddings.length > 0) {
    // Batch process in groups of 100 (OpenAI limit is 2048 per request)
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < needsWithoutEmbeddings.length; i += BATCH_SIZE) {
      const batch = needsWithoutEmbeddings.slice(i, i + BATCH_SIZE);
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(needsWithoutEmbeddings.length / BATCH_SIZE)}...`);

      // Prepare text for each need: "name. synonyms"
      const texts = batch.map(need => {
        const synonymsText = (need.synonyms || []).join('. ');
        return synonymsText ? `${need.name}. ${synonymsText}` : need.name;
      });

      try {
        const embeddings = await generateEmbeddingsWithRetry(texts);

        // Update each need with its embedding
        for (let j = 0; j < batch.length; j++) {
          const { error: updateError } = await supabase
            .from('linksy_needs')
            .update({ embedding: JSON.stringify(embeddings[j]) })
            .eq('id', batch[j].id);

          if (updateError) {
            console.error(`  Failed to update need ${batch[j].name}:`, updateError);
          } else {
            successCount++;
          }
        }
      } catch (error) {
        console.error(`  Failed to generate embeddings for batch:`, error.message);
      }

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < needsWithoutEmbeddings.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`  ✅ Generated embeddings for ${successCount}/${needsWithoutEmbeddings.length} needs`);
  } else {
    console.log('  ✅ All needs already have embeddings');
  }

  // -------------------------------------------------------
  // Step 2: Generate embeddings for providers
  // -------------------------------------------------------
  console.log('\nStep 2: Generating embeddings for providers...');

  const { data: providers, error: providersError } = await supabase
    .from('linksy_providers')
    .select('id, name, description, is_active');

  if (providersError) {
    console.error('  Failed to fetch providers:', providersError);
    process.exit(1);
  }

  console.log(`  Found ${providers.length} providers`);

  const providersWithDescriptions = providers.filter(p => p.description && p.description.trim());
  const providersWithoutEmbeddings = providersWithDescriptions.filter(p => !p.embedding);

  console.log(`  ${providersWithDescriptions.length} providers have descriptions`);
  console.log(`  ${providersWithoutEmbeddings.length} providers missing embeddings`);

  if (providersWithoutEmbeddings.length > 0) {
    const BATCH_SIZE = 100;
    let successCount = 0;

    for (let i = 0; i < providersWithoutEmbeddings.length; i += BATCH_SIZE) {
      const batch = providersWithoutEmbeddings.slice(i, i + BATCH_SIZE);
      console.log(`  Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(providersWithoutEmbeddings.length / BATCH_SIZE)}...`);

      const texts = batch.map(p => p.description.trim());

      try {
        const embeddings = await generateEmbeddingsWithRetry(texts);

        for (let j = 0; j < batch.length; j++) {
          const { error: updateError } = await supabase
            .from('linksy_providers')
            .update({ embedding: JSON.stringify(embeddings[j]) })
            .eq('id', batch[j].id);

          if (updateError) {
            console.error(`  Failed to update provider ${batch[j].name}:`, updateError);
          } else {
            successCount++;
          }
        }
      } catch (error) {
        console.error(`  Failed to generate embeddings for batch:`, error.message);
      }

      if (i + BATCH_SIZE < providersWithoutEmbeddings.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`  ✅ Generated embeddings for ${successCount}/${providersWithoutEmbeddings.length} providers`);
  } else {
    console.log('  ✅ All providers with descriptions already have embeddings');
  }

  console.log('\n=== Embedding Generation Complete ===');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
