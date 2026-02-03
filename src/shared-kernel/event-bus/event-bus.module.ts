import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisher } from './event-publisher';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [EventPublisher],
  exports: [EventPublisher],
})
export class EventBusModule {}
