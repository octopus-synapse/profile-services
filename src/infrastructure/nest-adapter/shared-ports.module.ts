import { Global, Module } from '@nestjs/common';
import { ConfigPort } from '@/shared-kernel/config/config.port';
import { NestConfigAdapter } from './nest-config.adapter';

/**
 * Globally registers framework-free ports backed by Nest adapters so every
 * bounded context can depend on the port instead of `@nestjs/*` packages.
 */
@Global()
@Module({
  providers: [{ provide: ConfigPort, useClass: NestConfigAdapter }],
  exports: [ConfigPort],
})
export class SharedPortsModule {}
