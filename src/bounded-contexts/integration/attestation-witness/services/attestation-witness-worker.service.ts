import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import type { AttestationWitnessRun } from '@prisma/client';
import { AppLoggerService } from '@/bounded-contexts/platform/common/logger/logger.service';
import { AttestationWitnessRunService } from './attestation-witness-run.service';
import { AttestationWitnessSignatureService } from './attestation-witness-signature.service';
import { AttestationWitnessStorageService } from './attestation-witness-storage.service';

@Injectable()
export class AttestationWitnessWorkerService {
  constructor(
    private readonly runService: AttestationWitnessRunService,
    private readonly signatureService: AttestationWitnessSignatureService,
    private readonly storageService: AttestationWitnessStorageService,
    private readonly logger: AppLoggerService,
  ) {}

  async processNextPendingRun(): Promise<boolean> {
    const run = await this.runService.claimNextPendingRun();
    if (!run) {
      return false;
    }

    try {
      const swaggerHash = await this.executeChecks(run);
      const envelope = this.signatureService.createSignedAttestation({
        runId: run.id,
        sourceTreeHash: run.sourceTreeHash,
        snapshotSha256: run.snapshotSha256,
        swaggerHash,
      });

      await this.runService.completeRun(run.id, swaggerHash, envelope);
      this.logger.log('Witness run completed', 'AttestationWitnessWorkerService', {
        runId: run.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown witness execution failure';
      await this.runService.failRun(run.id, message);
    }

    return true;
  }

  private async executeChecks(run: AttestationWitnessRun): Promise<string> {
    const workspacePath = await this.storageService.createWorkspace(run.id);

    try {
      await this.runCommand('tar', ['-xzf', run.snapshotPath, '-C', workspacePath]);
      await this.runCommand('sh', [this.storageService.getCheckScriptPath(), workspacePath]);

      const swaggerPath = path.join(workspacePath, 'swagger.json');
      const swaggerBuffer = await readFile(swaggerPath);
      return createHash('sha256').update(swaggerBuffer).digest('hex');
    } finally {
      await this.storageService.removeWorkspace(workspacePath);
    }
  }

  private async runCommand(command: string, args: string[]): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      let output = '';

      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.on('error', reject);
      child.on('close', (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(output.trim() || `${command} exited with code ${code ?? 'unknown'}`));
      });
    });
  }
}
