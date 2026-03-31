#!/bin/bash
# Setup release labels for the repository
# Run this once: ./scripts/setup-release-labels.sh

set -e

echo "Creating release labels..."

# Create patch label
gh label create "patch" \
  --description "Triggers a PATCH release (0.0.x)" \
  --color "0E8A16" \
  --force 2>/dev/null || echo "Label 'patch' already exists"

# Create minor label
gh label create "minor" \
  --description "Triggers a MINOR release (0.x.0)" \
  --color "1D76DB" \
  --force 2>/dev/null || echo "Label 'minor' already exists"

# Create major label
gh label create "major" \
  --description "Triggers a MAJOR release (x.0.0)" \
  --color "B60205" \
  --force 2>/dev/null || echo "Label 'major' already exists"

# Create autorelease label
gh label create "autorelease: pending" \
  --description "Release PR pending merge" \
  --color "FBCA04" \
  --force 2>/dev/null || echo "Label 'autorelease: pending' already exists"

echo "Done! Labels created:"
echo "  - patch (green): PATCH release"
echo "  - minor (blue): MINOR release"
echo "  - major (red): MAJOR release"
echo "  - autorelease: pending (yellow): Release PR marker"
