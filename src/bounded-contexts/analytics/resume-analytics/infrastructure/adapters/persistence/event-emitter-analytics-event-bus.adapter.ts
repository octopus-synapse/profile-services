import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AnalyticsEventBusPort } from '../../../application/ports/analytics-event-bus.port';

@Injectable()
export class EventEmitterAnalyticsEventBusAdapter extends AnalyticsEventBusPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  emit(eventName: string, payload: unknown): void {
    this.emitter.emit(eventName, payload);
  }
}
