#!/bin/bash

set -euo pipefail

ATTESTATION_DIR=".attestations"
PUBLIC_KEY="${ATTESTATION_WITNESS_PUBLIC_KEY:-}"

if [ -z "$PUBLIC_KEY" ]; then
    echo "❌ ATTESTATION_WITNESS_PUBLIC_KEY is required for attestation verification"
    exit 1
fi

echo "🔍 Verifying pre-commit attestation..."
echo ""

CURRENT_TREE=$(git ls-files -s | grep -v "^.*$ATTESTATION_DIR" | sha256sum | cut -d' ' -f1)
CURRENT_SWAGGER=$(sha256sum swagger.json | cut -d' ' -f1)
ATTESTATION_FILE="$ATTESTATION_DIR/$CURRENT_TREE.json"

if [ ! -f "$ATTESTATION_FILE" ]; then
    echo "❌ Attestation not found for current code snapshot"
    echo "   Expected: $ATTESTATION_FILE"
    exit 1
fi

echo "✓ Attestation file found"

ATTESTATION_PATH="$ATTESTATION_FILE" \
ATTESTATION_CURRENT_TREE="$CURRENT_TREE" \
ATTESTATION_CURRENT_SWAGGER="$CURRENT_SWAGGER" \
node <<'NODE'
const fs = require('node:fs');
const crypto = require('node:crypto');

const attestationPath = process.env.ATTESTATION_PATH;
const currentTree = process.env.ATTESTATION_CURRENT_TREE;
const currentSwagger = process.env.ATTESTATION_CURRENT_SWAGGER;
const publicKeyPem = process.env.ATTESTATION_WITNESS_PUBLIC_KEY.replace(/\\n/g, '\n');

const requiredChecks = [
  'swagger',
  'typecheck',
  'lint',
  'unit_tests',
  'arch_tests',
  'contract_tests',
];

const attestation = JSON.parse(fs.readFileSync(attestationPath, 'utf8'));

if (attestation.algorithm !== 'ed25519') {
  throw new Error(`Unsupported attestation algorithm: ${attestation.algorithm}`);
}

const canonicalPayload = JSON.stringify(attestation.payload);
if (canonicalPayload !== attestation.payloadJson) {
  throw new Error('payloadJson does not match the attestation payload');
}

const isValidSignature = crypto.verify(
  null,
  Buffer.from(attestation.payloadJson),
  publicKeyPem,
  Buffer.from(attestation.signature, 'base64'),
);

if (!isValidSignature) {
  throw new Error('Attestation signature is invalid');
}

if (attestation.payload.sourceTreeHash !== currentTree) {
  throw new Error(
    `Attested tree hash ${attestation.payload.sourceTreeHash} does not match current tree ${currentTree}`,
  );
}

if (attestation.payload.swaggerHash !== currentSwagger) {
  throw new Error(
    `Attested swagger hash ${attestation.payload.swaggerHash} does not match current swagger ${currentSwagger}`,
  );
}

for (const checkName of requiredChecks) {
  if (attestation.payload.checks?.[checkName] !== true) {
    throw new Error(`Required check did not pass: ${checkName}`);
  }
}
NODE

echo "✓ Signature, tree hash and check set verified"
echo ""
echo "✅ Pre-commit attestation verified successfully"
