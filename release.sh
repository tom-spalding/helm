#!/usr/bin/env bash
# Usage: ./release.sh [patch|minor|major]
# Bumps version, generates changelog, commits, tags, and builds a signed .dmg.

set -e

BUMP=${1:-patch}

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

# Load signing credentials
if [[ -f ./sign.sh ]]; then
  source ./sign.sh
else
  echo "✗ sign.sh not found — build will be unsigned"
fi

# Bump package.json and capture the new version
NEW_VERSION=$(npm version "$BUMP" --no-git-tag-version | sed 's/^v//')
TODAY=$(date +%Y-%m-%d)

echo "→ Bumping to $NEW_VERSION"

# Sync tauri.conf.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" src-tauri/tauri.conf.json

# Sync Cargo.toml (first occurrence — the [package] version)
awk -v ver="$NEW_VERSION" 'done { print; next } /^version = "/ { sub(/^version = ".*"/, "version = \"" ver "\""); done=1 } { print }' src-tauri/Cargo.toml > src-tauri/Cargo.toml.tmp && mv src-tauri/Cargo.toml.tmp src-tauri/Cargo.toml

# Generate changelog from commits since last tag
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
if [[ -n "$LAST_TAG" ]]; then
  LOG=$(git log "$LAST_TAG"..HEAD --pretty=format:"- %s" --no-merges)
else
  LOG=$(git log --pretty=format:"- %s" --no-merges)
fi

# Prepend new entry to CHANGELOG.md
CHANGELOG_ENTRY="## v$NEW_VERSION — $TODAY

$LOG"

if [[ -f CHANGELOG.md ]]; then
  EXISTING=$(cat CHANGELOG.md)
  printf '%s\n\n%s\n' "$CHANGELOG_ENTRY" "$EXISTING" > CHANGELOG.md
else
  printf '# Changelog\n\n%s\n' "$CHANGELOG_ENTRY" > CHANGELOG.md
fi

echo "→ Changelog updated"

# Commit and tag
git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml CHANGELOG.md
git commit -m "chore: release v$NEW_VERSION"
git tag "v$NEW_VERSION"

echo "→ Tagged v$NEW_VERSION"
echo "→ Building..."

npm run tauri build

echo ""
echo "✓ v$NEW_VERSION released — run 'git push && git push --tags' to publish"
