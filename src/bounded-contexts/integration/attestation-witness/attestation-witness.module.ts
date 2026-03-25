import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { AttestationWitnessInternalController } from './controllers/attestation-witness-internal.controller';
import { AttestationWitnessRunService } from './services/attestation-witness-run.service';
import { AttestationWitnessSignatureService } from './services/attestation-witness-signature.service';
import { AttestationWitnessStorageService } from './services/attestation-witness-storage.service';
import { AttestationWitnessWorkerService } from './services/attestation-witness-worker.service';

@Module({
  imports: [ConfigModule, LoggerModule],
  controllers: [AttestationWitnessInternalController],
  providers: [
    AttestationWitnessStorageService,
    AttestationWitnessSignatureService,
    AttestationWitnessRunService,
    AttestationWitnessWorkerService,
  ],
  exports: [AttestationWitnessRunService, AttestationWitnessWorkerService],
})
export class AttestationWitnessModule {}
