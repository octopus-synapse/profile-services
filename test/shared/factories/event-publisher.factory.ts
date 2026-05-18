/**
 * Mock Factories for Testing
 *
 * Kent Beck: "Tests should be independent and isolated"
 * These factories provide consistent mocks for common dependencies.
 */

import { mock } from 'bun:test';
import { ResumeEventPublisher } from '@/bounded-contexts/resumes/domain/ports';

import { EventPublisher } from '@/shared-kernel';

/**
 * Creates a mock EventPublisher for testing services that use it.
 *
 * Usage:
 * ```ts
 * const { mockEventPublisher, eventPublisherProvider } = buildEventPublisher();
 *
 * const module = await Test.createTestingModule({ *   providers: [
 *     MyService, *     eventPublisherProvider, *   ], * }).compile();
 * ```
 */
export function buildEventPublisher() {
  const mockEventPublisher = { publish: mock(), publishAsync: mock(() => Promise.resolve()) };

  return {
    mockEventPublisher,
    eventPublisherProvider: { provide: EventPublisher, useValue: mockEventPublisher },
  };
}

/**
 * Creates a mock ResumeEventPublisher (port) for testing Resume-related services.
 *
 * Usage:
 * ```ts
 * const { mockResumeEventPublisher, resumeEventPublisherProvider } = buildResumeEventPublisher();
 *
 * const module = await Test.createTestingModule({ *   providers: [
 *     ResumesService, *     resumeEventPublisherProvider, *   ], * }).compile();
 * ```
 */
export function buildResumeEventPublisher() {
  const mockResumeEventPublisher: ResumeEventPublisher = {
    publishResumeCreated: mock(),
    publishResumeUpdated: mock(),
    publishResumeDeleted: mock(),
    publishSectionAdded: mock(),
    publishSectionUpdated: mock(),
    publishSectionRemoved: mock(),
    publishVersionCreated: mock(),
    publishVersionRestored: mock(),
    publishResumeCreatedAsync: mock(async () => {}),
    publishResumeDeletedAsync: mock(async () => {}),
    publishVersionCreatedAsync: mock(async () => {}),
    publishVersionRestoredAsync: mock(async () => {}),
  };

  return {
    mockResumeEventPublisher,
    resumeEventPublisherProvider: {
      provide: ResumeEventPublisher,
      useValue: mockResumeEventPublisher,
    },
  };
}

export { ResumeEventPublisher };
