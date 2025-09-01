#!/bin/bash
# Build script for Team Pinas Signage
# Copies source files to public directory for deployment

echo "🔧 Building Team Pinas Signage..."

# Clean existing copied files
echo "Cleaning public directory..."
rm -rf public/src public/config

# Copy source files to public
echo "Copying source files..."
cp -r src public/
cp -r config public/

echo "✅ Build complete!"
echo "Files copied to public/ for deployment"