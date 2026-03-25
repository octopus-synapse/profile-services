import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { AttestationWitnessStatus } from '@prisma/client';
import { AttestationWitnessRunService } from './attestation-witness-run.service';

describe('AttestationWitnessRunService', () => {
  const snapshot = {
    buffer: Buffer.from('snapshot'),
    originalname: 'snapshot.tar.gz',
    mimetype: 'application/gzip',
    size: 8,
  } as Express.Multer.File;

  let prisma: {
    attestationWitnessRun: {
      findUnique: ReturnType<typeof mock>;
      create: ReturnType<typeof mock>;
      findFirst: ReturnType<typeof mock>;
      updateMany: ReturnType<typeof mock>;
      update: ReturnType<typeof mock>;
    };
  };
  let storageService: {
    storeSnapshot: ReturnType<typeof mock>;
    readAttestation: ReturnType<typeof mock>;
    storeAttestation: ReturnType<typeof mock>;
  };
  let service: AttestationWitnessRunService;

  beforeEach(() => {
    prisma = {
      attestationWitnessRun: {
        findUnique: mock(() => Promise.resolve(null)),
        create: mock(() =>
          Promise.resolve({
            id: 'run-1',
            status: AttestationWitnessStatus.PENDING,
            sourceTreeHash: 'a'.repeat(64),
          }),
        ),
        findFirst: mock(() => Promise.resolve(null)),
        updateMany: mock(() => Promise.resolve({ count: 0 })),
        update: mock(() => Promise.resolve(undefined)),
      },
    };
    storageService = {
      storeSnapshot: mock(() =>
        Promise.resolve({
          snapshotPath: '/tmp/witness/snapshot.tar.gz',
          snapshotSha256: 'b'.repeat(64),
        }),
      ),
      readAttestation: mock(() => Promise.resolve({})),
      storeAttestation: mock(() => Promise.resolve('/tmp/witness/attestation.json')),
    };

    service = new AttestationWitnessRunService(
      prisma as never,
      storageService as never,
      { log: mock(() => undefined), error: mock(() => undefined) } as never,
    );
  });

  it('returns an existing run when the tree hash was already submitted', async () => {
    prisma.attestationWitnessRun.findUnique.mockResolvedValue({
      id: 'run-existing',
      status: AttestationWitnessStatus.SUCCEEDED,
      sourceTreeHash: 'a'.repeat(64),
    });

    const run = await service.createRun({
      sourceTreeHash: 'a'.repeat(64),
      snapshot,
    });

    expect(run.id).toBe('run-existing');
  });

  it('stores a new snapshot and creates a pending run', async () => {
    const run = await service.createRun({
      sourceTreeHash: 'a'.repeat(64),
      gitTreeObjectId: 'f'.repeat(40),
      snapshot,
    });

    expect(run.status).toBe(AttestationWitnessStatus.PENDING);
  });
});
