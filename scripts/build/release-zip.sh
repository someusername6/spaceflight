#!/bin/bash
# Create a release zip for itch.io distribution
#
# Usage: ./scripts/build/release-zip.sh
#
# Reads version from package.json, builds the project, and creates
# a clean zip file containing only the necessary distribution files.

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
ZIP_NAME="spaceflight-v${VERSION}.zip"

echo "Building spaceflight v${VERSION}..."

# Build the project
npm run build

# Remove old zip if it exists
rm -f "$ZIP_NAME"

# Create zip with only necessary files, excluding OS metadata
cd dist
zip -r "../$ZIP_NAME" . \
  -x "*.DS_Store" \
  -x "*Thumbs.db" \
  -x "*.map" \
  -x ".git*"
cd ..

# Show result
echo ""
echo "Created: $ZIP_NAME"
ls -lh "$ZIP_NAME"
echo ""
echo "Contents:"
unzip -l "$ZIP_NAME"
