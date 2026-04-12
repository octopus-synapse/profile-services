/**
 * Integration Module
 *
 * ADR-002: Modular Hexagonal Architecture.
 * Aggregates external integration submodules.
 *
 * Submodules:
 * - GitHub: Sync GitHub profile data to resume
 * - MEC Sync: Sync MEC (Brazilian education ministry) data
 * - Upload: File upload handling
 */

import { Module } from '@nestjs/common';
import { GitHubModule } from './github/github.module';
import { MecSyncModule } from './mec-sync/mec-sync.module';
import { UploadModule } from './upload/upload.module';

@Module({
  imports: [GitHubModule, MecSyncModule, UploadModule],
  exports: [GitHubModule, MecSyncModule, UploadModule],
})
export class IntegrationModule {}
