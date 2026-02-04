/**
 * Mock Factories for Testing
 *
 * Kent Beck: "Tests should be independent and isolated"
 * These factories provide consistent mocks for common dependencies.
 */

import { mock } from 'bun:test';
import { EventPublisher } from '@/shared-kernel';
import type { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';
import { RESUME_EVENT_PUBLISHER } from '@/bounded-contexts/resumes/domain/ports';

/**
 * Creates a mock EventPublisher for testing services that use it.
 *
 * Usage:
 * ```ts
 * const { mockEventPublisher, eventPublisherProvider } = createMockEventPublisher();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     MyService,
 *     eventPublisherProvider,
 *   ],
 * }).compile();
 * ```
 */
export function createMockEventPublisher() {
  const mockEventPublisher = {
    publish: mock(),
    publishAsync: mock(() => Promise.resolve()),
  };

  return {
    mockEventPublisher,
    eventPublisherProvider: {
      provide: EventPublisher,
      useValue: mockEventPublisher,
    },
  };
}

/**
 * Creates a mock ResumeEventPublisher (port) for testing Resume-related services.
 *
 * Usage:
 * ```ts
 * const { mockResumeEventPublisher, resumeEventPublisherProvider } = createMockResumeEventPublisher();
 *
 * const module = await Test.createTestingModule({
 *   providers: [
 *     ResumesService,
 *     resumeEventPublisherProvider,
 *   ],
 * }).compile();
 * ```
 */
export function createMockResumeEventPublisher() {
  const mockResumeEventPublisher: ResumeEventPublisher = {
    publishResumeCreated: mock(),
    publishResumeUpdated: mock(),
    publishResumeDeleted: mock(),
    publishSectionAdded: mock(),
    publishSectionUpdated: mock(),
    publishSectionRemoved: mock(),
    publishVersionCreated: mock(),
    publishVersionRestored: mock(),
  };

  return {
    mockResumeEventPublisher,
    resumeEventPublisherProvider: {
      provide: RESUME_EVENT_PUBLISHER,
      useValue: mockResumeEventPublisher,
    },
  };
}

export { RESUME_EVENT_PUBLISHER };
