#!/bin/bash
set -e

echo "Building Expo web app..."
npx expo export --platform web

echo "Copying JS bundle to backend..."
cp -r dist/_expo backend/public/app/
cp dist/favicon.ico backend/public/app/ 2>/dev/null || true
cp dist/metadata.json backend/public/app/ 2>/dev/null || true

NEW_HASH=$(grep -o 'AppEntry-[a-f0-9]*\.js' dist/index.html)
if [ -n "$NEW_HASH" ]; then
  sed -i "s/AppEntry-[a-f0-9]*\.js/$NEW_HASH/" backend/public/app/index.html
  echo "Updated JS bundle reference to: $NEW_HASH"
fi

echo "Web build complete!"
