import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { GetMecStatisticsUseCase } from '../../application/use-cases/get-mec-statistics/get-mec-statistics.use-case';
import { ListKnowledgeAreasUseCase } from '../../application/use-cases/list-knowledge-areas/list-knowledge-areas.use-case';
import { ListStateCodesUseCase } from '../../application/use-cases/list-state-codes/list-state-codes.use-case';
import { MecMetadataController } from './mec-metadata.controller';

describe('MecMetadataController - Contract', () => {
  let controller: MecMetadataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecMetadataController],
      providers: [
        {
          provide: ListStateCodesUseCase,
          useValue: { execute: mock(() => Promise.resolve(['SP', 'RJ'])) },
        },
        {
          provide: ListKnowledgeAreasUseCase,
          useValue: { execute: mock(() => Promise.resolve(['Engenharias', 'Saúde'])) },
        },
        {
          provide: GetMecStatisticsUseCase,
          useValue: {
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
