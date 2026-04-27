import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventBusPort } from './event-bus.port';
import { EventPublisher, EventPublisherPort } from './event-publisher';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({ wildcard: false, maxListeners: 10, verboseMemoryLeak: true }),
  ],
  providers: [
    EventPublisher,
    { provide: EventPublisherPort, useExisting: EventPublisher },
    { provide: EventBusPort, useExisting: EventPublisher },
  ],
  exports: [EventPublisher, EventPublisherPort, EventBusPort],
})
export class EventBusModule {}
