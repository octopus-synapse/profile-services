/**
 * PR Comment CLI - Public API
 *
 * CLI tools are meant to be run directly, not imported.
 * This file exists for documentation and type exports only.
 *
 * Available CLI tools:
 *
 * generate-card.ts - Generate SVG card from attestation/CI metrics
 *   Usage: bun generate-card.ts --attestation=.attestation [--ci-metrics=ci.json]
 *          echo '{"attestation":{...},"ci":{...},"git":{...}}' | bun generate-card.ts --stdin
 *
 * post-comment.ts - Post/update PR comment with SVG
 *   Usage: bun post-comment.ts --pr=123 --svg=card.svg
 *          cat card.svg | bun post-comment.ts --pr=123 --stdin
 *   Env:   GITHUB_TOKEN, GITHUB_REPOSITORY (or GITHUB_OWNER + GITHUB_REPO)
 */

export const CLI_TOOLS = ['generate-card', 'post-comment'] as const;
export type CliTool = (typeof CLI_TOOLS)[number];
