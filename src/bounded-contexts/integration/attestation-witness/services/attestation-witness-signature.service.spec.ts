import { beforeEach, describe, expect, it } from 'bun:test';
import { generateKeyPairSync, verify } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { AttestationWitnessSignatureService } from './attestation-witness-signature.service';

describe('AttestationWitnessSignatureService', () => {
  let service: AttestationWitnessSignatureService;

  beforeEach(() => {
    const { privateKey } = generateKeyPairSync('ed25519');
    const privateKeyPem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    const configService = new ConfigService({
      ATTESTATION_WITNESS_SIGNING_PRIVATE_KEY: privateKeyPem,
      ATTESTATION_WITNESS_KEY_ID: 'witness-test-key',
    });

    service = new AttestationWitnessSignatureService(configService);
  });

  it('creates a verifiable signed attestation envelope', () => {
    const envelope = service.createSignedAttestation({
      runId: 'run-1',
      sourceTreeHash: 'a'.repeat(64),
      snapshotSha256: 'b'.repeat(64),
      swaggerHash: 'c'.repeat(64),
    });
    const isValid = verify(
      null,
      Buffer.from(envelope.payloadJson),
      service.getPublicKeyPem(),
      Buffer.from(envelope.signature, 'base64'),
    );

    expect(isValid).toBe(true);
  });
});
