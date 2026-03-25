import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, type TestingModule } from '@nestjs/testing';
import { AttestationWitnessStatus } from '@prisma/client';
import { InternalAuthGuard } from '@/bounded-contexts/integration/mec-sync/guards/internal-auth.guard';
import { AttestationWitnessRunService } from '../services/attestation-witness-run.service';
import { AttestationWitnessInternalController } from './attestation-witness-internal.controller';

const createRunService = () => ({
  createRun: mock(() =>
    Promise.resolve({
      id: 'run-1',
      status: AttestationWitnessStatus.PENDING,
      sourceTreeHash: 'a'.repeat(64),
    }),
  ),
  getRunStatus: mock(() =>
    Promise.resolve({
      id: 'run-1',
      status: AttestationWitnessStatus.SUCCEEDED,
      sourceTreeHash: 'a'.repeat(64),
      attestationPath: '/tmp/attestation.json',
      errorMessage: null,
    }),
  ),
  getAttestationBySourceTreeHash: mock(() =>
    Promise.resolve({
      algorithm: 'ed25519',
      keyId: 'witness-key',
      payload: {
        version: 1,
        issuer: 'profile-services-witness',
        runId: 'run-1',
        sourceTreeHash: 'a'.repeat(64),
        snapshotSha256: 'b'.repeat(64),
        swaggerHash: 'c'.repeat(64),
        checks: {
          swagger: true,
          typecheck: true,
          lint: true,
          unit_tests: true,
          arch_tests: true,
          contract_tests: true,
        },
        issuedAt: '2026-03-25T17:00:00.000Z',
      },
      payloadJson: '{}',
      signature: 'signature',
    }),
  ),
});

describe('AttestationWitnessInternalController', () => {
  let controller: AttestationWitnessInternalController;

  beforeEach(async () => {
    const moduleBuilder = Test.createTestingModule({
      controllers: [AttestationWitnessInternalController],
      providers: [{ provide: AttestationWitnessRunService, useValue: createRunService() }],
    })
      .overrideGuard(InternalAuthGuard)
      .useValue({ canActivate: () => true });

    const module: TestingModule = await moduleBuilder.compile();
    controller = module.get(AttestationWitnessInternalController);
  });

  it('returns a created witness run summary', async () => {
    const result = await controller.createRun({ sourceTreeHash: 'a'.repeat(64) }, {
      buffer: Buffer.from('snapshot'),
      originalname: 'snapshot.tar.gz',
      mimetype: 'application/gzip',
      size: 8,
    } as Express.Multer.File);

    expect(result.data?.runId).toBe('run-1');
  });

  it('returns witness run status', async () => {
    const result = await controller.getRunStatus('run-1');

    expect(result.data?.attestationReady).toBe(true);
  });

  it('returns a signed attestation envelope', async () => {
    const result = await controller.getAttestation('a'.repeat(64));

    expect(result.data?.algorithm).toBe('ed25519');
  });
});
