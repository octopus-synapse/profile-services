import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { MecSyncUseCases } from '../../application/ports/mec-sync.port';
import { MecMetadataController } from './mec-metadata.controller';

describe('MecMetadataController - Contract', () => {
  let controller: MecMetadataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecMetadataController],
      providers: [
        {
          provide: MecSyncUseCases,
          useValue: {
            listStateCodes: { execute: mock(() => Promise.resolve(['SP', 'RJ'])) },
            listKnowledgeAreas: {
              execute: mock(() => Promise.resolve(['Engenharias', 'Saúde'])),
            },
            getMecStatistics: {
              execute: mock(() =>
                Promise.resolve({
                  totalInstitutions: 10,
                  totalCourses: 20,
                  coursesByGrau: [],
                  institutionsByUf: [],
                }),
              ),
            },
          },
        },
      ],
    }).compile();

    controller = module.get<MecMetadataController>(MecMetadataController);
  });

  it('listAllStateCodes returns data with states', async () => {
    const result = await controller.listAllStateCodes();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('states');
  });

  it('listAllKnowledgeAreas returns data with areas', async () => {
    const result = await controller.listAllKnowledgeAreas();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('areas');
  });

  it('getMecStatistics returns data with stats', async () => {
    const result = await controller.getMecStatistics();

    expect(result.success).toBe(true);
    expect(result.data).toHaveProperty('stats');
  });
});
