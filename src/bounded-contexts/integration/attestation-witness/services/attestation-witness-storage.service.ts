import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import type { SignedAttestationWitnessEnvelope } from '../attestation-witness.types';

@Injectable()
export class AttestationWitnessStorageService {
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: AppLoggerService,
  ) {}

  async storeSnapshot(
    runId: string,
    snapshotBuffer: Buffer,
  ): Promise<{ snapshotPath: string; snapshotSha256: string }> {
    const runDirectory = await this.ensureRunDirectory(runId);
    const snapshotPath = path.join(runDirectory, 'snapshot.tar.gz');
    const snapshotSha256 = createHash('sha256').update(snapshotBuffer).digest('hex');

    await writeFile(snapshotPath, snapshotBuffer);

    this.logger.log('Stored attestation witness snapshot', 'AttestationWitnessStorageService', {
      runId,
      snapshotPath,
    });

    return { snapshotPath, snapshotSha256 };
  }

  async storeAttestation(
    runId: string,
    envelope: SignedAttestationWitnessEnvelope,
  ): Promise<string> {
    const runDirectory = await this.ensureRunDirectory(runId);
    const attestationPath = path.join(runDirectory, 'attestation.json');

    await writeFile(attestationPath, `${JSON.stringify(envelope, null, 2)}\n`, 'utf8');
    return attestationPath;
  }

  async readAttestation(attestationPath: string): Promise<SignedAttestationWitnessEnvelope> {
    const content = await readFile(attestationPath, 'utf8');
    return JSON.parse(content) as SignedAttestationWitnessEnvelope;
  }

  async createWorkspace(runId: string): Promise<string> {
    const workspacesDirectory = path.join(this.getBasePath(), 'workspaces');
    await mkdir(workspacesDirectory, { recursive: true });
    return mkdtemp(path.join(workspacesDirectory, `${runId}-`));
  }

  async removeWorkspace(workspacePath: string): Promise<void> {
    await rm(workspacePath, { recursive: true, force: true });
  }

  getCheckScriptPath(): string {
    return (
      this.configService.get<string>('ATTESTATION_WITNESS_CHECK_SCRIPT') ??
      path.join(process.cwd(), 'scripts', 'run-attestation-witness-checks.sh')
    );
  }

  getBasePath(): string {
    return (
      this.configService.get<string>('ATTESTATION_WITNESS_STORAGE_PATH') ??
      path.join(tmpdir(), 'profile-attestation-witness')
    );
  }

  private async ensureRunDirectory(runId: string): Promise<string> {
    const runDirectory = path.join(this.getBasePath(), 'runs', runId);
    await mkdir(runDirectory, { recursive: true });
    return runDirectory;
  }
}
