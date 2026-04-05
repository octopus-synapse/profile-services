# CI/CD Infrastructure

## Structure

```
.github/
├── actions/
│   ├── evaluate-ci-results/    # Aggregates CI job results
│   ├── run-test-suite/         # Unified test runner
│   ├── setup-bun-env/          # Bun environment setup
│   └── setup-git-bot/          # Git bot configuration
├── scripts/
│   ├── parse-test-output.sh    # Bun test output parser
│   └── generate-summary.sh     # GitHub Step Summary generator
└── workflows/
    ├── ci.yml                  # Main CI orchestrator
    ├── release.yml             # Release workflow
    ├── rollback.yml            # Rollback workflow
    └── _*.yml                  # Reusable workflow templates
```

## Adding a New Test Suite

1. Create workflow using the appropriate template:

```yaml
# .github/workflows/ci.new-tests.yml
name: New Tests
on:
  workflow_call:

jobs:
  test:
    uses: ./.github/workflows/_infrastructure-test-template.yml  # For DB tests
    # or: ./.github/workflows/_static-analysis-template.yml      # For unit tests
    with:
      test-command: "bun run test:new"
      test-name: "New"
```

2. Add to `ci.yml`:

```yaml
new-tests:
  uses: ./.github/workflows/ci.new-tests.yml
  secrets: inherit
```

## Scripts

### parse-test-output.sh

Parses Bun test output and exports metrics:

```bash
source .github/scripts/parse-test-output.sh test-output.txt
echo "Passed: $PASS, Failed: $FAIL, Skipped: $SKIP, Files: $FILES"
```

### generate-summary.sh

Generates standardized GitHub Step Summary:

```bash
.github/scripts/generate-summary.sh <status> <name> <pass> <fail> <skip> <duration> [output-file]
```

## Conventions

- Workflow names: `ci.<category>.<name>.yml`
- Template names: `_<name>-template.yml`
- Action names: lowercase with hyphens
- All scripts must be tested in `test-ci-scripts.yml`
