export const REQUIRED_ATTESTATION_WITNESS_CHECKS = [
  'swagger',
  'typecheck',
  'lint',
  'unit_tests',
  'arch_tests',
  'contract_tests',
] as const;

export type AttestationWitnessCheckName = (typeof REQUIRED_ATTESTATION_WITNESS_CHECKS)[number];

export type AttestationWitnessCheckResults = Record<AttestationWitnessCheckName, true>;

export interface AttestationWitnessPayload {
  version: 1;
  issuer: 'profile-services-witness';
  runId: string;
  sourceTreeHash: string;
  snapshotSha256: string;
  swaggerHash: string;
  checks: AttestationWitnessCheckResults;
  issuedAt: string;
}

export interface SignedAttestationWitnessEnvelope {
  algorithm: 'ed25519';
  keyId: string;
  payload: AttestationWitnessPayload;
  payloadJson: string;
  signature: string;
}
