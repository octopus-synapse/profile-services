# Semantic Versioning Guide

This repository follows **strict Semantic Versioning (SemVer)** automated via `release-please`.

## Version Format: MAJOR.MINOR.PATCH

```
2.0.0 → 2.0.1 → 2.0.2 ... → 2.0.9 → 2.1.0 → 2.1.1 ...
```

## Conventional Commits Control Versioning

### PATCH (2.0.0 → 2.0.1)

Bug fixes, chores, docs, tests, refactors

```bash
fix: correct authentication token expiry
chore: update dependencies
docs: improve API documentation
test: add missing unit tests
refactor: extract validation logic
```

### MINOR (2.0.9 → 2.1.0)

New features, backwards-compatible additions

```bash
feat: add password reset functionality
feat(api): add user preferences endpoint
```

### MAJOR (2.9.0 → 3.0.0)

Breaking changes (requires `BREAKING CHANGE:` footer)

```bash
feat!: migrate to /v2/ API prefix

BREAKING CHANGE: All API routes now require /v2/ prefix
```

## Release Automation

1. **Commits merged to `main`** → release-please analyzes commit messages
2. **Opens/updates PR** → "chore(main): release X.Y.Z"
3. **PR merged** → Creates GitHub release + Git tag
4. **Docker image built** → `ghcr.io/octopus-synapse/profile-services:X.Y.Z`

## Configuration Files

- `.release-please-manifest.json` - Current version tracking
- `release-please-config.json` - Behavior configuration
- `.github/workflows/release.yml` - Automation workflow

## Examples

```bash
# These create 2.0.1
git commit -m "fix: resolve JWT expiry bug"
git commit -m "chore: update Prisma to 5.x"
git commit -m "docs: add API examples"

# These create 2.1.0
git commit -m "feat: add two-factor authentication"
git commit -m "feat(resumes): add PDF export"

# This creates 3.0.0
git commit -m "feat!: remove deprecated /api/v1/auth/legacy"
```

## Why This Matters

- **Consumers know what changed** - Patch = safe, Minor = new stuff, Major = breaking
- **Automated changelogs** - No manual CHANGELOG editing
- **Predictable releases** - Every merge triggers versioning logic
- **Dependency management** - `^2.0.0` allows 2.0.1-2.9.9, not 3.0.0

## Enforcement

- **Commitlint** validates commit messages pre-commit (via Husky)
- **CI fails** if commits don't follow Conventional Commits
- **Release-please** won't create release for malformed commits
