#!/usr/bin/env bash
# Usage: ./release.sh [patch|minor|major]
# Bumps version in package.json, tauri.conf.json, and Cargo.toml, then commits and tags.

set -e

BUMP=${1:-patch}

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Bump package.json and capture the new version (npm version also creates a git tag we'll delete)
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | sed 's/^v//')

echo "→ Bumping to $NEW_VERSION"

# Sync tauri.conf.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json

# Sync Cargo.toml (first occurrence — the [package] version)
sed -i '' "0,/^version = \".*\"/{s/^version = \".*\"/version = \"$NEW_VERSION\"/}" src-tauri/Cargo.toml

# Commit and tag
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "✓ Tagged v$NEW_VERSION — run 'git push && git push --tags' to publish"
