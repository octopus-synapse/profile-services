import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { SectionOrderingService, SectionVisibilityService } from '../services';
import { SectionConfigController } from './section-config.controller';

const createVisibilityService = () => ({
  toggleSection: mock(() => Promise.resolve({ success: true })),
  toggleItem: mock(() => Promise.resolve({ success: true })),
});

const createOrderingService = () => ({
  reorderSection: mock(() => Promise.resolve({ success: true })),
  reorderItem: mock(() => Promise.resolve({ success: true })),
  batchUpdate: mock(() => Promise.resolve({ success: true })),
});

describe('SectionConfigController - Contract', () => {
  let controller: SectionConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectionConfigController],
      providers: [
        { provide: SectionVisibilityService, useValue: createVisibilityService() },
        { provide: SectionOrderingService, useValue: createOrderingService() },
      ],
    }).compile();

    controller = module.get<SectionConfigController>(SectionConfigController);
  });

  it('toggleSection returns data with success', async () => {
    const result = await controller.toggleSection('user-1', 'resume-1', 'section-1', {
      visible: true,
    });
    expect(result.data).toHaveProperty('success');
  });

  it('reorderSection returns data with success', async () => {
    const result = await controller.reorderSection('user-1', 'resume-1', 'section-1', { order: 1 });
    expect(result.data).toHaveProperty('success');
  });

  it('toggleItem returns data with success', async () => {
    const result = await controller.toggleItem('user-1', 'resume-1', 'section-1', {
      itemId: 'item-1',
      visible: true,
    });
    expect(result.data).toHaveProperty('success');
  });

  it('reorderItem returns data with success', async () => {
    const result = await controller.reorderItem('user-1', 'resume-1', 'section-1', {
      itemId: 'item-1',
      order: 1,
    });
    expect(result.data).toHaveProperty('success');
  });

  it('batchUpdate returns data with success', async () => {
    const result = await controller.batchUpdate('user-1', 'resume-1', {
      sections: [{ id: 'section-1', order: 1 }],
    });
    expect(result.data).toHaveProperty('success');
  });
});
