import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvent } from './domain/domain-event';

export abstract class EventPublisherPort {
  abstract publish<T>(event: DomainEvent<T>): void;
  abstract publishAsync<T>(event: DomainEvent<T>): Promise<void>;
}

@Injectable()
export class EventPublisher extends EventPublisherPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  publish<T>(event: DomainEvent<T>): void {
    this.emitter.emit(event.eventType, event);
  }

  async publishAsync<T>(event: DomainEvent<T>): Promise<void> {
    await this.emitter.emitAsync(event.eventType, event);
  }
}
