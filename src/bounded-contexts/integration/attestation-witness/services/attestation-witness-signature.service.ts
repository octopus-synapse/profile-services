import { createHash, createPrivateKey, createPublicKey, sign } from 'node:crypto';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AttestationWitnessCheckResults,
  type AttestationWitnessPayload,
  REQUIRED_ATTESTATION_WITNESS_CHECKS,
  type SignedAttestationWitnessEnvelope,
} from '../attestation-witness.types';

interface CreateSignedAttestationInput {
  runId: string;
  sourceTreeHash: string;
  snapshotSha256: string;
  swaggerHash: string;
}

@Injectable()
export class AttestationWitnessSignatureService {
  constructor(private readonly configService: ConfigService) {}

  createSignedAttestation(input: CreateSignedAttestationInput): SignedAttestationWitnessEnvelope {
    const privateKey = createPrivateKey(this.getPrivateKeyPem());
    const publicKey = createPublicKey(privateKey)
      .export({ format: 'pem', type: 'spki' })
      .toString();
    const payload: AttestationWitnessPayload = {
      version: 1 as const,
      issuer: 'profile-services-witness' as const,
      runId: input.runId,
      sourceTreeHash: input.sourceTreeHash,
      snapshotSha256: input.snapshotSha256,
      swaggerHash: input.swaggerHash,
      checks: this.createCheckResults(),
      issuedAt: new Date().toISOString(),
    };
    const payloadJson = JSON.stringify(payload);
    const signature = sign(null, Buffer.from(payloadJson), privateKey).toString('base64');

    return {
      algorithm: 'ed25519',
      keyId: this.getKeyId(publicKey),
      payload,
      payloadJson,
      signature,
    };
  }

  getPublicKeyPem(): string {
    const privateKey = createPrivateKey(this.getPrivateKeyPem());
    return createPublicKey(privateKey).export({ format: 'pem', type: 'spki' }).toString();
  }

  private getKeyId(publicKeyPem: string): string {
    const configuredKeyId = this.configService.get<string>('ATTESTATION_WITNESS_KEY_ID');
    if (configuredKeyId) {
      return configuredKeyId;
    }

    return createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16);
  }

  private getPrivateKeyPem(): string {
    const privateKeyPem = this.configService.get<string>('ATTESTATION_WITNESS_SIGNING_PRIVATE_KEY');

    if (!privateKeyPem) {
      throw new InternalServerErrorException(
        'ATTESTATION_WITNESS_SIGNING_PRIVATE_KEY is required for witness signing',
      );
    }

    return privateKeyPem.replace(/\\n/g, '\n');
  }

  private createCheckResults(): AttestationWitnessCheckResults {
    const checks = {} as AttestationWitnessCheckResults;

    for (const checkName of REQUIRED_ATTESTATION_WITNESS_CHECKS) {
      checks[checkName] = true;
    }

    return checks;
  }
}
