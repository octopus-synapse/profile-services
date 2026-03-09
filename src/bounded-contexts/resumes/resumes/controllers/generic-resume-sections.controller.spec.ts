import { describe, expect, it, mock } from 'bun:test';
import type { UserPayload } from '@/bounded-contexts/identity/shared-kernel/infrastructure';
import type { GenericResumeSectionsService } from '../services/generic-resume-sections.service';
import { GenericResumeSectionsController } from './generic-resume-sections.controller';

/**
 * Stub service type matching what the controller uses.
 */
type StubSectionsService = Pick<
  GenericResumeSectionsService,
  'listSectionTypes' | 'listResumeSections' | 'createItem' | 'updateItem' | 'deleteItem'
>;

/**
 * Factory to create controller with typed stub service.
 */
function createTestController(service: StubSectionsService): GenericResumeSectionsController {
  return new GenericResumeSectionsController(service as GenericResumeSectionsService);
}

/**
 * Section item body payload type.
 */
interface SectionItemBody {
  content: Record<string, string | number | boolean | null>;
}

describe('GenericResumeSectionsController - Contract', () => {
  const user: UserPayload = {
    userId: 'user-1',
    email: 'test@example.com',
    hasCompletedOnboarding: true,
  };

  const sectionsService = {
    listSectionTypes: mock(async () => [{ id: 'type-1' }]),
    listResumeSections: mock(async () => [{ id: 'rs-1' }]),
    createItem: mock(async () => ({ id: 'item-1' })),
    updateItem: mock(async () => ({ id: 'item-1' })),
    deleteItem: mock(async () => undefined),
  } as unknown as StubSectionsService;

  const controller = createTestController(sectionsService);

  it('listTypes returns data with sectionTypes', async () => {
    const result = await controller.listTypes('resume-1');

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('sectionTypes');
  });

  it('listResumeSections returns data with sections', async () => {
    const result = await controller.listResumeSections('resume-1', user);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('sections');
    expect(sectionsService.listResumeSections).toHaveBeenCalledWith('resume-1', 'user-1');
  });

  it('createItem returns data with item', async () => {
    const body: SectionItemBody = { content: {} };
    const result = await controller.createItem('resume-1', 'summary_v1', user, body);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('item');
    expect(sectionsService.createItem).toHaveBeenCalledWith('resume-1', 'summary_v1', 'user-1', {});
  });

  it('updateItem returns data with item', async () => {
    const body: SectionItemBody = { content: {} };
    const result = await controller.updateItem('resume-1', 'summary_v1', 'item-1', user, body);

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('item');
    expect(sectionsService.updateItem).toHaveBeenCalledWith(
      'resume-1',
      'summary_v1',
      'item-1',
      'user-1',
      {},
    );
  });

  it('deleteItem returns delete data contract', async () => {
    const result = await controller.deleteItem('resume-1', 'summary_v1', 'item-1', user);

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ deleted: true });
    expect(result.message).toBe('Section item deleted');
  });
});
