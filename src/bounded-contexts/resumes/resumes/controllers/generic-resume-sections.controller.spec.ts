import { describe, expect, it, mock } from 'bun:test';
import { GenericResumeSectionsController } from './generic-resume-sections.controller';

describe('GenericResumeSectionsController - Contract', () => {
  const user = { userId: 'user-1' };

  const sectionsService = {
    listSectionTypes: mock(async () => [{ id: 'type-1' }]),
    listResumeSections: mock(async () => [{ id: 'rs-1' }]),
    createItem: mock(async () => ({ id: 'item-1' })),
    updateItem: mock(async () => ({ id: 'item-1' })),
    deleteItem: mock(async () => undefined),
  };

  const controller = new GenericResumeSectionsController(
    sectionsService as never,
  );

  it('listTypes returns data with sectionTypes', async () => {
    const result = await controller.listTypes();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('sectionTypes');
  });

  it('listResumeSections returns data with sections', async () => {
    const result = await controller.listResumeSections(
      'resume-1',
      user as never,
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('sections');
    expect(sectionsService.listResumeSections).toHaveBeenCalledWith(
      'resume-1',
      'user-1',
    );
  });

  it('createItem returns data with item', async () => {
    const result = await controller.createItem(
      'resume-1',
      'summary_v1',
      user as never,
      {} as never,
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('item');
    expect(sectionsService.createItem).toHaveBeenCalledWith(
      'resume-1',
      'summary_v1',
      'user-1',
      {},
    );
  });

  it('updateItem returns data with item', async () => {
    const result = await controller.updateItem(
      'resume-1',
      'summary_v1',
      'item-1',
      user as never,
      {} as never,
    );

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
    const result = await controller.deleteItem(
      'resume-1',
      'summary_v1',
      'item-1',
      user as never,
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ deleted: true });
    expect(result.message).toBe('Section item deleted');
  });
});
