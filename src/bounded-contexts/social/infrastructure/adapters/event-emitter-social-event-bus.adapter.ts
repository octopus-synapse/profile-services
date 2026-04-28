import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SocialEventBusPort } from '../../application/ports/social-event-bus.port';

@Injectable()
export class EventEmitterSocialEventBusAdapter extends SocialEventBusPort {
  constructor(private readonly emitter: EventEmitter2) {
    super();
  }

  emit(eventName: string, payload: unknown): void {
    this.emitter.emit(eventName, payload);
  }
}
