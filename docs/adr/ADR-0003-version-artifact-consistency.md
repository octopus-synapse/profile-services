# ADR-0003 — Version Artifact Consistency Contract

## Status

Accepted

## Context

Version information exists in multiple places:

- Git tags (e.g., `v1.0.0`)
- GitHub releases (e.g., `v1.0.0`)
- `.release-please-manifest.json` (`{ ".": "1.0.0" }`)
- `package.json` (`"version": "1.0.0"`)

Inconsistency between these artifacts causes:

- Release-please calculating wrong next version
- CI/CD using incorrect version for Docker tags
- Confusion about current release state
- Illogical version jumps (1.0.0 → 3.0.0)

## Decision

**All version artifacts MUST be IDENTICAL at all times.**

### Version Source of Truth

The **last published GitHub release** is the single source of truth.

All other artifacts derive from this:

```
GitHub Release v1.0.0 (published)
    ↓
Git Tag v1.0.0 (must exist and match)
    ↓
.release-please-manifest.json { ".": "1.0.0" }
    ↓
package.json "version": "1.0.0"
```

### Enforcement Rules

1. **After publishing release `vX.Y.Z`:**
   - Git tag `vX.Y.Z` MUST exist
   - Manifest MUST contain `"X.Y.Z"` (no `v` prefix)
   - package.json MUST contain `"version": "X.Y.Z"`

2. **Before next release:**
   - Release-please PR updates package.json to next version
   - Manifest stays at current version until release published
   - Tag created only when release published

3. **Version format compliance:**
   - MUST follow semantic versioning: `MAJOR.MINOR.PATCH`
   - NO constraints on digit count (supports v1.0.0 through v999.999.999)
   - Git tags include `v` prefix
   - Manifest and package.json exclude `v` prefix

4. **Tools MUST be version-agnostic:**
   - Use `sort -V` for version sorting (not lexicographic)
   - Use `${VERSION#v}` for prefix stripping (not regex)
   - Never hardcode version patterns (e.g., `v[0-9]\.`)
   - Never assume single-digit components

### Verification Command

```bash
# Check alignment
TAG=$(git describe --tags --abbrev=0)
RELEASE=$(gh release list --limit 1 | awk '{print $3}')
MANIFEST=$(jq -r '."."' .release-please-manifest.json)
PACKAGE=$(jq -r '.version' package.json)

echo "Tag:      $TAG"
echo "Release:  $RELEASE"
echo "Manifest: v$MANIFEST"
echo "Package:  v$PACKAGE"

# Must all print identical vX.Y.Z
```

### Ghost Tag Prevention

Deleted releases MUST have corresponding tags deleted:

```bash
# Delete release AND tag together
gh release delete vX.Y.Z --yes
git tag -d vX.Y.Z
git push origin :refs/tags/vX.Y.Z
```

Never delete only the release or only the tag.

## Consequences

### Positive

- Eliminates version confusion
- Release-please calculates correct next version
- CI/CD uses correct version for artifacts
- Version progression is logical and predictable
- Supports unlimited version growth (no 10.0.0 failures)

### Negative

- Requires discipline to maintain alignment
- Manual version corrections need 4 file updates
- No tolerance for divergence

### Mitigation

- Document version alignment in PR template
- Add CI check to verify alignment before merge
- Include verification command in release checklist

## Compliance

This ADR enforces:

- Semantic Versioning 2.0.0
- POSIX parameter expansion
- GNU coreutils version sorting

All tooling verified safe for versions v1.0.0 through v999.999.999.

## References

- [Semantic Versioning 2.0.0](https://semver.org/)
- [release-please documentation](https://github.com/googleapis/release-please)
- Issue #50: Error handling standardization
- Issue #52: Prevented illogical 3.0.0 jump
