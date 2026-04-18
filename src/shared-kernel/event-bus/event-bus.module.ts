import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventPublisher, EventPublisherPort } from './event-publisher';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      maxListeners: 10,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [EventPublisher, { provide: EventPublisherPort, useExisting: EventPublisher }],
  exports: [EventPublisher, EventPublisherPort],
})
export class EventBusModule {}
