import { ApiProperty } from '@nestjs/swagger';
import type { AttestationWitnessPayload } from '../attestation-witness.types';

export const ATTESTATION_WITNESS_STATUS_VALUES = [
  'PENDING',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
] as const;

export type AttestationWitnessRunStatus = (typeof ATTESTATION_WITNESS_STATUS_VALUES)[number];

export class CreateAttestationWitnessRunRequestDto {
  @ApiProperty({
    description: 'SHA-256 digest of the staged tracked files excluding .attestations/',
    example: '31f12d52114008af8b8cbad4e6c49b6cfe8f1283d4f7adab8ad4cd4769b8ef7d',
  })
  sourceTreeHash!: string;

  @ApiProperty({
    description: 'Git tree object ID produced by git write-tree for the uploaded snapshot',
    example: '8f3d7f35d6ab4ed918f91d36f6c7bf9b142f4e6d',
    required: false,
  })
  gitTreeObjectId?: string;

  @ApiProperty({
    description: 'Compressed tar archive for the staged snapshot',
    type: 'string',
    format: 'binary',
  })
  snapshot?: unknown;
}

export class AttestationWitnessRunDataDto {
  @ApiProperty({ example: 'cm8o4i1xr0000vfa8i4t8v0nf' })
  runId!: string;

  @ApiProperty({ enum: ATTESTATION_WITNESS_STATUS_VALUES })
  status!: AttestationWitnessRunStatus;

  @ApiProperty({
    example: '31f12d52114008af8b8cbad4e6c49b6cfe8f1283d4f7adab8ad4cd4769b8ef7d',
  })
  sourceTreeHash!: string;
}

export class AttestationWitnessStatusDataDto extends AttestationWitnessRunDataDto {
  @ApiProperty({ example: true })
  attestationReady!: boolean;

  @ApiProperty({ required: false, example: 'bun test ./test/contracts failed' })
  errorMessage?: string;
}

export class AttestationWitnessEnvelopeDto {
  @ApiProperty({ example: 'ed25519' })
  algorithm!: 'ed25519';

  @ApiProperty({ example: 'witness-key-2026-03-25' })
  keyId!: string;

  @ApiProperty()
  payload!: AttestationWitnessPayload;

  @ApiProperty()
  payloadJson!: string;

  @ApiProperty({ example: 'aW52YWxpZC1iYXNlNjQtc2lnbmF0dXJl' })
  signature!: string;
}
