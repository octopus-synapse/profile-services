import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { type AttestationWitnessRun, AttestationWitnessStatus, Prisma } from '@prisma/client';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { PrismaService } from '@/bounded-contexts/platform/prisma/prisma.service';
import type { SignedAttestationWitnessEnvelope } from '../attestation-witness.types';
import { AttestationWitnessStorageService } from './attestation-witness-storage.service';

@Injectable()
export class AttestationWitnessRunService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: AttestationWitnessStorageService,
    private readonly logger: AppLoggerService,
  ) {}

  async createRun(input: {
    sourceTreeHash: string;
    gitTreeObjectId?: string;
    snapshot?: Express.Multer.File;
  }): Promise<AttestationWitnessRun> {
    this.assertSourceTreeHash(input.sourceTreeHash);

    if (!input.snapshot?.buffer?.length) {
      throw new BadRequestException('Snapshot archive is required');
    }

    const existingRun = await this.prisma.attestationWitnessRun.findUnique({
      where: { sourceTreeHash: input.sourceTreeHash },
    });

    if (existingRun) {
      return existingRun;
    }

    const runId = randomUUID();
    const { snapshotPath, snapshotSha256 } = await this.storageService.storeSnapshot(
      runId,
      input.snapshot.buffer,
    );

    try {
      return await this.prisma.attestationWitnessRun.create({
        data: {
          id: runId,
          sourceTreeHash: input.sourceTreeHash,
          gitTreeObjectId: input.gitTreeObjectId,
          snapshotPath,
          snapshotSha256,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return this.getRunBySourceTreeHash(input.sourceTreeHash);
      }

      throw error;
    }
  }

  async getRunStatus(runId: string): Promise<AttestationWitnessRun> {
    const run = await this.prisma.attestationWitnessRun.findUnique({ where: { id: runId } });
    if (!run) {
      throw new NotFoundException(`Witness run ${runId} was not found`);
    }
    return run;
  }

  async getAttestationBySourceTreeHash(
    sourceTreeHash: string,
  ): Promise<SignedAttestationWitnessEnvelope> {
    const run = await this.getRunBySourceTreeHash(sourceTreeHash);

    if (run.status !== AttestationWitnessStatus.SUCCEEDED || !run.attestationPath) {
      throw new ConflictException(`Witness attestation for ${sourceTreeHash} is not ready yet`);
    }

    return this.storageService.readAttestation(run.attestationPath);
  }

  async claimNextPendingRun(): Promise<AttestationWitnessRun | null> {
    const nextRun = await this.prisma.attestationWitnessRun.findFirst({
      where: { status: AttestationWitnessStatus.PENDING },
      orderBy: { createdAt: 'asc' },
    });

    if (!nextRun) {
      return null;
    }

    const claimResult = await this.prisma.attestationWitnessRun.updateMany({
      where: { id: nextRun.id, status: AttestationWitnessStatus.PENDING },
      data: { status: AttestationWitnessStatus.RUNNING, startedAt: new Date(), errorMessage: null },
    });

    if (claimResult.count === 0) {
      return null;
    }

    return this.getRunStatus(nextRun.id);
  }

  async completeRun(
    runId: string,
    swaggerHash: string,
    envelope: SignedAttestationWitnessEnvelope,
  ): Promise<void> {
    const attestationPath = await this.storageService.storeAttestation(runId, envelope);

    await this.prisma.attestationWitnessRun.update({
      where: { id: runId },
      data: {
        status: AttestationWitnessStatus.SUCCEEDED,
        swaggerHash,
        attestationPath,
        checkResults: envelope.payload.checks,
        completedAt: new Date(),
      },
    });
  }

  async failRun(runId: string, errorMessage: string): Promise<void> {
    await this.prisma.attestationWitnessRun.update({
      where: { id: runId },
      data: {
        status: AttestationWitnessStatus.FAILED,
        errorMessage,
        completedAt: new Date(),
      },
    });

    this.logger.error(
      'Attestation witness run failed',
      errorMessage,
      'AttestationWitnessRunService',
      {
        runId,
      },
    );
  }

  private async getRunBySourceTreeHash(sourceTreeHash: string): Promise<AttestationWitnessRun> {
    const run = await this.prisma.attestationWitnessRun.findUnique({
      where: { sourceTreeHash },
    });

    if (!run) {
      throw new NotFoundException(`Witness run for ${sourceTreeHash} was not found`);
    }

    return run;
  }

  private assertSourceTreeHash(sourceTreeHash: string): void {
    if (!/^[a-f0-9]{64}$/i.test(sourceTreeHash)) {
      throw new BadRequestException('sourceTreeHash must be a 64-character SHA-256 hex digest');
    }
  }
}
