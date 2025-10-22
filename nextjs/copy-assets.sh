#!/bin/bash
set -e

echo "📦 Copying static assets for standalone mode..."

# Ensure directories exist
mkdir -p .next/standalone/nextjs/.next
mkdir -p .next/standalone/nextjs/public

# Copy static files
if [ -d ".next/static" ]; then
  echo "✅ Copying .next/static..."
  cp -r .next/static .next/standalone/nextjs/.next/
else
  echo "⚠️  .next/static not found"
fi

# Copy public files
if [ -d "public" ]; then
  echo "✅ Copying public..."
  cp -r public .next/standalone/nextjs/
else
  echo "⚠️  public directory not found"
fi

# List what was copied for verification
echo "📂 Standalone structure:"
ls -la .next/standalone/nextjs/

echo "✅ Asset copying complete"

