import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { EventPublisher } from '../event-publisher';
import { DomainEvent } from '../domain';

class TestEvent extends DomainEvent<{ value: string }> {
  static readonly TYPE = 'test.event';

  constructor(id: string, value: string) {
    super(TestEvent.TYPE, id, { value });
  }
}

describe('EventPublisher', () => {
  let publisher: EventPublisher;
  let mockEmitter: {
    emit: ReturnType<typeof mock>;
    emitAsync: ReturnType<typeof mock>;
  };

  beforeEach(() => {
    mockEmitter = {
      emit: mock(() => true),
      emitAsync: mock(() => Promise.resolve([])),
    };
    publisher = new EventPublisher(mockEmitter as never);
  });

  it('emits event with correct type', () => {
    const event = new TestEvent('id-1', 'test-value');

    publisher.publish(event);

    expect(mockEmitter.emit).toHaveBeenCalledWith('test.event', event);
  });

  it('emits async event with correct type', async () => {
    const event = new TestEvent('id-1', 'test-value');

    await publisher.publishAsync(event);

    expect(mockEmitter.emitAsync).toHaveBeenCalledWith('test.event', event);
  });
});
