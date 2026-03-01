#!/bin/bash
# =============================================================================
# Linksy - Vercel Setup Script
# =============================================================================
# Run this script from the project root to:
# 1. Link the project to Vercel
# 2. Set all required environment variables
# 3. Deploy
#
# Prerequisites:
# - Vercel CLI installed: npm i -g vercel
# - Vercel account with token
# - .env.local file with Supabase credentials
#
# Usage:
#   ./scripts/setup-vercel.sh
#   VERCEL_TOKEN=your-token ./scripts/setup-vercel.sh
# =============================================================================

set -e

echo "🔗 Linksy - Vercel Setup"
echo "========================"

# Check for Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Check for .env.local
if [ ! -f .env.local ]; then
    echo "❌ .env.local not found. Copy .env.example to .env.local and fill in values."
    exit 1
fi

TOKEN_FLAG=""
if [ -n "$VERCEL_TOKEN" ]; then
    TOKEN_FLAG="--token $VERCEL_TOKEN"
    echo "✅ Using provided VERCEL_TOKEN"
else
    echo "ℹ️  No VERCEL_TOKEN set. You'll be prompted to log in."
fi

# Step 1: Link the project
echo ""
echo "Step 1: Linking project to Vercel..."
vercel link --yes $TOKEN_FLAG

# Step 2: Set environment variables from .env.local
echo ""
echo "Step 2: Setting environment variables..."

# Read .env.local and set each variable in Vercel
while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines
    [[ "$line" =~ ^#.*$ || -z "$line" ]] && continue

    # Extract key=value
    key=$(echo "$line" | cut -d '=' -f 1)
    value=$(echo "$line" | cut -d '=' -f 2-)

    # Skip placeholder values
    [[ "$value" == "your-"* ]] && echo "  ⏭️  Skipping $key (placeholder value)" && continue
    [[ -z "$value" ]] && echo "  ⏭️  Skipping $key (empty)" && continue

    echo "  ➡️  Setting $key"
    echo "$value" | vercel env add "$key" production preview development $TOKEN_FLAG 2>/dev/null || \
        echo "  ⚠️  $key may already exist (skipped)"
done < .env.local

echo ""
echo "✅ Environment variables configured!"

# Step 3: Optional deploy
echo ""
read -p "Deploy now? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to Vercel..."
    vercel --prod $TOKEN_FLAG
    echo ""
    echo "✅ Deployment complete!"
else
    echo "ℹ️  Skipped deployment. Run 'vercel --prod' when ready."
fi

echo ""
echo "🎉 Vercel setup complete!"
echo ""
echo "Next steps:"
echo "  1. Go to your Vercel dashboard to verify the project"
echo "  2. Check environment variables are set correctly"
echo "  3. Connect your GitHub repo (EricCJaffe/linksy) in Vercel settings"
echo "  4. Push to main or claude/* branches to trigger auto-deploys"
