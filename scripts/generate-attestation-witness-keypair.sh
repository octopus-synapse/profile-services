#!/bin/sh

set -eu

PRIVATE_KEY_PATH="${1:-attestation-witness-private.pem}"
PUBLIC_KEY_PATH="${2:-attestation-witness-public.pem}"

openssl genpkey -algorithm ED25519 -out "$PRIVATE_KEY_PATH"
openssl pkey -in "$PRIVATE_KEY_PATH" -pubout -out "$PUBLIC_KEY_PATH"

echo "Private key written to: $PRIVATE_KEY_PATH"
echo "Public key written to:  $PUBLIC_KEY_PATH"
echo ""
echo "Store the private key in the server secret:"
echo "  ATTESTATION_WITNESS_SIGNING_PRIVATE_KEY"
echo ""
echo "Store the public key in the GitHub Actions secret:"
echo "  ATTESTATION_WITNESS_PUBLIC_KEY"
