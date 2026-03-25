import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validate } from '@/bounded-contexts/platform/common/config/env.validation';
import { LoggerModule } from '@/bounded-contexts/platform/common/logger/logger.module';
import { PrismaModule } from '@/bounded-contexts/platform/prisma/prisma.module';
import { AttestationWitnessModule } from './attestation-witness.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate,
    }),
    LoggerModule,
    PrismaModule,
    AttestationWitnessModule,
  ],
})
export class AttestationWitnessWorkerModule {}
