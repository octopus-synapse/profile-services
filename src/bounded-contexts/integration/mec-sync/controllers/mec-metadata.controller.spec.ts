import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { Test, TestingModule } from '@nestjs/testing';
import { MecMetadataController } from './mec-metadata.controller';
import { CourseQueryService } from '../services/course-query.service';
import { InstitutionQueryService } from '../services/institution-query.service';
import { MecStatsService } from '../services/mec-stats.service';

const createInstitutionQueryService = () => ({
  findAllStateCodes: mock(() => Promise.resolve(['SP', 'RJ'])),
});

const createCourseQueryService = () => ({
  findAllKnowledgeAreas: mock(() => Promise.resolve(['Engenharias', 'Saúde'])),
});

const createStatsService = () => ({
  getMecStatistics: mock(() =>
    Promise.resolve({
      totalInstitutions: 10,
      totalCourses: 20,
      coursesByGrau: [],
      institutionsByUf: [],
    }),
  ),
});

describe('MecMetadataController - Contract', () => {
  let controller: MecMetadataController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MecMetadataController],
      providers: [
        {
          provide: InstitutionQueryService,
          useValue: createInstitutionQueryService(),
        },
        { provide: CourseQueryService, useValue: createCourseQueryService() },
        { provide: MecStatsService, useValue: createStatsService() },
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
