#!/bin/bash

# PhotoRoom CLI Release Script
# Usage: ./scripts/release.sh [patch|minor|major]

set -e

# Default to patch if no argument provided
RELEASE_TYPE=${1:-patch}

echo "🚀 PhotoRoom CLI Release Process"
echo "=================================="
echo "Release type: $RELEASE_TYPE"
echo ""

# Check if git is clean
if ! git diff-index --quiet HEAD --; then
    echo "❌ Git working directory is not clean. Please commit or stash changes first."
    exit 1
fi

# Check if we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ Not on main branch. Please switch to main branch first."
    echo "Current branch: $CURRENT_BRANCH"
    exit 1
fi

# Pull latest changes
echo "🔄 Pulling latest changes..."
git pull origin main

# Run checks
echo "🔍 Running linting and type checking..."
npm run check

# Build project
echo "🏗️  Building project..."
npm run build

# Show what would be released (dry run)
echo "📋 Preview of changes to be released:"
echo "======================================"
npm run release:dry-run

echo ""
echo "🤔 Do you want to proceed with this release? (y/N)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Release cancelled."
    exit 0
fi

# Create the release
echo "🎯 Creating $RELEASE_TYPE release..."
npm run "release:$RELEASE_TYPE"

# Push changes
echo "📤 Pushing changes and tags..."
git push --follow-tags origin main

echo ""
echo "✅ Release completed successfully!"
echo "🎉 Check GitHub for the new release and actions status."
echo "📦 The GitHub Action will create the GitHub release automatically."